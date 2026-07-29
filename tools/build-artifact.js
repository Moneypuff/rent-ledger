// Generates the remittance schedule page from data.json so no figure is hand-typed.
const fs = require('fs');
const d = require('./data.json');
const f = n => Number(n).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const m = n => '$' + f(n);
const t = d.totals, pp = d.perPay, c = d.cfg;
const FONTS = fs.readFileSync(__dirname + '/fonts.css', 'utf8');

const bothPay = +(pp.cra + pp.rq).toFixed(2);
const bothYear = +(t.cra + t.rq).toFixed(2);
const employerCost = +(t.gross + t.er).toFixed(2);
const costPerPay = +(pp.gross + pp.er).toFixed(2);
const pctOfSalary = (bothYear / t.gross * 100).toFixed(1);
const costRatio = (employerCost / t.gross * 100).toFixed(1);

/* Accountant's statement, as given — the comparison is generated, not asserted. */
const ACC = {
  fed: 170.66, ei: 30.03, qc: 217.62, qpp: 137.05, qpip: 9.93, net: 1744.71,
  erQpp: 137.05, erQpip: 13.90, qhsf: 38.12, cnesst: 97.02
};
const cmp = [
  ['Federal income tax', ACC.fed, pp.fed, 'CRA'],
  ['EI — employee', ACC.ei, pp.ei, 'CRA'],
  ['Québec income tax', ACC.qc, pp.qc, 'RQ'],
  ['QPP — employee', ACC.qpp, pp.qpp, 'RQ'],
  ['QPIP — employee', ACC.qpip, pp.qpip, 'RQ'],
  ['Net pay', ACC.net, pp.net, ''],
  ['QPP — employer', ACC.erQpp, pp.qppEr, 'RQ'],
  ['QPIP — employer', ACC.erQpip, pp.qpipEr, 'RQ'],
  ['QHSF — employer', ACC.qhsf, pp.hsf, 'RQ'],
  ['CNESST — employer', ACC.cnesst, pp.cnesst, 'RQ'],
  ['EI — employer', null, pp.eiEr, 'CRA']
];
const cmpRows = cmp.map(([name, a, mine, who]) => {
  const absent = a === null;
  const delta = absent ? null : +(mine - a).toFixed(2);
  const state = absent ? 'absent' : (Math.abs(delta) < 0.005 ? 'match' : 'diff');
  return `
      <tr class="${state}">
        <th scope="row">${name}${who ? ` <span class="ag ${who === 'CRA' ? 'c' : 'r'}">${who}</span>` : ''}</th>
        <td class="fig">${absent ? '<span class="none">not listed</span>' : f(a)}</td>
        <td class="fig">${f(mine)}</td>
        <td class="fig ${state}">${absent ? '+' + f(mine) : (delta === 0 ? '—' : (delta > 0 ? '+' : '') + f(delta))}</td>
        <td class="verdict ${state}">${state === 'match' ? 'agrees' : state === 'diff' ? 'differs by 1¢' : 'missing'}</td>
      </tr>`;
}).join('');

const monthRows = d.months.map(x => `
      <tr${x.n === 3 ? ' class="three"' : ''}>
        <th scope="row">${x.label.replace(' 2026', '')}<span class="yr">2026</span></th>
        <td class="pays">${x.n}${x.n === 3 ? '<span class="flag">3 pays</span>' : ''}</td>
        <td class="fig">${f(x.gross)}</td>
        <td class="fig">${f(x.fed)}</td>
        <td class="fig">${f(x.ei)}</td>
        <td class="fig">${f(x.eiEr)}</td>
        <td class="fig cra-tot">${f(x.cra)}</td>
        <td class="fig">${f(x.qc)}</td>
        <td class="fig">${f(x.qpp)}</td>
        <td class="fig">${f(x.qppEr)}</td>
        <td class="fig">${f(x.qpip)}</td>
        <td class="fig">${f(x.qpipEr)}</td>
        <td class="fig">${f(x.hsf)}</td>
        <td class="fig">${f(x.cnesst)}</td>
        <td class="fig rq-tot">${f(x.rq)}</td>
        <td class="due">${x.due}</td>
      </tr>`).join('');

const periodRows = d.periods.map(p => `
      <tr>
        <td class="pn">${p.n}</td>
        <td class="dt">${p.start} → ${p.end}</td>
        <td class="dt strong">${p.pay}</td>
        <td class="fig">${f(p.gross)}</td>
        <td class="fig">${f(p.fed)}</td>
        <td class="fig">${f(p.qc)}</td>
        <td class="fig">${f(p.qpp)}</td>
        <td class="fig">${f(p.ei)}</td>
        <td class="fig">${f(p.qpip)}</td>
        <td class="fig strong">${f(p.ded)}</td>
        <td class="fig net">${f(p.net)}</td>
        <td class="fig">${f(p.qppEr)}</td>
        <td class="fig">${f(p.eiEr)}</td>
        <td class="fig">${f(p.qpipEr)}</td>
        <td class="fig">${f(p.hsf)}</td>
        <td class="fig">${f(p.cnesst)}</td>
        <td class="fig cra-tot">${f(p.cra)}</td>
        <td class="fig rq-tot">${f(p.rq)}</td>
      </tr>`).join('');

