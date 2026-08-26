# Rent Ledger

A mobile-friendly rent collection tracker. The page (hosted on GitHub Pages) is
just the front end — all data lives in a Google Sheet, read and written
through a small Apps Script Web App. Add or edit tenants directly in the
Sheet and the page picks it up automatically. Each tenant card has a **Save**
button — nothing is sent to the Sheet until you tap it. The `Collections` tab
keeps exactly one row per tenant per month: saving again the same month
updates that row in place, while past months are never touched — that's your
audit trail.

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

## Upgrading from an older version (duplicate rows in Collections)

Earlier versions saved automatically on every keystroke and always *appended*
to `Collections`, so a single entry could leave many near-identical rows. To
upgrade an existing Sheet:

1. Open **Extensions → Apps Script** in your Sheet and replace the code with
   the current [`apps-script/Code.gs`](apps-script/Code.gs).
2. Click **Deploy → Manage deployments**, edit the existing deployment
   (pencil icon), set **Version** to **New version**, and click **Deploy**.
   (The Web App URL stays the same — no need to reconnect the page.)
3. In the function dropdown, choose **`dedupeCollections`** and click **Run**.
   This one-time cleanup keeps the newest row per tenant per month and deletes
   the rest — check **View → Logs** for a summary of what was removed.

From then on, saving from the page updates the existing row for that tenant
and month instead of appending a new one.

## Adding or editing tenants

Just edit the **Tenants** tab of the Sheet directly — add a row for a new tenant, change a rent amount, flip `Active` to `FALSE` for a move-out. The page always reads the Sheet fresh, so there's nothing to redeploy.

## Editing rent amounts mid-lease

Changing `BaseRent` or `TaxRatePct` only affects collection entries saved *after* the change — past months already recorded in `Collections` keep the numbers that were true at the time, which is what you want for audit purposes.

## Security note

The shared secret is the only thing standing between "Anyone with the link" and your tenant/rent data, since Apps Script Web Apps don't support finer-grained auth for personal Google accounts. Treat the Web App URL + secret like a password: don't post them publicly. If you ever need to revoke access, delete the `SHARED_SECRET` script property (**Project Settings → Script properties** in the Apps Script editor) and re-run `setup()` to generate a new one, then reconnect the page with the new secret.

## Local development

`index.html` is a single static file with no build step — open it directly or serve it with any static file server. It talks to your Apps Script Web App over `fetch`; there's no other backend.
