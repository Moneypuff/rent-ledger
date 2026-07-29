// Generates the full 26-stub paystub set from data.json. Each stub shows what
// was ACTUALLY withheld — restated periods are flagged, never silently corrected.
const fs = require('fs');
const path = require('path');
const d = require('./data.json');
const f = n => Number(n).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const m = n => '$' + f(n);
const r2 = n => Math.round((n + Number.EPSILON) * 100) / 100;
const t = d.totals, P = d.periods;

const EMPLOYER = { name: '9134-5777 Québec Inc.', addr: '10624 boul. Lévesque E, Laval, Québec H7A 4C6' };
const EMPLOYEE = 'Dieu-Quan Ly';

const restated = P.filter(p => p.restated);
const clean = P.filter(p => !p.restated);
const recov = P.filter(p => p.recovery > 0);
const perPay = recov.length ? recov[0].recovery : 0;
const finalPay = recov.length ? recov[recov.length - 1].recovery : 0;

/* IBM Plex, subset to the glyphs this document uses and inlined so the page and
   the PDF render with the same faces — a CDN link would be blocked by the CSP
   and would fall back silently. */
const face = (file, family, weight) => {
  const b64 = fs.readFileSync(path.join(__dirname, 'fonts', file)).toString('base64');
  return `@font-face{font-family:"${family}";font-style:normal;font-weight:${weight};font-display:swap;`
       + `src:url(data:font/woff2;base64,${b64}) format("woff2");}`;
};
const FONTS = [
  face('IBMPlexSerif-Regular.woff2', 'Plex Serif', 400),
  face('IBMPlexSerif-Bold.woff2', 'Plex Serif', 700),
  face('IBMPlexMono-Regular.woff2', 'Plex Mono', 400),
  face('IBMPlexMono-Bold.woff2', 'Plex Mono', 700)
].join('\n');

const row = (label, cur, ytd, flag) => `
        <tr${flag ? ' class="flag"' : ''}><td>${label}${flag ? ' <span class="ast">*</span>' : ''}</td>
          <td class="fig">${f(cur)}</td><td class="fig">${f(ytd)}</td></tr>`;

