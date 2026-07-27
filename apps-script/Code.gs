/**
 * Rent Ledger backend — bound to a Google Sheet. Deploy as a Web App
 * (Deploy > New deployment > Web app, execute as Me, access Anyone with the link).
 *
 * Run setup() once from this editor (Run menu) after pasting this file:
 * it creates the Tenants / Collections tabs and a shared secret. Copy the
 * secret from the execution log and paste it into the app's Connect screen
 * along with the Web App URL you get after deploying.
 */

var SHEET_TENANTS = 'Tenants';
var SHEET_COLLECTIONS = 'Collections';
var TENANT_HEADERS = ['Name', 'Unit', 'Type', 'BaseRent', 'TaxRatePct', 'Active'];
var COLLECTION_HEADERS = ['Timestamp', 'Month', 'Name', 'Unit', 'Type', 'BaseRent', 'TaxRatePct', 'Expected', 'Collected', 'Status', 'DatePaid', 'Method', 'Comment'];
var SEED_UNITS = ['1560 Trepanier', '2489-2499 Jean Talon', "4239-4245 d'Herelle", '6495 Pie-IX', '7420 Iberville', '7727 14e av', '9720-9730 Jeanne-Mance'];

function getSecret_() {
  return PropertiesService.getScriptProperties().getProperty('SHARED_SECRET') || '';
}

function ensureSheets_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tenants = ss.getSheetByName(SHEET_TENANTS);
  if (!tenants) {
    tenants = ss.insertSheet(SHEET_TENANTS);
    tenants.appendRow(TENANT_HEADERS);
    SEED_UNITS.forEach(function (u) { tenants.appendRow(['', u, 'residential', '', '', 'TRUE']); });
    tenants.setFrozenRows(1);
    tenants.autoResizeColumns(1, TENANT_HEADERS.length);
  }
  var collections = ss.getSheetByName(SHEET_COLLECTIONS);
  if (!collections) {
    collections = ss.insertSheet(SHEET_COLLECTIONS);
    collections.appendRow(COLLECTION_HEADERS);
    collections.setFrozenRows(1);
  }
  return { tenants: tenants, collections: collections };
}

function sheetToObjects_(sheet) {
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0];
  return values.slice(1)
    .filter(function (row) { return row.some(function (c) { return c !== '' && c !== null; }); })
    .map(function (row) {
      var obj = {};
      headers.forEach(function (h, i) { obj[h] = row[i]; });
      return obj;
    });
}

function currentMonthKey_() {
  var d = new Date();
  return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2);
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function expectedFor_(baseRent, taxRatePct, type) {
  var base = Number(baseRent) || 0;
  var rate = Number(taxRatePct) || 0;
  var tax = String(type).toLowerCase() === 'commercial' ? base * (rate / 100) : 0;
  return base + tax;
}

function doGet(e) {
  try {
    var params = (e && e.parameter) || {};
    if (params.token !== getSecret_()) return jsonOut_({ error: 'unauthorized' });

    var sheets = ensureSheets_();
    var tenantRows = sheetToObjects_(sheets.tenants)
      .filter(function (t) { return t.Name; })
      .map(function (t) {
        return {
          name: t.Name, unit: t.Unit, type: String(t.Type).toLowerCase(),
          baseRent: Number(t.BaseRent) || 0, taxRate: Number(t.TaxRatePct) || 0,
          expected: expectedFor_(t.BaseRent, t.TaxRatePct, t.Type),
          active: String(t.Active).toUpperCase() !== 'FALSE'
        };
      });

    var month = params.month || currentMonthKey_();
    var collRows = sheetToObjects_(sheets.collections);
    var latest = {};
    collRows.forEach(function (r) {
      var key = r.Month + '::' + r.Name + '::' + r.Unit;
      if (!latest[key] || new Date(r.Timestamp) >= new Date(latest[key].Timestamp)) latest[key] = r;
    });

    var byMonth = {};
    Object.keys(latest).forEach(function (key) {
      var r = latest[key];
      if (!byMonth[r.Month]) byMonth[r.Month] = [];
      byMonth[r.Month].push(r);
    });

    var history = Object.keys(byMonth)
      .filter(function (m) { return m !== month; })
      .sort().reverse()
      .map(function (m) { return { month: m, rows: byMonth[m] }; });

    return jsonOut_({
      month: month,
      tenants: tenantRows.filter(function (t) { return t.active; }),
      current: byMonth[month] || [],
      history: history
    });
  } catch (err) {
    return jsonOut_({ error: String(err) });
  }
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    if (body.token !== getSecret_()) return jsonOut_({ error: 'unauthorized' });

    var sheets = ensureSheets_();
    var tenantRows = sheetToObjects_(sheets.tenants);
    var tenant = tenantRows.find(function (t) { return t.Name === body.name && t.Unit === body.unit; });
    if (!tenant) return jsonOut_({ error: 'unknown tenant' });

    var expected = expectedFor_(tenant.BaseRent, tenant.TaxRatePct, tenant.Type);

    sheets.collections.appendRow([
      new Date(), body.month, tenant.Name, tenant.Unit, tenant.Type,
      Number(tenant.BaseRent) || 0, Number(tenant.TaxRatePct) || 0, expected,
      Number(body.collected) || 0, body.status || 'unpaid',
      body.datePaid || '', body.method || '', body.comment || ''
    ]);

    return jsonOut_({ ok: true, expected: expected });
  } catch (err) {
    return jsonOut_({ error: String(err) });
  }
}

/** Run once from the editor after pasting this file. */
function setup() {
  ensureSheets_();
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('SHARED_SECRET')) {
    props.setProperty('SHARED_SECRET', Utilities.getUuid());
  }
  Logger.log('Shared secret (copy this into the app once): ' + props.getProperty('SHARED_SECRET'));
}
