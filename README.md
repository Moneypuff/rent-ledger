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

A row shows up on the page once it has a **Name** or a **BaseRent**, so the
blank seeded rows stay out of the way until you fill one in. **Type** is
forgiving — anything starting with "comm" is treated as commercial, anything
else (including a blank cell) as residential — and **Active** only hides a
tenant when it's explicitly `FALSE`/`NO`/`0`.

### A tenant isn't showing up (no box to enter rent collected)

Every tenant card carries its own "Amount collected ($)" box, so a missing box
means the card itself isn't rendering. Check, in order:

1. The row has a **Name** or a **BaseRent** — a row with only a Unit is treated as an empty placeholder.
2. **Active** isn't set to `FALSE`.
3. You're on the **Collect** tab and have tapped refresh (⟳) since editing the Sheet.
4. You're editing the **Tenants** tab of the same Sheet the Apps Script is bound to.

If you set this up before this change landed, re-paste
[`apps-script/Code.gs`](apps-script/Code.gs) into the Apps Script editor and
redeploy — **Deploy → Manage deployments → ✏️ edit → Version: New version →
Deploy**. Keep the same deployment so your Web App URL and secret don't change.

## How saving works (and why Collections used to repeat itself)

Editing a card doesn't write immediately. Changes are held until you leave the
card — tap another tenant, dismiss the keyboard, or switch away from the page —
and then written as **one** row. A save is also skipped entirely when nothing
actually changed, so opening the page and tabbing through cards appends
nothing.

The backend enforces the same rule independently: a save that lands within 30
minutes of the previous one for the same tenant and month **overwrites** that
row instead of adding another, and a save identical to what's already stored
writes nothing at all. So a stale browser tab on another device can't
reintroduce duplicates either. Saves in a later session, or for a different
month, still append as normal — month-to-month history is untouched.

This matters because earlier versions saved on every field change and on every
pause while typing a comment, so one tenant could produce seven rows in a
single sitting. The app was never confused — it always reads the newest row
per tenant-month — but the tab was miserable to read.

### Cleaning up duplicates already in the Sheet

Open the Apps Script editor, choose **`dedupeCollections`** in the function
dropdown, click **Run**, then check **View → Logs** for the count. For each
tenant-month it keeps the newest row — the one the app already treats as
current, holding your final corrections — and **deletes** the rest.

This is destructive and can't be undone from the app, so take
**File → Make a copy** first. Running it twice is harmless; the second run
reports nothing to do.

## Editing rent amounts mid-lease

Changing `BaseRent` or `TaxRatePct` only affects collection entries saved *after* the change — past months already recorded in `Collections` keep the numbers that were true at the time, which is what you want for audit purposes.

## Security note

The shared secret is the only thing standing between "Anyone with the link" and your tenant/rent data, since Apps Script Web Apps don't support finer-grained auth for personal Google accounts. Treat the Web App URL + secret like a password: don't post them publicly. If you ever need to revoke access, delete the `SHARED_SECRET` script property (**Project Settings → Script properties** in the Apps Script editor) and re-run `setup()` to generate a new one, then reconnect the page with the new secret.

## Local development

`index.html` is a single static file with no build step — open it directly or serve it with any static file server. It talks to your Apps Script Web App over `fetch`; there's no other backend.
