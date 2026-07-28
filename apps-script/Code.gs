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
/**
 * Months entered after the fact land here instead of Collections, so what was
 * recorded live stays visibly separate from what was typed in later. Created
 * on first use — if you never backfill, the tab never appears.
 */
var SHEET_BACKFILL = 'Collections_Backfill';
var TENANT_HEADERS = ['Name', 'Unit', 'Type', 'BaseRent', 'TaxRatePct', 'Active'];
var COLLECTION_HEADERS = ['Timestamp', 'Month', 'Name', 'Unit', 'Type', 'BaseRent', 'TaxRatePct', 'Expected', 'Collected', 'Status', 'DatePaid', 'Method', 'Comment'];
var SEED_UNITS = ['1560 Trepanier', '2489-2499 Jean Talon', "4239-4245 d'Herelle", '6495 Pie-IX', '7420 Iberville', '7727 14e av', '9720-9730 Jeanne-Mance'];

function getSecret_() {
  return PropertiesService.getScriptProperties().getProperty('SHARED_SECRET') || '';
}

/** Cells come back as strings, numbers or booleans depending on what was typed. */
function normalizeText_(v) {
  return String(v === null || v === undefined ? '' : v).trim();
}

/**
 * Anything that isn't recognisably commercial is treated as residential, so a
 * blank or misspelt Type cell can never make a tenant disappear from the app.
 */
function normalizeType_(v) {
  return normalizeText_(v).toLowerCase().indexOf('comm') === 0 ? 'commercial' : 'residential';
}

