#!/usr/bin/env node
// Autopilot visual capture + render check (used by proto-agent, dev-agent, qa-agent).
//
// One-time setup in the project (does not touch the app's own package.json):
//   npm install --no-save --prefix docs/pipeline playwright
//   npx --prefix docs/pipeline playwright install chromium
// (add docs/pipeline/node_modules to .gitignore)
//
// Run:  node docs/pipeline/templates/screenshot.mjs <config.mjs>
//
// config.mjs:
//   export default {
//     baseUrl: 'http://localhost:3000',            // or 'file:///abs/path/docs/mockups/index.html'
//     outDir:  'docs/pipeline/screens',
//     routes:  [{ path: '/dashboard', label: 'dashboard', waitFor: 'main' }],   // hash routes work: '#/dashboard'
//     login:   async (page) => { /* optional: sign in with a seeded demo account */ },
//     setTheme: async (page, scheme) => { /* optional: only if the app uses a toggle instead of prefers-color-scheme */ },
//     font:    'Noto Sans Thai',                    // optional: fails if this font did not actually load
//     viewports: [{ label: 'desktop', width: 1440, height: 900 }, { label: 'mobile', width: 390, height: 844 }],
//     schemes: ['light', 'dark'],
//     timeoutMs: 10000,
//   };
//
// Output: one PNG per route x viewport x theme, plus <outDir>/report.json and a summary table.
// Exit code: 0 = all rendered cleanly, 1 = hang / script error / console error / font not loaded, 2 = Playwright or Chromium missing.

import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const cfgArg = process.argv[2];
if (!cfgArg) { console.error('usage: node screenshot.mjs <config.mjs>'); process.exit(2); }
const cfg = (await import(pathToFileURL(path.resolve(cfgArg)).href)).default;

let chromium;
try { ({ chromium } = await import('playwright')); }
catch { console.error('Playwright is not installed. Run: npm install --no-save --prefix docs/pipeline playwright'); process.exit(2); }

const viewports = cfg.viewports ?? [{ label: 'desktop', width: 1440, height: 900 }, { label: 'mobile', width: 390, height: 844 }];
const schemes = cfg.schemes ?? ['light', 'dark'];
const timeout = cfg.timeoutMs ?? 10000;
const outDir = path.resolve(cfg.outDir ?? 'docs/pipeline/screens');
fs.mkdirSync(outDir, { recursive: true });

let browser;
const cloudChromium = process.env.PW_CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);   // cloud: pre-installed browser
try { browser = await chromium.launch(cloudChromium ? { executablePath: cloudChromium } : {}); }
catch (e) { console.error('Chromium is not available. Run: npx --prefix docs/pipeline playwright install chromium\n' + e.message); process.exit(2); }

const slug = (s) => String(s).replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'home';
const rows = [];

for (const scheme of schemes) {
  for (const vp of viewports) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, colorScheme: scheme });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

    try { if (cfg.login) await cfg.login(page); }
    catch (e) { errors.push('login failed: ' + e.message); }

    for (const r of cfg.routes) {
      const row = { route: r.path, label: r.label ?? slug(r.path), viewport: vp.label, theme: scheme, file: '', problems: [] };
      const before = errors.length;
      try {
        await page.goto(cfg.baseUrl + r.path, { waitUntil: 'load', timeout });
        if (cfg.setTheme) await cfg.setTheme(page, scheme);
        if (r.waitFor) await page.waitForSelector(r.waitFor, { timeout: 5000 }).catch(() => row.problems.push(`selector not found: ${r.waitFor}`));
        await page.waitForTimeout(300);
        // A runaway script blocks evaluate(); race it against a timer to detect a hang.
        const alive = await Promise.race([page.evaluate(() => document.readyState), new Promise((res) => setTimeout(() => res(null), 3000))]);
        if (!alive) row.problems.push('page hangs (script does not return)');
        else {
          const info = await page.evaluate(async (font) => {
            await document.fonts.ready;
            return {
              overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
              bodyFont: getComputedStyle(document.body).fontFamily,
              fontLoaded: font ? document.fonts.check(`16px "${font}"`) : true,
              textLength: document.body.innerText.trim().length,
            };
          }, cfg.font ?? null);
          row.bodyFont = info.bodyFont;
          if (info.overflowX) row.problems.push('horizontal overflow');
          if (!info.fontLoaded) row.problems.push(`font not loaded: ${cfg.font}`);
          if (info.textLength < 20) row.problems.push('page is (almost) empty');
          row.file = path.join(outDir, `${slug(row.label)}-${vp.label}-${scheme}.png`);
          await page.screenshot({ path: row.file, fullPage: true });
        }
      } catch (e) { row.problems.push('navigation failed: ' + e.message.split('\n')[0]); }
      row.problems.push(...errors.slice(before));
      rows.push(row);
    }
    await ctx.close();
  }
}
await browser.close();

fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(rows, null, 2));
console.log('route | viewport | theme | result');
for (const r of rows) console.log(`${r.label} | ${r.viewport} | ${r.theme} | ${r.problems.length ? r.problems.join('; ') : 'ok'} ${r.file ? '-> ' + path.relative(process.cwd(), r.file) : ''}`);
const hard = rows.filter((r) => r.problems.some((p) => !p.startsWith('horizontal overflow')));
console.log(`\n${rows.length} captures, ${hard.length} with errors, ${rows.filter((r) => r.problems.includes('horizontal overflow')).length} with horizontal overflow`);
process.exit(hard.length ? 1 : 0);
