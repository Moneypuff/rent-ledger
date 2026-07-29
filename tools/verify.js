/**
 * Verifies the payroll engine inside payroll.html by extracting its <script>
 * block and running it under a minimal DOM shim — the real code, not a copy,
 * so the checks cannot drift from what the page actually computes.
 *
 *   node tools/verify.js
 *
 * Exits non-zero on any failure.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const PAGE = path.join(__dirname, '..', 'payroll.html');

function loadEngine() {
  const src = fs.readFileSync(PAGE, 'utf8').match(/<script>([\s\S]*)<\/script>/)[1];
  const el = () => ({
    innerHTML: '', textContent: '', value: '', checked: false, dataset: {},
    classList: { toggle() {}, add() {}, remove() {}, contains: () => false },
    elements: new Proxy({}, { get: () => ({ value: '' }) }),
    addEventListener() {}, querySelectorAll: () => []
  });
  const sb = {
    console,
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    document: {
      getElementById: el, querySelector: el, querySelectorAll: () => [],
      addEventListener() {}, createElement: el,
      body: { appendChild() {}, removeChild() {}, classList: { add() {}, remove() {} } }
    },
    window: { scrollTo() {}, print() {} },
    Blob: function () {}, URL: { createObjectURL: () => '', revokeObjectURL() {} },
    setTimeout
  };
  sb.globalThis = sb;
  vm.createContext(sb);
  vm.runInContext(src, sb);
  return sb;
}

const E = loadEngine();
const { DEFAULTS, PUBLISHED_2026, buildPeriods, buildRemittances, gaps, round2, toISO } = E;
const base = () => JSON.parse(JSON.stringify(DEFAULTS));
const cfg = base();
const rows = buildPeriods(cfg);
const sum = (rs, f) => round2(rs.reduce((a, r) => a + r[f], 0));
const S = f => sum(rows, f);

/* Re-entry point for the timezone check: this file re-runs itself under other
   TZ values and compares the fingerprint, which needs the engine loaded fresh
   in that timezone rather than reinterpreted after the fact. */
const fingerprint = () => rows.map(r => toISO(r.payDate) + '|' + toISO(r.periodStart)).join(',');
if (process.argv.includes('--schedule')) {
  process.stdout.write(fingerprint());
  process.exit(0);
}

let failed = 0, ran = 0;
function ck(name, actual, expected) {
  ran++;
  const ok = typeof expected === 'number'
    ? Math.abs(actual - expected) < 0.005
    : actual === expected;
  if (!ok) { failed++; console.log(`  FAIL  ${name}: got ${actual}, expected ${expected}`); }
}
const head = s => console.log('\n' + s);

/* The accountant's per-pay statement, transcribed. Employer EI is deliberately
   absent — it was not on their list, and check 2 asserts we still charge it. */
const ACC = {
  fed: 170.66, ei: 30.03, qc: 217.62, qpp: 137.05, qpip: 9.93, net: 1744.71,
  erQpp: 137.05, erQpip: 13.90, qhsf: 38.12, cnesst: 97.02
};

head('1. Reconciles to the accountant, per pay');
const p1 = rows[0];
ck('federal income tax', p1.fed, ACC.fed);
ck('EI', p1.ei, ACC.ei);
ck('Québec income tax', p1.qc, ACC.qc);
ck('QPP', p1.qpp, ACC.qpp);
ck('QPIP', p1.qpip, ACC.qpip);
ck('total deductions', p1.deductions, round2(ACC.fed + ACC.ei + ACC.qc + ACC.qpp + ACC.qpip));
ck('correct net pay', p1.net, ACC.net);
ck('QPP employer', p1.qppEr, ACC.erQpp);
ck('QHSF at 1.65%', p1.hsf, ACC.qhsf);
ck('CNESST at 4.20%', p1.cnesst, ACC.cnesst);

head('2. The two lines that differ from their statement');
ck('QPIP employer uses the published 0.602%', p1.qpipEr, 13.91);
ck('employer EI is charged though absent from their list', p1.eiEr, 42.04);
ck('employer EI is 1.4x the employee premium', p1.eiEr, round2(ACC.ei * 1.4));