/** Blank counts as active; only an explicit no/false takes a tenant off the list. */
function isActive_(v) {
  var s = normalizeText_(v).toUpperCase();
  return s !== 'FALSE' && s !== 'NO' && s !== 'N' && s !== '0';
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

/** The backfill tab exists only once something has actually been backfilled. */
function backfillSheet_(createIfMissing) {
  var ss = ss_();
  var sheet = ss.getSheetByName(SHEET_BACKFILL);
  if (!sheet && createIfMissing) {
    sheet = ss.insertSheet(SHEET_BACKFILL);
    sheet.appendRow(COLLECTION_HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
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
  var tax = normalizeType_(type) === 'commercial' ? base * (rate / 100) : 0;
  return base + tax;
}

function doGet(e) {
  try {
    var params = (e && e.parameter) || {};
    if (params.token !== getSecret_()) return jsonOut_({ error: 'unauthorized' });

    var sheets = ensureSheets_();
    // A row counts as filled in once it has a name or a rent — that way a row
    // where the name was forgotten still shows up (as "(unnamed)") instead of
    // silently vanishing, while the blank seeded rows stay out of the way.
    var tenantRows = sheetToObjects_(sheets.tenants)
      .map(function (t) {
        return {
          name: normalizeText_(t.Name), unit: normalizeText_(t.Unit), type: normalizeType_(t.Type),
          baseRent: Number(t.BaseRent) || 0, taxRate: Number(t.TaxRatePct) || 0,
          expected: expectedFor_(t.BaseRent, t.TaxRatePct, t.Type),
          active: isActive_(t.Active)
        };
      })
      .filter(function (t) { return t.name || t.baseRent > 0; });

    var currentMonth = currentMonthKey_();
    var month = normalizeText_(params.month) || currentMonth;

    // Both tabs feed the same view. Source rides along so the page can mark a
    // month as typed in after the fact rather than recorded as it happened.
    var collRows = sheetToObjects_(sheets.collections).map(function (r) { r.Source = 'live'; return r; });
    var backfill = backfillSheet_(false);
    if (backfill) {
      collRows = collRows.concat(sheetToObjects_(backfill).map(function (r) { r.Source = 'backfill'; return r; }));
    }

    var latest = {};
    collRows.forEach(function (r) {
      var key = collectionKey_(r.Month, r.Name, r.Unit);
      if (!latest[key] || new Date(r.Timestamp) >= new Date(latest[key].Timestamp)) latest[key] = r;
    });

    var byMonth = {};
    Object.keys(latest).forEach(function (key) {
      var r = latest[key];
      var m = toMonthKeyText_(r.Month);
      if (!byMonth[m]) byMonth[m] = [];
      byMonth[m].push(r);
    });

    var history = Object.keys(byMonth)
      .filter(function (m) { return m !== month; })
      .sort().reverse()
      .map(function (m) {
        var rows = byMonth[m];
        return {
          month: m,
          rows: rows,
          backfilled: rows.every(function (r) { return r.Source === 'backfill'; })
        };
      });

    return jsonOut_({
      month: month,
      currentMonth: currentMonth,
      backfillMonth: month !== currentMonth,
      tenants: tenantRows.filter(function (t) { return t.active; }),
      current: byMonth[month] || [],
      history: history
    });
  } catch (err) {
    return jsonOut_({ error: String(err) });
  }
}

/** Edits landing within this window of the last write update that row instead of adding one. */
var COALESCE_WINDOW_MS = 30 * 60 * 1000;

/** Compare sheet values to freshly-built ones without tripping over types. */
function cellKey_(v) {
  if (Object.prototype.toString.call(v) === '[object Date]') {
    return Utilities.formatDate(v, ss_().getSpreadsheetTimeZone(), 'yyyy-MM-dd');
  }
  if (typeof v === 'number') return String(v);
  return normalizeText_(v);
}

/**
 * Looks at the newest existing row for this tenant-month and decides what the
 * incoming save should do:
 *   identical -> nothing changed, don't write at all
 *   rowIndex  -> still the same editing session, overwrite that row
 *   neither   -> a genuinely new entry, append
 */
function findPriorRow_(sheet, row) {
  var last = sheet.getLastRow();
  if (last < 2) return { rowIndex: 0, identical: false };

  var width = COLLECTION_HEADERS.length;
  var values = sheet.getRange(2, 1, last - 1, width).getValues();
  for (var i = values.length - 1; i >= 0; i--) {
    var v = values[i];
    if (collectionKey_(v[1], v[2], v[3]) !== collectionKey_(row[1], row[2], row[3])) continue;

    var identical = true;
    for (var c = 1; c < width; c++) {
      if (cellKey_(v[c]) !== cellKey_(row[c])) { identical = false; break; }
    }
    if (identical) return { rowIndex: i + 2, identical: true };

    var age = new Date().getTime() - new Date(v[0]).getTime();
    return { rowIndex: age <= COALESCE_WINDOW_MS ? i + 2 : 0, identical: false };
  }
  return { rowIndex: 0, identical: false };
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    if (body.token !== getSecret_()) return jsonOut_({ error: 'unauthorized' });

    var sheets = ensureSheets_();
    var wantName = normalizeText_(body.name);
    var wantUnit = normalizeText_(body.unit);
    var tenantRows = sheetToObjects_(sheets.tenants);
    var tenant = tenantRows.find(function (t) {
      return normalizeText_(t.Name) === wantName && normalizeText_(t.Unit) === wantUnit;
    });
    if (!tenant) return jsonOut_({ error: 'unknown tenant' });

    var currentMonth = currentMonthKey_();
    var month = normalizeText_(body.month) || currentMonth;
    var isBackfill = month !== currentMonth;

    var expected = expectedFor_(tenant.BaseRent, tenant.TaxRatePct, tenant.Type);
    var row = [
      new Date(), month, normalizeText_(tenant.Name), normalizeText_(tenant.Unit), normalizeType_(tenant.Type),
      Number(tenant.BaseRent) || 0, Number(tenant.TaxRatePct) || 0, expected,
      Number(body.collected) || 0, normalizeText_(body.status) || 'unpaid',
      normalizeText_(body.datePaid), normalizeText_(body.method), normalizeText_(body.comment)
    ];

    // Anything but the current month is being entered after the fact, so it
    // goes to its own tab and never mixes with what was recorded live.
    var target = isBackfill ? backfillSheet_(true) : sheets.collections;

    // The client coalesces edits, but an old cached tab on another device
    // doesn't know that. Enforce one row per tenant-month editing session here
    // too, so duplicates can't come back from a stale front end.
    var prior = findPriorRow_(target, row);
    var result = { ok: true, expected: expected, sheet: isBackfill ? SHEET_BACKFILL : SHEET_COLLECTIONS };
    if (prior.identical) { result.wrote = 'unchanged'; return jsonOut_(result); }
    if (prior.rowIndex) {
      target.getRange(prior.rowIndex, 1, 1, row.length).setValues([row]);
      result.wrote = 'updated';
      return jsonOut_(result);
    }
    target.appendRow(row);
    result.wrote = 'appended';
    return jsonOut_(result);
  } catch (err) {
    return jsonOut_({ error: String(err) });
  }
}

/**
 * Deletes duplicate Collections rows, run by hand from the editor. For each
 * Month+Name+Unit it keeps the newest row — the one the app already treats as
 * current, holding your final corrections — and deletes the rest.
 *
 * This is destructive and cannot be undone from the app. Take File > Make a
 * copy first. Safe to run more than once; a second run finds nothing to do.
 */
function dedupeCollections() {
  [ss_().getSheetByName(SHEET_COLLECTIONS), backfillSheet_(false)].forEach(function (sheet) {
    if (sheet) dedupeSheet_(sheet);
  });
}

function dedupeSheet_(sheet) {
  if (sheet.getLastRow() < 2) {
    Logger.log(sheet.getName() + ': empty, nothing to do.');
    return;
  }

  var values = sheet.getDataRange().getValues();
  var headers = values[0];
  var body = values.slice(1).filter(function (row) {
    return row.some(function (c) { return c !== '' && c !== null; });
  });
  var col = {};
  headers.forEach(function (h, i) { col[h] = i; });

  var newestAt = {};
  body.forEach(function (row, i) {
    var key = collectionKey_(row[col.Month], row[col.Name], row[col.Unit]);
    var prev = newestAt[key];
    if (prev === undefined || new Date(row[col.Timestamp]) >= new Date(body[prev][col.Timestamp])) newestAt[key] = i;
  });

  var keepIdx = {};
  Object.keys(newestAt).forEach(function (k) { keepIdx[newestAt[k]] = true; });
  var keep = body.filter(function (row, i) { return keepIdx[i]; });
  var removed = body.length - keep.length;
  if (!removed) {
    Logger.log(sheet.getName() + ': no duplicates — all ' + keep.length + ' rows already unique per tenant-month.');
    return;
  }

  sheet.getRange(2, 1, sheet.getMaxRows() - 1, headers.length).clearContent();
  sheet.getRange(2, 1, keep.length, headers.length).setValues(keep);
  Logger.log(sheet.getName() + ': deleted ' + removed + ' duplicate rows; kept ' + keep.length + ' (one per tenant per month).');
}

function collectionKey_(month, name, unit) {
  return toMonthKeyText_(month) + '::' + normalizeText_(name) + '::' + normalizeText_(unit);
}

/** Month is written as text, but tolerate a cell Sheets has turned into a date. */
function toMonthKeyText_(v) {
  if (Object.prototype.toString.call(v) === '[object Date]') {
    return Utilities.formatDate(v, ss_().getSpreadsheetTimeZone(), 'yyyy-MM');
  }
  return normalizeText_(v);
}

function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }

/** Run once from the editor after pasting this file. */
function setup() {
  ensureSheets_();
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('SHARED_SECRET')) {
    props.setProperty('SHARED_SECRET', Utilities.getUuid());
  }
  Logger.log('Shared secret (copy this into the app once): ' + props.getProperty('SHARED_SECRET'));
}
