/**
 * Renders a generated document page to PDF with Chromium, one paystub per page.
 *
 *   node tools/render-pdf.js                                  # paystubs -> PDF
 *   node tools/render-pdf.js payroll-2026-remittances.html    # any page
 *
 * Waits for the inlined @font-face faces to finish loading and fails loudly if
 * they did not — a silent fallback would produce a PDF in the wrong typeface
 * that still looks plausible.
 */
'use strict';
const path = require('path');
const fs = require('fs');

const REPO = path.join(__dirname, '..');
const input = process.argv[2] || 'payroll-2026-paystubs.html';
const src = path.resolve(REPO, input);
const out = src.replace(/\.html$/, '.pdf');

if (!fs.existsSync(src)) {
  console.error(`No such page: ${src}`);
  process.exit(1);
}

/* Playwright lives with the global toolchain in this environment; fall back to
   a local install so the script also works from a plain checkout. */
function loadChromium() {
  for (const id of ['playwright', '/opt/node22/lib/node_modules/playwright']) {
    try { return require(id).chromium; } catch (e) { /* try the next */ }
  }
  console.error('Playwright not found. Install it with:  npm i -D playwright');
  process.exit(1);
}

(async () => {
  const browser = await loadChromium().launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  await page.goto('file://' + src, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  const families = await page.evaluate(() =>
    ['Plex Serif', 'Plex Mono'].filter(f => !document.fonts.check('16px "' + f + '"')));
  if (families.length) {
    console.error('Embedded fonts failed to load: ' + families.join(', '));
    await browser.close();
    process.exit(1);
  }

  await page.pdf({ path: out, format: 'Letter', printBackground: true, preferCSSPageSize: true });
  await browser.close();

  if (errors.length) { console.error('Page errors:\n' + errors.join('\n')); process.exit(1); }

  const bytes = fs.statSync(out).size;
  const pages = (fs.readFileSync(out).toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
  console.log(`${path.relative(REPO, out)} — ${pages} pages, ${Math.round(bytes / 1024)} KB`);
})();
