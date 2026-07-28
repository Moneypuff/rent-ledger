# Rent Ledger

A mobile-friendly rent collection tracker. The page (hosted on GitHub Pages) is
just the front end — all data lives in a Google Sheet, read and written
through a small Apps Script Web App. Add or edit tenants directly in the
Sheet and the page picks it up automatically; every entry you save from the
page is appended to a `Collections` log, so nothing is ever overwritten —
that log is your audit trail.

There's no "reset" step: each calendar month is just a fresh set of blank
rows, computed automatically from today's date. Past months stay in the
History tab forever.

## One-time setup

### 1. Create the Google Sheet + backend

1. Go to [sheets.google.com](https://sheets.google.com) and create a new **blank spreadsheet**. Name it whatever you like (e.g. "Rent Ledger").
2. In the Sheet, go to **Extensions → Apps Script**.
3. Delete the placeholder code and paste in the contents of [`apps-script/Code.gs`](apps-script/Code.gs) from this repo.
4. Save the project (Ctrl+S / the save icon).
5. In the function dropdown at the top, choose **`setup`**, then click **Run**. The first run will ask you to authorize the script (it's your own script acting on your own Sheet) — click through the consent screens.
6. Go to **View → Logs** (or **Executions** in the left sidebar) and copy the shared secret it printed, e.g. `Shared secret (copy this into the app once): 3f9a...`. Keep this handy — you'll paste it into the page once.
7. Back in the Sheet, check the **Tenants** tab — it's been pre-filled with your property addresses (from RenovationPivot). Fill in each row: **Name** (tenant), confirm **Unit** (address/unit), **Type** (`residential` or `commercial`), **BaseRent**, and **TaxRatePct** for commercial units (e.g. `5` for GST-only, `14.975` for combined GST+QST in Québec). Leave **Active** as `TRUE`; set it to `FALSE` for a tenant who's moved out (their history is kept either way).
8. Click **Deploy → New deployment**. For "Select type" choose **Web app**. Set:
   - Execute as: **Me**
   - Who has access: **Anyone with the link**
9. Click **Deploy**, authorize again if asked, and copy the **Web app URL** (ends in `/exec`). Keep this too.

### 2. Connect the page

Open the GitHub Pages URL on your phone. On first load it'll ask for:
- **Web App URL** — from step 9 above
- **Shared secret** — from step 6 above

These are stored only in that browser's local storage, never committed to the repo or sent anywhere but your own Apps Script. You'll need to enter them again on any new device/browser (tap the gear icon in the top bar to view or change them later).

## Adding or editing tenants

Just edit the **Tenants** tab of the Sheet directly — add a row for a new tenant, change a rent amount, flip `Active` to `FALSE` for a move-out. The page always reads the Sheet fresh, so there's nothing to redeploy.

## Editing rent amounts mid-lease

Changing `BaseRent` or `TaxRatePct` only affects collection entries saved *after* the change — past months already recorded in `Collections` keep the numbers that were true at the time, which is what you want for audit purposes.

## Security note

The shared secret is the only thing standing between "Anyone with the link" and your tenant/rent data, since Apps Script Web Apps don't support finer-grained auth for personal Google accounts. Treat the Web App URL + secret like a password: don't post them publicly. If you ever need to revoke access, delete the `SHARED_SECRET` script property (**Project Settings → Script properties** in the Apps Script editor) and re-run `setup()` to generate a new one, then reconnect the page with the new secret.

## Payroll: CRA remittances + paystubs

`payroll.html` is a second, standalone page (no Sheet, no Apps Script) that tracks
the source deductions you owe on each paycheque and prints a paystub for every pay
period. Open it directly, or at `payroll.html` on the same GitHub Pages site.

It's set up for a **Québec, biweekly, fixed-salary** employee starting
**2026-01-01**, with 26 pay dates running 2026-01-09 → 2026-12-25.

### What the page treats as known

Exactly one figure comes from the source screenshot: the **$2,310.00 biweekly
salary**. Everything the screenshot showed downstream of it — the income tax, the
contributions, the net pay — is treated as unverified and is either recomputed from
published rate tables or required as an input.

The statutory rates are the published 2026 tables, not values inferred from the
screenshot:

| | 2026 |
|---|---|
| QPP employee rate | 6.30% (5.30% base + 1.00% first additional) |
| QPP basic exemption / max pensionable | $3,500 / $74,600 |
| QPP2 employee rate / max pensionable | 4.00% on earnings $74,600–$85,000 |
| EI employee rate (**reduced Québec rate**) | 1.30%, max insurable $68,900 |
| EI employer | 1.4× employee (1.82%) |
| QPIP employee / employer | 0.430% / 0.602%, max insurable $103,000 |

A **rate self-check** in Settings confirms these agree with the published annual
maximums ($4,479.30 QPP, $416.00 QPP2, $895.70 EI, $442.90 QPIP). That checks the
rates are internally consistent — it can't tell you whether they're still current,
so re-check them each January.

### Two numbers you must supply

Income tax is **not calculated here**, and not guessed. It depends on the whole
TD1 / TP-1015.3-V picture rather than on a rate this page could apply:

- **Federal income tax** — from the CRA's **PDOC**.
- **Québec income tax** — from Revenu Québec's **WebRAS**. PDOC does not compute
  Québec provincial tax at all.

Both default to zero, and while they are zero the page says so **everywhere the
numbers are acted on** — a banner on the ledger, a "not supplied" mark on the
affected line, a "Partial" tag on every remittance bucket, a "Draft — not a final
paystub" notice on each stub, and a caveat appended to both CSV exports. A silent
zero in a remittance ledger reads as "nothing owed", which is how an
under-remittance happens.

Enter the salary you ran PDOC/WebRAS at alongside the amounts. If the salary later
changes, the ledger flags the tax figures as stale rather than quietly reusing them.

There's a third, optional input: the employer **Health Services Fund (FSS)**
contribution, whose rate depends on your total payroll and sector. It's excluded
from the totals until you enter a rate, and labelled as excluded. **CNESST** is an
insurance premium rather than a source deduction and isn't tracked here at all.

### Two remittances, not one

In Québec your source deductions split between two governments, and the page keeps
a separate ledger for each — including separate remitter frequencies, since the CRA
and Revenu Québec assign those independently.

| | Goes to | Per pay | 2026 total |
|---|---|---|---|
| Federal income tax | CRA | *you supply* | *you supply* |
| EI — employee | CRA | $30.03 | $780.78 |
| EI — employer (1.4×) | CRA | $42.04 | $1,093.04 |
| **CRA remittance** | **CRA** | **$72.07** + tax | **$1,873.82** + tax |
| Québec income tax | Revenu Québec | *you supply* | *you supply* |
| QPP — employee | Revenu Québec | $137.05 | $3,563.30 |
| QPP — employer (matched) | Revenu Québec | $137.05 | $3,563.30 |
| QPIP — employee | Revenu Québec | $9.93 | $258.18 |
| QPIP — employer | Revenu Québec | $13.91 | $361.66 |
| **RQ remittance** | **Revenu Québec** | **$297.94** + tax | **$7,746.44** + tax |

**QPP is not part of your CRA remittance** even though it comes off the same
paycheque — it goes to Revenu Québec along with Québec income tax and QPIP. Note
that the Revenu Québec side is the *larger* of the two.

As a regular remitter, each month's deductions are due the **15th of the following
month**, so January is due 2026-02-16 and December is due 2027-01-15. Due dates
roll forward off weekends; **statutory holidays are not in the table**, so check a
due date that lands on one. Tick "Remitted" as you pay each one — the marks are
stored in your browser, and the "Outstanding" figure covers both agencies.

### The rest

- **Paystubs** — one per pay period, current and year-to-date columns, employer
  contributions shown separately from deductions, and running QPP-pensionable /
  EI-insurable / QPIP-insurable totals. Print one or all.
- **Exports** — CSV of the remittance ledger (both agencies) and of all pay periods.
- **Pay frequency** — weekly, biweekly, semi-monthly or monthly. The period count
  follows the frequency, and pay dates stop at December 31, since deductions are
  reported in the tax year of the pay date.
- **Annual maximums** — QPP, QPP2, EI and QPIP ceilings all apply per period as YTD
  accumulates. At $60,060/year the salary is below all of them, so every pay is
  identical; raise it and contributions stop mid-year at exactly the right total.

### Auditing it

`.claude/agents/payroll-auditor.md` defines a `payroll-auditor` subagent that checks
this kind of work: agency routing, reconciliation to source, remittance bucketing
and due dates, ceiling behaviour, rounding, YTD integrity and disclosure of
defaulted-to-zero figures. It verifies by executing rather than reading, and it will
not invent a statutory rate to check against — an unverifiable rate is reported as a
finding rather than silently confirmed.

## Local development

`index.html` and `payroll.html` are single static files with no build step — open
them directly or serve them with any static file server. `index.html` talks to your
Apps Script Web App over `fetch`; `payroll.html` has no backend at all and keeps its
settings in the browser's local storage.