head('3. Statutory rates agree with the published 2026 maximums');
ck('QPP max', round2((cfg.ympe - cfg.qppExemptionAnnual) * cfg.qppRatePct / 100), PUBLISHED_2026.qppMaxEmployee);
ck('QPP2 max', round2((cfg.yampe - cfg.ympe) * cfg.qpp2RatePct / 100), PUBLISHED_2026.qpp2MaxEmployee);
ck('EI max', round2(cfg.eiMie * cfg.eiRatePct / 100), PUBLISHED_2026.eiMaxEmployee);
ck('QPIP max', round2(cfg.qpipMax * cfg.qpipEmployeeRatePct / 100), PUBLISHED_2026.qpipMaxEmployee);
ck('YMPE', cfg.ympe, 74600);
ck('EI MIE', cfg.eiMie, 68900);
ck('QPIP max insurable', cfg.qpipMax, 103000);

head('4. Schedule');
ck('26 pay periods', rows.length, 26);
ck('first pay date', toISO(rows[0].payDate), '2026-01-09');
ck('last pay date', toISO(rows[25].payDate), '2026-12-25');
ck('period 1 starts at the employment start', toISO(rows[0].periodStart), '2026-01-01');
ck('every pay date is a Friday', rows.every(r => r.payDate.getUTCDay() === 5), true);
ck('periods are contiguous',
  rows.every((r, i) => i === 0 || (r.periodStart - rows[i - 1].periodEnd) / 86400000 === 1), true);
ck('no pay date escapes the tax year', rows.every(r => r.payDate.getUTCFullYear() === 2026), true);

head('5. Pays #1-15 stand as actually paid');
const restated = rows.filter(r => r.onErrorBasis);
ck('15 restated periods', restated.length, 15);
ck('net as paid', restated.every(r => r.paid.net === 1972.26), true);
ck('deductions as paid', p1.paid.ded, 337.74);
ck('no Québec tax was withheld', p1.paid.qc, 0);
ck('no QPIP was withheld', p1.paid.qpip, 0);
ck('federal tax was withheld correctly', p1.paid.fed, 170.66);
ck('shortfall per restated pay', p1.shortfall, 227.55);
ck('shortfall = QC tax + QPIP', p1.shortfall, round2(ACC.qc + ACC.qpip));
ck('last restated pay date', toISO(restated[14].payDate), '2026-07-24');

head('6. Arrears recovery from August');
const rec = rows.filter(r => r.recovery > 0);
const Y = rows[25].ytd;
ck('11 pays carry an instalment', rec.length, 11);
ck('recovery starts at pay #16', rec[0].n, 16);
ck('first recovery pay date', toISO(rec[0].payDate), '2026-08-07');
ck('all instalments fall in August or later', rec.every(r => toISO(r.payDate) >= '2026-08-01'), true);
ck('instalment on pays 16-25', rec.slice(0, 10).every(r => r.recovery === 310.30), true);
ck('final instalment carries the residue', rec[10].recovery, 310.25);
ck('instalments sum to the arrears exactly', round2(rec.reduce((a, r) => a + r.recovery, 0)), 3413.25);
ck('net on pays 16-25', rec[0].paid.net, 1434.41);
ck('net on pay 26', rec[10].paid.net, 1434.46);
ck('total under-withheld', Y.shortfall, 3413.25);
ck('Québec tax not withheld', Y.shortQc, round2(ACC.qc * 15));
ck('QPIP not withheld', Y.shortQpip, round2(ACC.qpip * 15));
ck('arrears fully recovered', Y.recovered, 3413.25);
ck('nothing outstanding at year end', Y.arrearsOutstanding, 0);
ck('outstanding after the first instalment', rec[0].ytd.arrearsOutstanding, round2(3413.25 - 310.30));

head('7. The year ties out');
ck('gross', S('gross'), 60060);
ck('total actually paid out', Y.paidNet, 45362.46);
ck('equals the correct annual net', Y.paidNet, Y.net);
ck('gross - deductions = net', round2(Y.gross - Y.paidDed), Y.paidNet);
ck('employee deductions', S('deductions'), round2(565.29 * 26));
const er = round2(S('qppEr') + S('qpp2Er') + S('eiEr') + S('qpipEr') + S('hsf') + S('cnesst'));
ck('employer contributions', er, round2(328.14 * 26));
ck('employee + employer = CRA + RQ', round2(S('deductions') + er), round2(S('cra') + S('rq')));

head('8. Remittances — unmoved by the error or the recovery');
ck('CRA per pay', p1.cra, 242.73);
ck('RQ per pay', p1.rq, 650.70);
ck('CRA year', S('cra'), 6310.98);
ck('RQ year', S('rq'), 16918.20);
ck('QPP is not in the CRA remittance', p1.cra, round2(p1.fed + p1.ei + p1.eiEr));
ck('CNESST and QHSF route to RQ', p1.rq,
  round2(p1.qc + p1.qpp * 2 + p1.qpip + p1.qpipEr + p1.hsf + p1.cnesst));
