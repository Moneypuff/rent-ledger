# tools

Everything under here regenerates the payroll documents. `payroll.html` is the
source of truth: it holds the engine, and these scripts read figures out of it
rather than keeping their own copy, so a number can never be right on one page
and stale on another.

## Regenerating everything

```sh
node tools/verify.js                  # 108 checks against the engine
node tools/dump.js                    # payroll.html engine  -> tools/data.json
node tools/build-stubs.js             # data.json -> payroll-2026-paystubs.html
node tools/build-artifact.js          # data.json -> payroll-2026-remittances.html
node tools/render-pdf.js              # paystubs page -> payroll-2026-paystubs.pdf
```

Run `dump.js` after any change to `payroll.html` — the two document pages are
built from its output, so they will otherwise keep the previous figures.

## What each script does

| Script | Purpose |
|---|---|
| `verify.js` | Extracts the `<script>` block from `payroll.html` and runs the **real engine** under a DOM shim. Checks the accountant reconciliation, the schedule, the restatement and arrears recovery, remittance bucketing and due dates, ceiling behaviour, YTD integrity, and that the schedule is identical across five timezones. Exits non-zero on failure. |
| `dump.js` | Runs the engine and writes every per-period, per-month and annual figure to `data.json`. |
| `build-stubs.js` | Builds the 26-stub paystub set. Holds the employer and employee details at the top. |
| `build-artifact.js` | Builds the remittance schedule page. |
| `render-pdf.js` | Renders a page to PDF with Chromium, one stub per page. Fails if the embedded fonts did not load, so a fallback typeface cannot slip into the PDF unnoticed. |

## Changing names or addresses

Employer and employee details live at the top of `build-stubs.js`:

```js
const EMPLOYER = { name: '9134-5777 Québec Inc.', addr: '10624 boul. Lévesque E, Laval, Québec H7A 4C6' };
const EMPLOYEE = 'Dieu-Quan Ly';
```

The same values are defaults in `payroll.html` (`DEFAULTS.employerName`,
`employerAddress`, `employeeName`) for the interactive app. Change both, then
rebuild.

## Fonts

`fonts/` holds IBM Plex Serif and IBM Plex Mono, subset to the glyphs these
documents use and converted to `woff2` — about 42 KB for four faces, against
~590 KB for the full TTFs. `fonts.css` is the generated `@font-face` block with
each face inlined as a data URI.

They are inlined rather than linked for two reasons: a font CDN is blocked by
the artifact CSP and would fall back to a system face *silently*, and inlining
is what makes the PDF render in the same typefaces as the screen.

To re-subset after adding characters the current set does not cover (the range
is Latin-1 plus a handful of symbols — `† • · → × ¢` and the dashes):

```sh
pip install fonttools brotli
python3 -m fontTools.subset SOURCE.ttf \
  --unicodes="U+0020-007E,U+00A0-00FF,U+2013,U+2014,U+2018,U+2019,U+201C,U+201D,U+2020,U+2022,U+00B7,U+2192,U+00D7,U+00A2,U+2011" \
  --layout-features="kern,liga,tnum,onum,frac" \
  --flavor=woff2 --output-file=tools/fonts/NAME.woff2 --no-hinting --desubroutinize
```

Then rebuild `fonts.css` from the four `woff2` files as base64 data URIs.

## Auditing

`.claude/agents/payroll-auditor.md` defines a `payroll-auditor` subagent that
reviews this kind of work: agency routing, reconciliation to source, remittance
bucketing and due dates, ceiling behaviour, rounding, YTD integrity, and the
disclosure of figures defaulted to zero. It verifies by executing rather than
reading, and reports an unverifiable statutory rate as a finding instead of
substituting a remembered one.