const stub = p => {
  const pd = p.paid, y = p.ytd;
  const short = p.shortfall > 0;
  const ytdQc = r2(y.qc - y.shortQc), ytdQpip = r2(y.qpip - y.shortQpip);
  const kind = short ? 'restated' : (p.recovery > 0 ? 'adjusted' : '');
  const stamp = short ? 'Restated' : (p.recovery > 0 ? 'Adjusted' : 'Statement of earnings');
  return `
  <article class="stub${kind ? ' ' + kind : ''}">
    <div class="shead">
      <div class="who">
        <div class="issuer">${EMPLOYER.name} &middot; ${EMPLOYER.addr}</div>
        <div class="emplabel">Employee</div>
        <h2>${EMPLOYEE}</h2>
        <div class="doctype">Statement of earnings and deductions</div>
      </div>
      <div class="meta">
        <div class="stamp${short ? ' bad' : (p.recovery > 0 ? ' adj' : '')}">${stamp}</div>
        <table class="mt">
          <tr><td>Pay period</td><th>#${p.n} of ${P.length}</th></tr>
          <tr><td>Period</td><th>${p.start} &rarr; ${p.end}</th></tr>
          <tr><td>Pay date</td><th>${p.pay}</th></tr>
          <tr><td>Basis</td><th>Biweekly &middot; Qu&eacute;bec</th></tr>
        </table>
      </div>
    </div>

    <div class="cols">
      <div>
        <h3>Earnings</h3>
        <table class="lines">
          <thead><tr><th>Description</th><th class="fig">Current</th><th class="fig">Year to date</th></tr></thead>
          <tbody>
            ${row('Salary', p.gross, y.gross, false)}
            <tr class="tot"><td>Gross pay</td><td class="fig">${f(p.gross)}</td><td class="fig">${f(y.gross)}</td></tr>
          </tbody>
        </table>

        <h3>Employer contributions <span class="sub">not deducted from pay</span></h3>
        <table class="lines">
          <thead><tr><th>Description</th><th class="fig">Current</th><th class="fig">Year to date</th></tr></thead>
          <tbody>
            ${row('QPP — employer', p.qppEr, y.qppEr, false)}
            ${row('EI — employer', p.eiEr, y.eiEr, false)}
            ${row('QPIP — employer', p.qpipEr, y.qpipEr, false)}
            ${row('Health Services Fund', p.hsf, y.hsf, false)}
            ${row('CNESST premium', p.cnesst, y.cnesst, false)}
          </tbody>
        </table>
      </div>

      <div>
        <h3>Deductions <span class="sub">as withheld</span></h3>
        <table class="lines">
          <thead><tr><th>Description</th><th class="fig">Current</th><th class="fig">Year to date</th></tr></thead>
          <tbody>
            ${row('Federal income tax', pd.fed, y.fed, false)}
            ${row('Québec income tax', pd.qc, ytdQc, short)}
            ${row('QPP', pd.qpp, y.qpp, false)}
            ${row('EI', pd.ei, y.ei, false)}
            ${row('QPIP (RQAP)', pd.qpip, ytdQpip, short)}
            ${p.recovery > 0 ? `<tr class="adj"><td>Prior-period adjustment <span class="ast2">&dagger;</span></td>
              <td class="fig">${f(p.recovery)}</td><td class="fig">${f(y.recovered)}</td></tr>` : ''}
            <tr class="tot"><td>Total deductions</td><td class="fig">${f(pd.ded)}</td><td class="fig">${f(y.paidDed)}</td></tr>
          </tbody>
        </table>

        <h3>Insurable / pensionable</h3>
        <table class="lines">
          <tbody>
            <tr><td>QPP pensionable — YTD</td><td class="fig" colspan="2">${f(y.pensionable)}</td></tr>
            <tr><td>EI insurable — YTD</td><td class="fig" colspan="2">${f(y.insurable)}</td></tr>
            <tr><td>QPIP insurable — YTD</td><td class="fig" colspan="2">${f(y.qpipInsurable)}</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="net">
      <span class="lbl">Net pay${short ? ' <span class="paidas">as paid</span>' : ''}</span>
      <span class="val">${m(pd.net)}</span>
    </div>

    ${p.recovery > 0 ? `<div class="adjnote">
      <b>&dagger; Includes a prior-period adjustment of ${m(p.recovery)}.</b> Recovers Qu&eacute;bec income
      tax and QPIP not withheld on pays #1&ndash;#${restated.length}. Regular net pay for this period
      is ${m(p.net)}; ${m(y.arrearsOutstanding)} of the ${m(t.shortfall)} arrears remains outstanding
      after this pay.
    </div>` : ''}

    ${short ? `<div class="warn">
      <b>* Under-withheld by ${m(p.shortfall)}.</b> This pay was run through the CRA payroll
      calculator, which computes neither Qu&eacute;bec income tax nor QPIP, so neither was deducted.
      ${m(pd.net)} was paid where ${m(p.net)} was correct — Qu&eacute;bec income tax
      ${m(r2(p.qc - pd.qc))} and QPIP ${m(r2(p.qpip - pd.qpip))} remain owed by the employee.
      The employer must remit both to Revenu Qu&eacute;bec whether or not they were withheld.
    </div>` : ''}

    <div class="foot">Salary is a fixed amount per pay period regardless of hours worked.
      ${short ? 'Figures above are as actually paid, not as they should have been.' : ''}</div>
  </article>`;
};