const craM = buildRemittances(rows, 'regular');
const rqQ = buildRemittances(rows, 'quarterly');
ck('12 monthly CRA buckets', craM.length, 12);
ck('4 quarterly buckets', rqQ.length, 4);
ck('CRA and RQ frequencies are independent', craM.length !== rqQ.length, true);
ck('every pay date bucketed once', craM.reduce((a, m) => a + m.rows.length, 0), 26);
ck('buckets tie to the CRA year', round2(craM.reduce((a, m) => a + m.cra, 0)), S('cra'));
ck('buckets tie to the RQ year', round2(rqQ.reduce((a, m) => a + m.rq, 0)), S('rq'));
const due = Object.fromEntries(craM.map(m => [m.key, toISO(m.due)]));
ck('Jan due rolls Sunday to Monday', due['2026-01'], '2026-02-16');
ck('Jul due rolls Saturday to Monday', due['2026-07'], '2026-08-17');
ck('Dec due lands in the next year', due['2026-12'], '2027-01-15');
ck('May has three pay dates', craM.find(m => m.key === '2026-05').rows.length, 3);
ck('Oct has three pay dates', craM.find(m => m.key === '2026-10').rows.length, 3);

head('9. Ceilings bind correctly if the salary is raised');
const rich = buildPeriods(Object.assign(base(), { grossPerPeriod: 4000, asPaidThroughPeriod: 0 }));
ck('QPP stops at the published max', sum(rich, 'qpp'), PUBLISHED_2026.qppMaxEmployee);
ck('EI stops at the published max', sum(rich, 'ei'), PUBLISHED_2026.eiMaxEmployee);
ck('QPP2 engages above the YMPE', sum(rich, 'qpp2') > 0, true);
const richer = buildPeriods(Object.assign(base(), { grossPerPeriod: 9000, asPaidThroughPeriod: 0 }));
ck('QPP2 stops at its own max', sum(richer, 'qpp2'), PUBLISHED_2026.qpp2MaxEmployee);
ck('QPIP stops at its max', sum(richer, 'qpip'), PUBLISHED_2026.qpipMaxEmployee);
ck('no QPP2 below the YMPE', S('qpp2'), 0);

head('10. YTD integrity');
for (const f of ['gross', 'qpp', 'qpp2', 'ei', 'eiEr', 'qpip', 'qpipEr', 'hsf', 'cnesst', 'fed', 'qc', 'deductions', 'net']) {
  ck(`YTD ${f} equals the sum of periods`, Y[f], S(f));
}
ck('YTD is not shared between rows', rows[0].ytd.gross !== rows[1].ytd.gross, true);
ck('employer amounts never reduce net',
  rows.every(r => Math.abs(r.net - (r.gross - r.fed - r.qc - r.qpp - r.qpp2 - r.ei - r.qpip)) < 0.005), true);

head('11. Switches behave');
ck('no gaps once every input is supplied', gaps(cfg).length, 0);
ck('changing the salary flags the tax as stale',
  gaps(Object.assign(base(), { grossPerPeriod: 2500 })).some(g => /stale/.test(g.text)), true);
const noRec = buildPeriods(Object.assign(base(), { recoverArrearsFromPeriod: 0 }));
ck('recovery can be switched off', noRec.every(r => r.recovery === 0), true);
ck('August net without recovery', noRec[15].paid.net, 1744.71);
ck('arrears left outstanding', noRec[25].ytd.arrearsOutstanding, 3413.25);
const clean = buildPeriods(Object.assign(base(), { asPaidThroughPeriod: 0, recoverArrearsFromPeriod: 0 }));
ck('a clean year has no restatement', clean.filter(r => r.shortfall > 0).length, 0);
ck('a clean year pays the correct net throughout', clean.every(r => r.paid.net === 1744.71), true);

head('12. Dates are immune to the host timezone');
const ref = fingerprint();
for (const tz of ['UTC', 'Pacific/Kiritimati', 'Pacific/Midway', 'America/Montreal', 'Asia/Kolkata']) {
  const out = execFileSync(process.execPath, [__filename, '--schedule'],
    { encoding: 'utf8', env: Object.assign({}, process.env, { TZ: tz }) });
  ck(`schedule identical under ${tz}`, out, ref);
}

console.log(failed === 0
  ? `\nAll ${ran} checks passed.`
  : `\n${failed} of ${ran} checks FAILED.`);
process.exit(failed === 0 ? 0 : 1);
