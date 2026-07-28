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
**2026-01-01**, seeded from the CRA Payroll Deductions Online Calculator (PDOC)
result for the 2026-02-20 pay: $2,310.00 salary, federal TD1 $16,452.00 →
federal tax $170.66, QPP $137.05, EI $30.03, net $1,972.26. The **Source check**
table at the bottom of Settings recomputes that pay and compares it to PDOC line
by line, so you can see the engine still reproduces your source figures after any
change.

### Two remittances, not one

In Québec your source deductions split between two governments, and the page keeps
a separate ledger for each:

| | Goes to | Per pay | 2026 total |
|---|---|---|---|
| Federal income tax | CRA | $170.66 | $4,437.16 |
| EI — employee | CRA | $30.03 | $780.78 |
| EI — employer (1.4×) | CRA | $42.04 | $1,093.04 |
| **CRA remittance** | **CRA** | **$242.73** | **$6,310.98** |
| QPP — employee | Revenu Québec | $137.05 | $3,563.30 |
| QPP — employer (matched) | Revenu Québec | $137.05 | $3,563.30 |
| Québec income tax | Revenu Québec | see below | — |

**QPP is not part of your CRA remittance** even though it comes off the same
paycheque — it goes to Revenu Québec along with Québec income tax and QPIP.

Pay dates run every 14 days from **2026-01-09** to **2026-12-25** — 26 in the
year, with three pay dates landing in May and October. As a regular remitter,
each month's deductions are due the **15th of the following month** (rolled to
the Monday when the 15th is a weekend), so January's $485.46 is due 2026-02-16
and December's is due 2027-01-15. Tick **Remitted** as you pay each one; the
marks are stored in your browser.

### Two numbers you have to supply

PDOC doesn't produce either of these, so they default to zero rather than to a
guess — the page would otherwise understate what you owe Revenu Québec:

- **Québec income tax** — PDOC shows `N/A` for the provincial TD1 and $0.00 for
  provincial tax because Québec tax is calculated with Revenu Québec's **WebRAS**,
  not PDOC. Run WebRAS for the same salary and enter the per-period amount in Settings.
- **QPIP (RQAP)** — not shown on the PDOC output at all. Enter the current employee
  and employer rates in Settings to have it flow into the provincial remittance and
  onto the paystubs.

The CRA side is complete and correct without either of them.

### The rest

- **Paystubs** — one per pay period, with current and year-to-date columns,
  employer contributions, and running QPP-pensionable / EI-insurable totals.
  Print one, or print all 26 (each starts a new page).
- **Exports** — CSV of the remittance ledger and of all 26 pay periods.
- **Annual maximums** — the QPP and EI ceilings are editable. At $60,060/year the
  salary is below both, so every pay is identical; raise the salary and
  contributions correctly stop mid-year at the maximum.
- **Rates change every year.** The statutory rates and ceilings in Settings are
  the ones that reproduce your 2026 PDOC result. Re-run PDOC each January and
  update them before relying on the numbers for a new tax year.

## Local development

`index.html` and `payroll.html` are single static files with no build step — open
them directly or serve them with any static file server. `index.html` talks to your
Apps Script Web App over `fetch`; `payroll.html` has no backend at all and keeps its
settings in the browser's local storage.