const html = `<title>2026 Source Deduction Remittances — Québec Biweekly Salary</title>
<style>
${FONTS}

  :root{
    --stock:#EAEFE8; --sheet:#FCFDFB; --sunk:#E2E9DF;
    --ink:#171C15; --ink-mid:#3E4A3A; --ink-mute:#5D6858; --ink-faint:#8B9584;
    --rule:#CFD9CB; --rule-firm:#B3C0AE;
    --cra:#2A4B7C; --cra-wash:#DCE4EF; --cra-edge:#8AA3C4;
    --rq:#9A4A28; --rq-wash:#F2E3DA; --rq-edge:#CB9B7E;
    --ok:#2E6B45; --flagbg:#FBF0DC; --flagbd:#C9A24A; --flagink:#7A5A12;
    --shadow:0 1px 0 rgba(23,28,21,.04), 0 6px 20px -12px rgba(23,28,21,.28);
    --sans:"Plex Serif", Charter, Cambria, "Palatino Linotype", Georgia, serif;
    --mono:"Plex Mono", "SF Mono", Consolas, "DejaVu Sans Mono", monospace;
  }
  @media (prefers-color-scheme:dark){
    :root{
      --stock:#10130E; --sheet:#191D16; --sunk:#141812;
      --ink:#E8EDE3; --ink-mid:#BCC6B6; --ink-mute:#9AA593; --ink-faint:#6F7A69;
      --rule:#2C3327; --rule-firm:#3D4636;
      --cra:#8DB0DE; --cra-wash:#1B2637; --cra-edge:#3D577D;
      --rq:#E09769; --rq-wash:#2E1E15; --rq-edge:#7A4A2E;
      --ok:#6FBE8A; --flagbg:#2E2712; --flagbd:#8A6F24; --flagink:#E3C46E;
      --shadow:0 1px 0 rgba(0,0,0,.4), 0 8px 24px -14px rgba(0,0,0,.8);
    }
  }
  :root[data-theme="dark"]{
    --stock:#10130E; --sheet:#191D16; --sunk:#141812;
    --ink:#E8EDE3; --ink-mid:#BCC6B6; --ink-mute:#9AA593; --ink-faint:#6F7A69;
    --rule:#2C3327; --rule-firm:#3D4636;
    --cra:#8DB0DE; --cra-wash:#1B2637; --cra-edge:#3D577D;
    --rq:#E09769; --rq-wash:#2E1E15; --rq-edge:#7A4A2E;
    --ok:#6FBE8A; --flagbg:#2E2712; --flagbd:#8A6F24; --flagink:#E3C46E;
    --shadow:0 1px 0 rgba(0,0,0,.4), 0 8px 24px -14px rgba(0,0,0,.8);
  }
  :root[data-theme="light"]{
    --stock:#EAEFE8; --sheet:#FCFDFB; --sunk:#E2E9DF;
    --ink:#171C15; --ink-mid:#3E4A3A; --ink-mute:#5D6858; --ink-faint:#8B9584;
    --rule:#CFD9CB; --rule-firm:#B3C0AE;
    --cra:#2A4B7C; --cra-wash:#DCE4EF; --cra-edge:#8AA3C4;
    --rq:#9A4A28; --rq-wash:#F2E3DA; --rq-edge:#CB9B7E;
    --ok:#2E6B45; --flagbg:#FBF0DC; --flagbd:#C9A24A; --flagink:#7A5A12;
    --shadow:0 1px 0 rgba(23,28,21,.04), 0 6px 20px -12px rgba(23,28,21,.28);
  }

  *{box-sizing:border-box;}
  body{ margin:0; background:var(--stock); color:var(--ink); font-family:var(--sans);
        font-size:15px; line-height:1.55; -webkit-font-smoothing:antialiased; }
  .wrap{ max-width:1180px; margin:0 auto; padding:0 20px 72px; }
  h1,h2,h3{ margin:0; font-weight:700; letter-spacing:0; text-wrap:balance; }
  p{ margin:0; }
  .lede{ max-width:64ch; color:var(--ink-mid); }
  .eyebrow{ font-family:var(--mono); font-size:9.5px; font-weight:700; letter-spacing:.15em; text-transform:uppercase; color:var(--ink-faint); }
  .fig{ font-family:var(--mono); font-variant-numeric:tabular-nums; }

  header.mast{ border-bottom:2px solid var(--ink); padding:44px 0 22px; margin-bottom:34px; }
  .mast h1{ font-size:clamp(28px,4.4vw,46px); line-height:1.06; max-width:20ch; margin-top:14px; }
  .mast .sub{ margin-top:14px; font-size:16px; }
  .basis{ margin-top:26px; display:flex; flex-wrap:wrap;
    border:1px solid var(--rule-firm); border-radius:3px; background:var(--sheet); overflow:hidden; }
  .basis div{ padding:11px 16px; border-right:1px solid var(--rule); flex:1 1 auto; min-width:148px; }
  .basis div:last-child{ border-right:0; }
  .basis dt{ font-family:var(--mono); font-size:9.5px; font-weight:700; letter-spacing:.12em; text-transform:uppercase; color:var(--ink-faint); }
  .basis dd{ margin:3px 0 0; font-family:var(--mono); font-size:16px; font-weight:600; }

  section{ margin-top:56px; }
  .shead{ display:flex; align-items:baseline; gap:14px; margin-bottom:6px; flex-wrap:wrap; }
  .shead h2{ font-size:21px; }
  .shead .rule{ flex:1; height:1px; background:var(--rule-firm); min-width:24px; }
  .shead .meta{ font-family:var(--mono); font-size:12px; color:var(--ink-faint); }
  .snote{ color:var(--ink-mute); font-size:14px; max-width:72ch; margin-bottom:20px; }

  .flow{ margin-top:18px; background:var(--sheet); border:1px solid var(--rule); border-radius:3px;
         display:grid; grid-template-columns:1fr; overflow:hidden; box-shadow:var(--shadow); }
  @media (min-width:820px){ .flow{ grid-template-columns:repeat(5,1fr); } }
  .flow > div{ padding:16px 18px; border-bottom:1px solid var(--rule); }
  .flow > div:last-child{ border-bottom:0; }
  @media (min-width:820px){ .flow > div{ border-bottom:0; border-right:1px solid var(--rule); }
    .flow > div:last-child{ border-right:0; } }
  .flow .k{ font-family:var(--mono); font-size:9.5px; font-weight:700; letter-spacing:.12em; text-transform:uppercase; color:var(--ink-faint); }
  .flow .v{ font-family:var(--mono); font-size:22px; font-weight:700; margin-top:5px; letter-spacing:-.02em; }
  .flow .d{ font-size:12px; color:var(--ink-mute); margin-top:4px; }
  .flow .v.cra-c{ color:var(--cra); } .flow .v.rq-c{ color:var(--rq); }
  .flow .gross{ background:var(--sunk); }

  .split{ display:grid; grid-template-columns:1fr; gap:16px; }
  @media (min-width:760px){ .split{ grid-template-columns:1fr 1fr; } }
  .agency{ background:var(--sheet); border:1px solid var(--rule); border-left:4px solid var(--edge);
           border-radius:3px; padding:20px 22px 18px; box-shadow:var(--shadow); min-width:0; }
  .agency.cra{ --edge:var(--cra); --hue:var(--cra); }
  .agency.rq{ --edge:var(--rq); --hue:var(--rq); }
  .agency .who{ font-family:var(--mono); font-size:9.5px; font-weight:700; letter-spacing:.13em; text-transform:uppercase; color:var(--hue); }
  .agency h3{ font-size:19px; margin-top:4px; }
  .agency .blurb{ font-size:13.5px; color:var(--ink-mute); margin-top:6px; min-height:3.2em; }
  .agency .headline{ margin-top:16px; padding-top:14px; border-top:1px solid var(--rule);
    display:flex; align-items:flex-end; justify-content:space-between; gap:12px; }
  .agency .headline .n{ font-family:var(--mono); font-size:29px; font-weight:700; letter-spacing:-.02em; color:var(--hue); }
  .agency .headline .lbl{ font-size:11px; letter-spacing:.09em; text-transform:uppercase;
    color:var(--ink-faint); text-align:right; line-height:1.5; }
  .lines{ width:100%; border-collapse:collapse; margin-top:14px; font-size:13.5px; }
  .lines th,.lines td{ padding:6px 0; border-bottom:1px dotted var(--rule-firm); text-align:left; }
  .lines td.fig{ text-align:right; white-space:nowrap; }
  .lines tr.sum td,.lines tr.sum th{ border-bottom:0; border-top:2px solid var(--hue); font-weight:700; padding-top:9px; }
  .lines .who-tag{ font-size:10.5px; color:var(--ink-faint); letter-spacing:.05em; }
  .lines tr.added th{ color:var(--flagink); font-weight:700; }
  .lines tr.added td{ color:var(--flagink); }

  .tscroll{ overflow-x:auto; border:1px solid var(--rule-firm); border-radius:3px;
            background:var(--sheet); box-shadow:var(--shadow); }
  table.grid{ width:100%; border-collapse:collapse; font-size:13px; min-width:920px; }
  table.grid caption{ text-align:left; padding:13px 16px; font-size:12.5px; color:var(--ink-mute);
    border-bottom:1px solid var(--rule); }
  table.grid th,table.grid td{ padding:8px 10px; text-align:left; white-space:nowrap; border-bottom:1px solid var(--rule); }
  table.grid thead th{ font-family:var(--mono); font-size:9px; font-weight:700; letter-spacing:.09em; text-transform:uppercase;
    color:var(--ink-mute); background:var(--sunk); border-bottom:1px solid var(--rule-firm); }
  table.grid thead tr.band th{ text-align:center; letter-spacing:.13em; padding:7px 10px; color:var(--ink); }
  th.b-cra{ background:var(--cra-wash); color:var(--cra) !important; border-left:2px solid var(--cra); border-right:2px solid var(--cra); }
  th.b-rq{ background:var(--rq-wash); color:var(--rq) !important; border-left:2px solid var(--rq); border-right:2px solid var(--rq); }
  table.grid td.fig,table.grid th.fig{ text-align:right; }
  table.grid tbody tr:hover{ background:var(--sunk); }
  table.grid tbody tr:last-child td{ border-bottom:0; }
  td.cra-tot{ color:var(--cra); font-weight:700; background:var(--cra-wash); }
  td.rq-tot{ color:var(--rq); font-weight:700; background:var(--rq-wash); }
  th.cra-tot{ color:var(--cra) !important; } th.rq-tot{ color:var(--rq) !important; }
  table.grid tbody th[scope="row"]{ font-weight:700; }
  .yr{ color:var(--ink-faint); font-weight:400; font-size:11px; margin-left:6px; font-family:var(--mono); }
  td.pays{ font-family:var(--mono); color:var(--ink-mute); }
  td.pays .flag{ margin-left:7px; font-family:var(--sans); font-size:10px; letter-spacing:.07em;
    text-transform:uppercase; color:var(--rq); border:1px solid var(--rq-edge); border-radius:2px; padding:1px 5px; }
  tr.three{ background:color-mix(in srgb, var(--rq-wash) 45%, transparent); }
  td.due,td.dt{ font-family:var(--mono); font-size:12px; color:var(--ink-mute); }
  td.dt.strong{ color:var(--ink); font-weight:600; }
  td.pn{ font-family:var(--mono); color:var(--ink-faint); }
  td.strong{ font-weight:700; }
  td.net{ font-weight:700; color:var(--ok); }
  tfoot td,tfoot th{ background:var(--sunk); font-weight:700; border-top:2px solid var(--rule-firm) !important; }

  /* accountant comparison */
  table.cmp{ width:100%; border-collapse:collapse; font-size:13.5px; min-width:640px; }
  table.cmp th,table.cmp td{ padding:9px 12px; text-align:left; border-bottom:1px solid var(--rule); white-space:nowrap; }
  table.cmp thead th{ font-family:var(--mono); font-size:9px; font-weight:700; letter-spacing:.09em; text-transform:uppercase;
    color:var(--ink-mute); background:var(--sunk); }
  table.cmp td.fig{ text-align:right; font-family:var(--mono); font-variant-numeric:tabular-nums; }
  table.cmp tbody th{ font-weight:600; }
  .ag{ font-size:9.5px; font-weight:700; letter-spacing:.08em; border-radius:2px; padding:1px 5px; margin-left:6px; }
  .ag.c{ color:var(--cra); border:1px solid var(--cra-edge); }
  .ag.r{ color:var(--rq); border:1px solid var(--rq-edge); }
  td.verdict{ font-size:12px; }
  tr.match td.verdict{ color:var(--ok); }
  tr.diff{ background:var(--flagbg); } tr.diff td.verdict,tr.diff td.diff{ color:var(--flagink); font-weight:700; }
  tr.absent{ background:var(--flagbg); }
  tr.absent td.verdict,tr.absent td.absent{ color:var(--flagink); font-weight:700; }
  .none{ font-style:italic; color:var(--flagink); font-family:var(--sans); }

  .callout{ border:1.5px solid var(--flagbd); background:var(--flagbg); border-radius:3px;
            padding:16px 18px; margin-top:16px; }
  .callout h4{ margin:0; font-size:15px; font-weight:800; color:var(--flagink); }
  .callout p{ font-size:13.5px; color:var(--ink-mid); margin-top:7px; max-width:76ch; }
  .callout .big{ font-family:var(--mono); font-size:19px; font-weight:700; color:var(--flagink); }

  .derive{ display:grid; grid-template-columns:1fr; gap:12px; }
  @media (min-width:820px){ .derive{ grid-template-columns:1fr 1fr; } }
  /* min-width:0 — grid items default to min-content, and the nowrap formula
     inside .calc would otherwise force the track wider than the viewport. */
  .drow{ background:var(--sheet); border:1px solid var(--rule); border-left:4px solid var(--edge);
         border-radius:3px; padding:14px 16px; min-width:0; }
  .drow.cra{ --edge:var(--cra); --hue:var(--cra); }
  .drow.rq{ --edge:var(--rq); --hue:var(--rq); }
  .drow .dt-h{ display:flex; justify-content:space-between; align-items:baseline; gap:10px; }
  .drow .name{ font-weight:700; font-size:14.5px; }
  .drow .to{ font-size:10.5px; letter-spacing:.09em; text-transform:uppercase; color:var(--hue); font-weight:700; }
  .drow .calc{ font-family:var(--mono); font-size:12.5px; color:var(--ink-mute); margin-top:8px;
    background:var(--sunk); border:1px solid var(--rule); border-radius:2px; padding:7px 9px;
    overflow-x:auto; white-space:nowrap; }
  .drow .res{ margin-top:8px; display:flex; justify-content:space-between; gap:10px; font-size:13px; }
  .drow .res b{ font-family:var(--mono); }
  .drow .cap{ font-size:11.5px; color:var(--ink-faint); margin-top:6px; }

  .recon{ background:var(--sheet); border:1px solid var(--rule-firm); border-radius:3px;
          overflow:hidden; box-shadow:var(--shadow); }
  .recon .rrow{ display:flex; justify-content:space-between; align-items:baseline; gap:16px;
    padding:13px 18px; border-bottom:1px solid var(--rule); }
  .recon .rrow:last-child{ border-bottom:0; }
  .recon .rrow.tot{ background:var(--sunk); border-top:2px solid var(--rule-firm); }
  .recon .rlabel{ font-size:14px; }
  .recon .rlabel small{ display:block; color:var(--ink-faint); font-size:12px; }
  .recon .rval{ font-family:var(--mono); font-size:17px; font-weight:700; white-space:nowrap; }
  .recon .rval.cra-c{ color:var(--cra); } .recon .rval.rq-c{ color:var(--rq); }
  .recon .rval.ok{ color:var(--ok); }

  footer.foot{ margin-top:60px; padding-top:20px; border-top:2px solid var(--ink); font-size:12.5px; color:var(--ink-mute); }
  footer.foot p{ max-width:76ch; margin-bottom:9px; }
  .legend{ display:flex; gap:18px; flex-wrap:wrap; margin-bottom:14px; font-size:12px; }
  .legend span{ display:inline-flex; align-items:center; gap:7px; }
  .legend i{ width:11px; height:11px; border-radius:2px; display:inline-block; }
  .legend i.c{ background:var(--cra); } .legend i.r{ background:var(--rq); }
  .legend i.w{ background:var(--flagbg); border:1.5px solid var(--flagbd); }
  @media (prefers-reduced-motion:reduce){ *{ transition:none !important; animation:none !important; } }
</style>

<div class="wrap">

<header class="mast">
  <span class="eyebrow">Source deduction remittances · Tax year 2026</span>
  <h1>What comes off each cheque, and which government it goes to</h1>
  <p class="lede sub">A Québec employer on a fixed biweekly salary remits to <strong>two</strong> separate
    governments. Every figure below is reconciled against the accountant's statement for this salary —
    with <strong>one line they did not list</strong>, set out in full further down.</p>

  <dl class="basis">
    <div><dt>Salary per pay</dt><dd>${m(pp.gross)}</dd></div>
    <div><dt>Employee net</dt><dd>${m(pp.net)}</dd></div>
    <div><dt>To the CRA</dt><dd>${m(pp.cra)}</dd></div>
    <div><dt>To Revenu Québec</dt><dd>${m(pp.rq)}</dd></div>
    <div><dt>Frequency</dt><dd>Biweekly · 26</dd></div>
    <div><dt>Annual gross</dt><dd>${m(t.gross)}</dd></div>
  </dl>
</header>

<!-- 1 — per cheque -->
<section>
  <div class="shead"><h2>Every cheque, split</h2><div class="rule"></div>
    <span class="meta">per pay period · 26 identical</span></div>
  <p class="snote">The salary is below every 2026 annual ceiling, so all 26 pay periods are identical —
    no contribution stops partway through the year.</p>

  <div class="flow">
    <div class="gross"><div class="k">Gross salary</div><div class="v">${m(pp.gross)}</div>
      <div class="d">Fixed, regardless of hours</div></div>
    <div><div class="k">Employee net</div><div class="v">${m(pp.net)}</div>
      <div class="d">After ${m(pp.ded)} withheld</div></div>
    <div><div class="k">Employer adds</div><div class="v">${m(pp.er)}</div>
      <div class="d">On top of salary</div></div>
    <div><div class="k">To the CRA</div><div class="v cra-c">${m(pp.cra)}</div>
      <div class="d">Federal tax + EI both shares</div></div>
    <div><div class="k">To Revenu Québec</div><div class="v rq-c">${m(pp.rq)}</div>
      <div class="d">QC tax, QPP, QPIP, QHSF, CNESST</div></div>
  </div>
</section>

<!-- 2 — the two agencies -->
<section>
  <div class="shead"><h2>The two remittances, itemized</h2><div class="rule"></div>
    <span class="meta">${m(bothPay)} per pay · ${m(bothYear)} per year</span></div>
  <p class="snote">Two separate payments, on two separate accounts, to two separate governments. QPP
    comes off the same cheque as EI but is <strong>not</strong> part of the CRA remittance — that single
    mistake is the most common way a Québec payroll goes wrong. Revenu Québec collects
    ${(t.rq / bothYear * 100).toFixed(0)}% of the total.</p>

  <div class="split">
    <article class="agency cra">
      <div class="who">Canada Revenue Agency</div>
      <h3>Federal remittance</h3>
      <p class="blurb">Federal income tax and Employment Insurance, both shares. Remitted on your
        <span class="fig">RP</span> payroll account.</p>
      <div class="headline"><div class="n">${m(t.cra)}</div>
        <div class="lbl">Total<br>2026</div></div>
      <table class="lines"><tbody>
        <tr><th>Federal income tax <span class="who-tag">withheld</span></th><td class="fig">${m(t.fed)}</td></tr>
        <tr><th>EI — employee <span class="who-tag">withheld</span></th><td class="fig">${m(t.ei)}</td></tr>
        <tr class="added"><th>EI — employer <span class="who-tag">1.4× employee · added</span></th><td class="fig">${m(t.eiEr)}</td></tr>
        <tr class="sum"><th>Total to the CRA</th><td class="fig">${m(t.cra)}</td></tr>
      </tbody></table>
    </article>

    <article class="agency rq">
      <div class="who">Revenu Québec</div>
      <h3>Provincial remittance</h3>
      <p class="blurb">Québec income tax, QPP and QPIP both shares, plus the two employer-only charges
        on payroll — QHSF and CNESST.</p>
      <div class="headline"><div class="n">${m(t.rq)}</div>
        <div class="lbl">Total<br>2026</div></div>
      <table class="lines"><tbody>
        <tr><th>Québec income tax <span class="who-tag">withheld</span></th><td class="fig">${m(t.qc)}</td></tr>
        <tr><th>QPP — employee <span class="who-tag">withheld</span></th><td class="fig">${m(t.qpp)}</td></tr>
        <tr><th>QPP — employer <span class="who-tag">matched 1:1</span></th><td class="fig">${m(t.qppEr)}</td></tr>
        <tr><th>QPIP — employee <span class="who-tag">withheld</span></th><td class="fig">${m(t.qpip)}</td></tr>
        <tr><th>QPIP — employer</th><td class="fig">${m(t.qpipEr)}</td></tr>
        <tr><th>QHSF — employer <span class="who-tag">on payroll</span></th><td class="fig">${m(t.hsf)}</td></tr>
        <tr><th>CNESST — employer <span class="who-tag">on payroll</span></th><td class="fig">${m(t.cnesst)}</td></tr>
        <tr class="sum"><th>Total to Revenu Québec</th><td class="fig">${m(t.rq)}</td></tr>
      </tbody></table>
    </article>
  </div>
</section>

<!-- 3 — accountant reconciliation -->
<section>
  <div class="shead"><h2>Checked against your accountant</h2><div class="rule"></div>
    <span class="meta">per pay · ${m(pp.gross)}</span></div>
  <p class="snote">Their statement line by line against this calculation. Nine of eleven lines agree
    exactly, including net pay. Two do not — one is a rounding cent, the other is a contribution that
    does not appear on their list at all.</p>

  <div class="tscroll">
    <table class="cmp">
      <thead><tr>
        <th scope="col">Line</th><th scope="col" class="fig">Accountant</th>
        <th scope="col" class="fig">This calculation</th><th scope="col" class="fig">Difference</th>
        <th scope="col">Status</th>
      </tr></thead>
      <tbody>${cmpRows}
      </tbody>
    </table>
  </div>

  <div class="callout">
    <h4>Employer EI is not on their list</h4>
    <p>Every employer paying EI premiums also owes the employer share, at
      <strong>1.4× the employee premium</strong>. On ${m(pp.ei)} withheld that is
      <span class="big">${m(pp.eiEr)}</span> per pay — <strong>${m(t.eiEr)} across 2026</strong>, owed to
      the CRA. It may simply be missing from the summary they sent rather than from what they file, but
      it is the one item worth confirming: nothing else in their figures implies it.</p>
    <p>The other gap is a cent. QPIP employer at the published 0.602% gives
      ${f(pp.gross)} × 0.602% = ${f(pp.qpipEr)}, where they show ${f(ACC.erQpip)} — ${m(0.26)} across the
      year. Not worth chasing, but this page uses the published rate.</p>
  </div>
</section>

<!-- 4 — calendar -->
<section>
  <div class="shead"><h2>Remittance calendar</h2><div class="rule"></div>
    <span class="meta">regular remitter · due the 15th following</span></div>
  <p class="snote">Grouped by the month the employee was <strong>paid</strong>, which is what determines
    the remittance period. May and October each contain three pay dates, so those two remittances are
    50% larger — the most common cash-flow surprise on a biweekly payroll.</p>

  <div class="tscroll">
    <table class="grid">
      <caption>Amounts due by agency. Due dates roll forward off weekends; statutory holidays are not accounted for.</caption>
      <thead>
        <tr class="band"><th colspan="3"></th>
          <th colspan="4" class="b-cra">Canada Revenue Agency</th>
          <th colspan="7" class="b-rq">Revenu Québec</th><th></th></tr>
        <tr>
          <th scope="col">Month paid</th><th scope="col">Pays</th><th scope="col" class="fig">Gross</th>
          <th scope="col" class="fig">Fed tax</th><th scope="col" class="fig">EI ee</th>
          <th scope="col" class="fig">EI er</th><th scope="col" class="fig cra-tot">CRA due</th>
          <th scope="col" class="fig">QC tax</th><th scope="col" class="fig">QPP ee</th>
          <th scope="col" class="fig">QPP er</th><th scope="col" class="fig">QPIP ee</th>
          <th scope="col" class="fig">QPIP er</th><th scope="col" class="fig">QHSF</th>
          <th scope="col" class="fig">CNESST</th><th scope="col" class="fig rq-tot">RQ due</th>
          <th scope="col">Due date</th>
        </tr>
      </thead>
      <tbody>${monthRows}
      </tbody>
      <tfoot><tr>
        <th scope="row">Year</th><td class="pays">26</td><td class="fig">${f(t.gross)}</td>
        <td class="fig">${f(t.fed)}</td><td class="fig">${f(t.ei)}</td><td class="fig">${f(t.eiEr)}</td>
        <td class="fig cra-tot">${f(t.cra)}</td>
        <td class="fig">${f(t.qc)}</td><td class="fig">${f(t.qpp)}</td><td class="fig">${f(t.qppEr)}</td>
        <td class="fig">${f(t.qpip)}</td><td class="fig">${f(t.qpipEr)}</td><td class="fig">${f(t.hsf)}</td>
        <td class="fig">${f(t.cnesst)}</td><td class="fig rq-tot">${f(t.rq)}</td><td class="due">—</td>
      </tr></tfoot>
    </table>
  </div>
</section>

<!-- 5 — derivation -->
<section>
  <div class="shead"><h2>How each figure is derived</h2><div class="rule"></div>
    <span class="meta">published 2026 rates</span></div>
  <p class="snote">Income tax comes from the payroll calculators and cannot be derived from a rate.
    Everything else is one of these calculations, each checked against its published annual maximum.</p>

  <div class="derive">
    <div class="drow cra">
      <div class="dt-h"><span class="name">Federal income tax</span><span class="to">→ CRA</span></div>
      <div class="calc">from PDOC — not rate-derivable</div>
      <div class="res"><span>Per pay</span><b>${m(pp.fed)}</b></div>
      <div class="res"><span>× 26 periods</span><b>${m(t.fed)}</b></div>
      <div class="cap">Depends on the whole TD1 picture. Matches the accountant exactly.</div>
    </div>
    <div class="drow rq">
      <div class="dt-h"><span class="name">Québec income tax</span><span class="to">→ Revenu Québec</span></div>
      <div class="calc">from WebRAS — not rate-derivable</div>
      <div class="res"><span>Per pay</span><b>${m(pp.qc)}</b></div>
      <div class="res"><span>× 26 periods</span><b>${m(t.qc)}</b></div>
      <div class="cap">PDOC does not calculate Québec tax at all. Matches the accountant exactly.</div>
    </div>
    <div class="drow cra">
      <div class="dt-h"><span class="name">EI — employee</span><span class="to">→ CRA</span></div>
      <div class="calc">${f(pp.gross)} × ${c.ei.toFixed(2)}% = ${f(pp.ei)}</div>
      <div class="res"><span>Per pay</span><b>${m(pp.ei)}</b></div>
      <div class="res"><span>× 26 periods</span><b>${m(t.ei)}</b></div>
      <div class="cap">Reduced Québec rate — lower than the rest of Canada because QPIP covers parental
        benefits. Max insurable ${m(c.eiMie)}.</div>
    </div>
    <div class="drow cra">
      <div class="dt-h"><span class="name">EI — employer</span><span class="to">→ CRA</span></div>
      <div class="calc">${f(pp.ei)} × ${c.eiMult} = ${f(pp.eiEr)}</div>
      <div class="res"><span>Per pay</span><b>${m(pp.eiEr)}</b></div>
      <div class="res"><span>× 26 periods</span><b>${m(t.eiEr)}</b></div>
      <div class="cap">The line absent from the accountant's statement.</div>
    </div>
    <div class="drow rq">
      <div class="dt-h"><span class="name">QPP — employee</span><span class="to">→ Revenu Québec</span></div>
      <div class="calc">(${f(pp.gross)} − ${f(c.qppEx / 26)}) × ${c.qpp.toFixed(2)}% = ${f(pp.qpp)}</div>
      <div class="res"><span>Per pay</span><b>${m(pp.qpp)}</b></div>
      <div class="res"><span>× 26 periods</span><b>${m(t.qpp)}</b></div>
      <div class="cap">${c.qpp.toFixed(2)}% is 5.30% base + 1.00% first additional. The ${m(c.qppEx)}
        basic exemption is prorated across the 26 periods. Max pensionable ${m(c.ympe)}.</div>
    </div>
    <div class="drow rq">
      <div class="dt-h"><span class="name">QPP — employer</span><span class="to">→ Revenu Québec</span></div>
      <div class="calc">matches employee 1 : 1 = ${f(pp.qpp)}</div>
      <div class="res"><span>Per pay</span><b>${m(pp.qppEr)}</b></div>
      <div class="res"><span>× 26 periods</span><b>${m(t.qppEr)}</b></div>
      <div class="cap">Doubling QPP contributes ${m(+(t.qpp + t.qppEr).toFixed(2))} of the ${m(t.rq)}
        provincial total.</div>
    </div>
    <div class="drow rq">
      <div class="dt-h"><span class="name">QPIP — employee / employer</span><span class="to">→ Revenu Québec</span></div>
      <div class="calc">${f(pp.gross)} × ${c.qpipEe.toFixed(3)}% = ${f(pp.qpip)} · × ${c.qpipEr.toFixed(3)}% = ${f(pp.qpipEr)}</div>
      <div class="res"><span>Per pay, combined</span><b>${m(+(pp.qpip + pp.qpipEr).toFixed(2))}</b></div>
      <div class="res"><span>× 26 periods</span><b>${m(+(t.qpip + t.qpipEr).toFixed(2))}</b></div>
      <div class="cap">No basic exemption. The employer rate is higher than the employee rate, unlike
        QPP. Max insurable ${m(c.qpipMax)}.</div>
    </div>
    <div class="drow rq">
      <div class="dt-h"><span class="name">QHSF and CNESST</span><span class="to">→ Revenu Québec</span></div>
      <div class="calc">${f(pp.gross)} × ${c.hsf.toFixed(2)}% = ${f(pp.hsf)} · × ${c.cnesst.toFixed(2)}% = ${f(pp.cnesst)}</div>
      <div class="res"><span>Per pay, combined</span><b>${m(+(pp.hsf + pp.cnesst).toFixed(2))}</b></div>
      <div class="res"><span>× 26 periods</span><b>${m(+(t.hsf + t.cnesst).toFixed(2))}</b></div>
      <div class="cap">Employer-only, on total payroll, both remitted periodically to Revenu Québec.
        Rates back-solved from the accountant's figures — QHSF depends on total payroll and sector,
        CNESST on your classification unit, so neither is a standard rate.</div>
    </div>
  </div>
</section>

<!-- 6 — register -->
<section>
  <div class="shead"><h2>All 26 pay periods</h2><div class="rule"></div><span class="meta">register</span></div>
  <p class="snote">Period 1 is short — it runs from the 2026-01-01 start date to the first pay date. The
    salary is fixed regardless, so the deductions are the same as every other period.</p>

  <div class="tscroll">
    <table class="grid">
      <caption>Withheld from the employee, contributed by the employer, and the resulting remittance to each agency.</caption>
      <thead>
        <tr class="band"><th colspan="4"></th><th colspan="6">Withheld from employee</th>
          <th colspan="5">Employer contributions</th><th colspan="2">Remittance</th></tr>
        <tr>
          <th scope="col">#</th><th scope="col">Pay period</th><th scope="col">Pay date</th>
          <th scope="col" class="fig">Gross</th>
          <th scope="col" class="fig">Fed tax</th><th scope="col" class="fig">QC tax</th>
          <th scope="col" class="fig">QPP</th><th scope="col" class="fig">EI</th>
          <th scope="col" class="fig">QPIP</th><th scope="col" class="fig">Total</th>
          <th scope="col" class="fig">Net pay</th>
          <th scope="col" class="fig">QPP</th><th scope="col" class="fig">EI</th>
          <th scope="col" class="fig">QPIP</th><th scope="col" class="fig">QHSF</th>
          <th scope="col" class="fig">CNESST</th>
          <th scope="col" class="fig cra-tot">CRA</th><th scope="col" class="fig rq-tot">RQ</th>
        </tr>
      </thead>
      <tbody>${periodRows}
      </tbody>
      <tfoot><tr>
        <td class="pn">—</td><td class="dt">2026 total</td><td class="dt">26 pays</td>
        <td class="fig">${f(t.gross)}</td>
        <td class="fig">${f(t.fed)}</td><td class="fig">${f(t.qc)}</td><td class="fig">${f(t.qpp)}</td>
        <td class="fig">${f(t.ei)}</td><td class="fig">${f(t.qpip)}</td><td class="fig">${f(t.ded)}</td>
        <td class="fig net">${f(t.net)}</td>
        <td class="fig">${f(t.qppEr)}</td><td class="fig">${f(t.eiEr)}</td><td class="fig">${f(t.qpipEr)}</td>
        <td class="fig">${f(t.hsf)}</td><td class="fig">${f(t.cnesst)}</td>
        <td class="fig cra-tot">${f(t.cra)}</td><td class="fig rq-tot">${f(t.rq)}</td>
      </tr></tfoot>
    </table>
  </div>
</section>

<!-- 7 — reconciliation -->
<section>
  <div class="shead"><h2>Annual reconciliation</h2><div class="rule"></div><span class="meta">2026</span></div>
  <p class="snote">Every dollar remitted is either withheld from the employee or paid on top by the
    employer, and all of it lands at one of the two agencies. The two views tie.</p>

  <div class="split">
    <div class="recon">
      <div class="rrow"><div class="rlabel">Withheld from employee<small>income tax + QPP + EI + QPIP</small></div>
        <div class="rval">${m(t.ded)}</div></div>
      <div class="rrow"><div class="rlabel">Paid by employer<small>QPP + EI + QPIP + QHSF + CNESST</small></div>
        <div class="rval">${m(t.er)}</div></div>
      <div class="rrow tot"><div class="rlabel">Total remitted</div><div class="rval">${m(bothYear)}</div></div>
    </div>
    <div class="recon">
      <div class="rrow"><div class="rlabel">To the CRA<small>federal tax + EI, both shares</small></div>
        <div class="rval cra-c">${m(t.cra)}</div></div>
      <div class="rrow"><div class="rlabel">To Revenu Québec<small>QC tax, QPP, QPIP, QHSF, CNESST</small></div>
        <div class="rval rq-c">${m(t.rq)}</div></div>
      <div class="rrow tot"><div class="rlabel">Total remitted</div><div class="rval">${m(bothYear)}</div></div>
    </div>
  </div>

  <div class="recon" style="margin-top:16px;">
    <div class="rrow"><div class="rlabel">Gross salary<small>26 × ${m(pp.gross)}</small></div>
      <div class="rval">${m(t.gross)}</div></div>
    <div class="rrow"><div class="rlabel">Employee takes home<small>${m(pp.net)} per pay on the correct basis — pays #1–#15 were paid ${m(1972.26)} in error and the ${m(3413.25)} shortfall is recovered from ${m(310.30)} per pay from 2026-08-07</small></div>
      <div class="rval ok">${m(t.net)}</div></div>
    <div class="rrow"><div class="rlabel">Remitted to government<small>${pctOfSalary}% of gross salary, across both agencies</small></div>
      <div class="rval">${m(bothYear)}</div></div>
    <div class="rrow tot"><div class="rlabel">Total cost to the employer<small>salary + ${m(t.er)} in employer contributions — ${costRatio}% of gross, or ${m(costPerPay)} per pay</small></div>
      <div class="rval">${m(employerCost)}</div></div>
  </div>
</section>

<footer class="foot">
  <div class="legend">
    <span><i class="c"></i> Canada Revenue Agency</span>
    <span><i class="r"></i> Revenu Québec</span>
    <span><i class="w"></i> Differs from the accountant's statement</span>
  </div>
  <p><strong>Basis.</strong> The ${m(pp.gross)} biweekly salary and the two income tax amounts are taken
    as given. Contribution rates come from the published 2026 tables and are cross-checked against their
    annual maximums; the QHSF and CNESST rates (${c.hsf.toFixed(2)}% and ${c.cnesst.toFixed(2)}%) are
    back-solved from the accountant's per-pay figures, since both are employer-specific.</p>
  <p><strong>Rounding.</strong> Each period is rounded to the cent independently and annual totals are
    the sum of those rounded periods, which is how source deductions are actually remitted. This can
    differ by a cent or two from rate × annual earnings.</p>
  <p><strong>Before you remit.</strong> Confirm the employer EI line with your accountant. Rates and
    ceilings change every January. Due dates here roll forward off weekends but do not account for
    statutory holidays, and the CRA and Revenu Québec assign remitter frequency independently — yours
    may not both be monthly.</p>
</footer>

</div>
`;

fs.writeFileSync(require('path').join(__dirname,'..','payroll-2026-remittances.html'), html);
console.log('written', html.length, 'bytes');
console.log('ties: ee+er', (t.ded + t.er).toFixed(2), '| cra+rq', bothYear.toFixed(2),
  '| net+ded', (t.net + t.ded).toFixed(2), '| gross', t.gross.toFixed(2));