const html = `<title>2026 Paystubs — Dieu-Quan Ly</title>
<style>
${FONTS}

  :root{
    --stock:#EEEAE1; --sheet:#FCFAF6; --sunk:#E6E1D6;
    --ink:#1C1A16; --ink-mid:#403C34; --ink-mute:#655F53; --ink-faint:#938C7D;
    --rule:#D8D2C5; --rule-firm:#B9B2A2;
    --bad:#9A2C1E; --bad-wash:#F7E5E0; --bad-edge:#CB8B7E;
    --adj:#6E5410; --adj-wash:#F6EDD6; --adj-edge:#BE9C43;
    --ok:#2C6440;
    --shadow:0 1px 0 rgba(28,26,22,.04), 0 6px 18px -12px rgba(28,26,22,.30);
    --serif:"Plex Serif", Charter, "Bitstream Charter", Cambria, "Palatino Linotype", Georgia, serif;
    --mono:"Plex Mono", "SF Mono", Consolas, "DejaVu Sans Mono", "Liberation Mono", monospace;
  }
  @media (prefers-color-scheme:dark){
    :root{ --stock:#14130F; --sheet:#1D1B16; --sunk:#181611;
      --ink:#EDE8DC; --ink-mid:#C3BCAC; --ink-mute:#A09884; --ink-faint:#75705F;
      --rule:#302C23; --rule-firm:#443F32;
      --bad:#E0857A; --bad-wash:#301A16; --bad-edge:#7A3B31;
      --adj:#DDBB63; --adj-wash:#2B2410; --adj-edge:#82691F; --ok:#6BB985;
      --shadow:0 1px 0 rgba(0,0,0,.4), 0 8px 22px -14px rgba(0,0,0,.8); }
  }
  :root[data-theme="dark"]{ --stock:#14130F; --sheet:#1D1B16; --sunk:#181611;
    --ink:#EDE8DC; --ink-mid:#C3BCAC; --ink-mute:#A09884; --ink-faint:#75705F;
    --rule:#302C23; --rule-firm:#443F32;
    --bad:#E0857A; --bad-wash:#301A16; --bad-edge:#7A3B31;
    --adj:#DDBB63; --adj-wash:#2B2410; --adj-edge:#82691F; --ok:#6BB985;
    --shadow:0 1px 0 rgba(0,0,0,.4), 0 8px 22px -14px rgba(0,0,0,.8); }
  :root[data-theme="light"]{ --stock:#EEEAE1; --sheet:#FCFAF6; --sunk:#E6E1D6;
    --ink:#1C1A16; --ink-mid:#403C34; --ink-mute:#655F53; --ink-faint:#938C7D;
    --rule:#D8D2C5; --rule-firm:#B9B2A2;
    --bad:#9A2C1E; --bad-wash:#F7E5E0; --bad-edge:#CB8B7E;
    --adj:#6E5410; --adj-wash:#F6EDD6; --adj-edge:#BE9C43; --ok:#2C6440;
    --shadow:0 1px 0 rgba(28,26,22,.04), 0 6px 18px -12px rgba(28,26,22,.30); }

  *{box-sizing:border-box;}
  body{ margin:0; background:var(--stock); color:var(--ink); font-family:var(--serif);
        font-size:15px; line-height:1.6; }
  .wrap{ max-width:960px; margin:0 auto; padding:0 22px 64px; }
  h1,h2,h3{ margin:0; font-family:var(--serif); font-weight:700; letter-spacing:0; }
  p{ margin:0; }
  .fig{ font-family:var(--mono); font-variant-numeric:tabular-nums; text-align:right; }

  /* Uppercase micro-labels are set in the mono face — it reads as a form field,
     which is what they are, and keeps the document to two families. */
  .lbl-s{ font-family:var(--mono); font-size:9.5px; font-weight:700; letter-spacing:.13em;
          text-transform:uppercase; color:var(--ink-faint); }

  .toolbar{ display:flex; gap:10px; align-items:center; flex-wrap:wrap;
    padding:16px 0 0; }
  .btn{ font-family:var(--mono); font-size:11px; font-weight:700; letter-spacing:.1em;
    text-transform:uppercase; padding:9px 15px; border:1px solid var(--ink); background:var(--ink);
    color:var(--sheet); border-radius:2px; cursor:pointer; }
  .btn.ghost{ background:transparent; color:var(--ink); }
  .btn:hover{ opacity:.85; }
  .tip{ font-size:12.5px; color:var(--ink-mute); }

  header.mast{ border-bottom:3px double var(--ink); padding:26px 0 20px; margin-bottom:24px; }
  .mast .eyebrow{ font-family:var(--mono); font-size:9.5px; font-weight:700; letter-spacing:.16em;
    text-transform:uppercase; color:var(--ink-faint); }
  .mast h1{ font-size:clamp(25px,3.4vw,34px); line-height:1.15; max-width:24ch; margin-top:10px; }
  .mast .lede{ margin-top:12px; max-width:70ch; color:var(--ink-mid); font-size:14.5px; }
  .tally{ margin-top:20px; display:flex; flex-wrap:wrap; border:1px solid var(--rule-firm);
    background:var(--sheet); }
  .tally div{ padding:10px 15px; border-right:1px solid var(--rule); flex:1 1 auto; min-width:150px; }
  .tally div:last-child{ border-right:0; }
  .tally dt{ font-family:var(--mono); font-size:9.5px; font-weight:700; letter-spacing:.11em;
    text-transform:uppercase; color:var(--ink-faint); }
  .tally dd{ margin:4px 0 0; font-family:var(--mono); font-size:15px; font-weight:700; }
  .tally dd.bad{ color:var(--bad); } .tally dd.adj{ color:var(--adj); }

  .alert{ border:1px solid var(--bad-edge); border-left:4px solid var(--bad); background:var(--bad-wash);
          padding:15px 17px; margin-bottom:26px; }
  .alert h2{ font-size:16px; color:var(--bad); }
  .alert p{ font-size:13.5px; color:var(--ink-mid); margin-top:7px; max-width:80ch; }
  .alert ul{ margin:9px 0 0; padding-left:19px; font-size:13.5px; color:var(--ink-mid); }
  .alert li{ margin:4px 0; }
  .alert b{ font-family:var(--mono); font-size:12.5px; }

  .stub{ background:var(--sheet); border:1px solid var(--rule-firm);
         padding:22px 24px 18px; margin-bottom:16px; box-shadow:var(--shadow); }
  .stub.restated{ border-left:4px solid var(--bad); }
  .stub.adjusted{ border-left:4px solid var(--adj); }

  .shead{ display:flex; justify-content:space-between; gap:22px; flex-wrap:wrap;
          border-bottom:1px solid var(--ink); padding-bottom:13px; }
  .issuer{ font-family:var(--mono); font-size:10px; font-weight:700; letter-spacing:.08em;
    text-transform:uppercase; color:var(--ink-mute); }
  .emplabel{ font-family:var(--mono); font-size:9.5px; font-weight:700; letter-spacing:.13em;
    text-transform:uppercase; color:var(--ink-faint); margin-top:10px; }
  .shead h2{ font-size:23px; line-height:1.15; margin-top:1px; }
  .doctype{ font-size:13px; color:var(--ink-mute); margin-top:3px; }
  .stamp{ font-family:var(--mono); font-size:9.5px; font-weight:700; letter-spacing:.13em;
    text-transform:uppercase; color:var(--ink-mute); border:1px solid var(--rule-firm);
    padding:3px 9px; display:inline-block; margin-bottom:9px; }
  .stamp.bad{ color:var(--bad); border-color:var(--bad); }
  .stamp.adj{ color:var(--adj); border-color:var(--adj); }
  table.mt{ border-collapse:collapse; font-size:12px; margin-left:auto; }
  table.mt td{ color:var(--ink-mute); padding:1px 10px 1px 0; text-align:right; }
  table.mt th{ font-family:var(--mono); font-weight:700; text-align:right; padding:1px 0; white-space:nowrap; }

  .cols{ display:grid; grid-template-columns:1fr; gap:0 30px; }
  @media (min-width:700px){ .cols{ grid-template-columns:1fr 1fr; } }
  .stub h3{ font-family:var(--mono); font-size:9.5px; text-transform:uppercase; letter-spacing:.13em;
    color:var(--ink-mute); margin:18px 0 0; font-weight:700; }
  .stub h3 .sub{ text-transform:none; letter-spacing:.02em; font-weight:400; color:var(--ink-faint); }
  table.lines{ width:100%; border-collapse:collapse; font-size:13.5px; margin-top:7px; }
  table.lines thead th{ font-family:var(--mono); font-size:9px; font-weight:700; letter-spacing:.09em;
    text-transform:uppercase; color:var(--ink-faint); text-align:left; padding:5px 0;
    border-bottom:1px solid var(--rule); }
  table.lines thead th.fig{ text-align:right; }
  table.lines td,table.lines th{ padding:6px 0; border-bottom:1px solid var(--rule); }
  table.lines td:first-child{ text-align:left; }
  table.lines tr.tot td{ font-weight:700; border-bottom:0; border-top:1px solid var(--ink); padding-top:8px; }
  table.lines tr.flag td{ color:var(--bad); font-weight:700; }
  table.lines tr.adj td{ color:var(--adj); font-weight:700; }
  .ast{ color:var(--bad); } .ast2{ color:var(--adj); }

  .net{ margin-top:18px; padding-top:13px; border-top:1px solid var(--ink);
        display:flex; justify-content:space-between; align-items:baseline; gap:14px; }
  .net .lbl{ font-size:16px; font-weight:700; }
  .paidas{ font-family:var(--mono); font-size:9px; font-weight:700; letter-spacing:.12em;
    text-transform:uppercase; color:var(--bad); border:1px solid var(--bad); padding:2px 7px; margin-left:9px; }
  .net .val{ font-family:var(--mono); font-variant-numeric:tabular-nums; font-size:25px; font-weight:700; }
  .stub.restated .net .val{ color:var(--bad); }

  .warn,.adjnote{ margin-top:13px; padding:11px 13px; font-size:12.5px; line-height:1.55; color:var(--ink-mid); }
  .warn{ border:1px solid var(--bad-edge); background:var(--bad-wash); }
  .warn b{ color:var(--bad); }
  .adjnote{ border:1px solid var(--adj-edge); background:var(--adj-wash); }
  .adjnote b{ color:var(--adj); }
  .foot{ font-size:11.5px; color:var(--ink-faint); margin-top:12px; }

  .divider{ display:flex; align-items:baseline; gap:14px; margin:34px 0 16px; }
  .divider h2{ font-size:17px; }
  .divider .rule{ flex:1; height:0; border-top:1px solid var(--rule-firm); min-width:20px; }
  .divider .count{ font-family:var(--mono); font-size:11px; color:var(--ink-faint); }

  @media print{
    @page{ size:Letter; margin:14mm 13mm; }
    body{ background:#fff; font-size:10.5pt; }
    .wrap{ max-width:none; padding:0; }
    .toolbar, .tip{ display:none !important; }
    .stub{ box-shadow:none; border:1px solid #6a6a6a; break-inside:avoid; page-break-inside:avoid;
           page-break-after:always; margin:0; padding:16px 18px 14px; }
    .stub:last-child{ page-break-after:auto; }
    header.mast, .alert{ break-inside:avoid; }
    .alert{ page-break-after:always; }
    .divider{ break-after:avoid; margin:0 0 10px; }
    .net .val{ font-size:20pt; }
    .shead h2{ font-size:17pt; }
  }
  @media (prefers-reduced-motion:reduce){ *{ transition:none !important; animation:none !important; } }
</style>

<div class="wrap">

<div class="toolbar">
  <button class="btn" onclick="window.print()">Download PDF</button>
  <span class="tip">Opens your browser's print dialog — choose <b>Save as PDF</b> as the destination.
    Each stub prints on its own page.</span>
</div>

<header class="mast">
  <span class="eyebrow">Paystubs &middot; 2026 &middot; Biweekly &middot; Qu&eacute;bec</span>
  <h1>${EMPLOYEE} &mdash; all ${P.length} pay periods, as paid</h1>
  <p class="lede">One statement per pay date, ${P[0].pay} through ${P[P.length - 1].pay}, issued by
    ${EMPLOYER.name}. Each stub shows the amounts <strong>actually withheld</strong>.
    Pays #1&ndash;#${restated.length} were run on a basis that omitted two deductions and are marked
    rather than quietly corrected — a paystub records a payment that happened, and restating it with the
    right figures would misrepresent it. The shortfall is recovered across pays
    #${recov[0].n}&ndash;#${recov[recov.length - 1].n}, from ${recov[0].pay} onward.</p>

  <dl class="tally">
    <div><dt>Gross per pay</dt><dd>${m(P[0].gross)}</dd></div>
    <div><dt>Net &middot; pays 1&ndash;${restated.length}</dt><dd class="bad">${m(restated[0].paid.net)}</dd></div>
    <div><dt>Net &middot; pays ${restated.length + 1}&ndash;${P.length}</dt><dd class="adj">${m(clean[0].paid.net)}</dd></div>
    <div><dt>Under-withheld</dt><dd class="bad">${m(t.shortfall)}</dd></div>
    <div><dt>Recovered by year end</dt><dd class="adj">${m(t.shortfall)}</dd></div>
  </dl>
</header>

<div class="alert">
  <h2>Pays #1&ndash;#${restated.length} were under-withheld by ${m(t.shortfall)}</h2>
  <p>Those ${restated.length} pays (${restated[0].pay} to ${restated[restated.length - 1].pay}) were
    calculated with the CRA payroll calculator. It computes federal tax, QPP and EI — but
    <strong>not Qu&eacute;bec income tax and not QPIP</strong>, so neither was deducted.
    ${m(restated[0].paid.net)} was paid each time instead of ${m(restated[0].net)}, a difference of
    ${m(restated[0].shortfall)} per pay.</p>
  <ul>
    <li>Qu&eacute;bec income tax not withheld: <b>${m(t.shortQc)}</b></li>
    <li>QPIP not withheld: <b>${m(t.shortQpip)}</b></li>
    <li>Net overpaid to the employee, and owed back: <b>${m(t.shortfall)}</b></li>
    <li><strong>The employer's remittance liability is unchanged.</strong> What should have been
      withheld is owed to Revenu Qu&eacute;bec whether or not it actually was — ${m(P[0].rq)} per pay,
      ${m(t.rq)} for the year. If the remittances were also made on the short basis, they are in
      arrears by the same amount and interest may apply.</li>
    <li><strong>The recovery is applied from ${recov[0].pay}.</strong> An extra ${m(perPay)} is
      withheld on pays #${recov[0].n}&ndash;#${recov[recov.length - 2].n} and ${m(finalPay)} on
      pay #${recov[recov.length - 1].n}, taking net pay from ${m(clean[0].net)} down to
      ${m(recov[0].paid.net)}, then ${m(recov[recov.length - 1].paid.net)} on the last. The instalments
      sum to ${m(t.shortfall)} exactly and the year closes on the correct annual net of
      ${m(t.net)}.</li>
  </ul>
</div>

<div class="divider"><h2>Restated &mdash; paid on the wrong basis</h2><div class="rule"></div>
  <span class="count">#1&ndash;#${restated.length}</span></div>
${restated.map(stub).join('')}

<div class="divider"><h2>Corrected, with arrears recovery</h2><div class="rule"></div>
  <span class="count">#${restated.length + 1}&ndash;#${P.length} &middot; from ${recov[0].pay}</span></div>
${clean.map(stub).join('')}

</div>
`;

fs.writeFileSync('/home/user/rent-ledger/payroll-2026-paystubs.html', html);
console.log('written', (html.length / 1024).toFixed(0) + 'KB ·', P.length, 'stubs (', restated.length, 'restated,', recov.length, 'adjusted )');
console.log('employee:', EMPLOYEE, '| employer:', EMPLOYER.name);
console.log('paid out', t.paidNet, '| correct', t.net);
