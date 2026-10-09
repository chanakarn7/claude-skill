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
// Checks per capture (no LLM): hang, script/console errors, missing font, empty page, horizontal overflow (warning-level),
//   overlapping elements (partial overlap of text/controls; fully contained things such as an icon inside an input are fine),
//   clipped text, and as warnings: text under 12px, tap targets under 44px on mobile.
//   Intentional overlaps (avatar stacks, decorative layers): put data-allow-overlap on the element or an ancestor.
//   position:fixed / sticky elements (banners, floating switchers) are ignored.
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
const sysChromium = process.env.PW_CHROMIUM_PATH;   // optional: use an installed Chrome/Chromium instead of downloading one
try { browser = await chromium.launch(sysChromium ? { executablePath: sysChromium } : {}); }
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
      const row = { route: r.path, label: r.label ?? slug(r.path), viewport: vp.label, theme: scheme, file: '', problems: [], warnings: [] };
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

          // Layout audit (no LLM): the things a reviewer used to catch only by looking at the image.
          const audit = await page.evaluate((mobile) => {
            const CAP = 8;
            const vis = (el) => { const s = getComputedStyle(el); if (s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.opacity) === 0) return false; const r = el.getBoundingClientRect(); return r.width > 1 && r.height > 1; };
            const name = (el) => { const t = (el.innerText || el.value || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 24); const c = typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/)[0] : ''; return `<${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${c}>${t ? ` "${t}"` : ''}`; };
            const ownText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
            const control = (el) => /^(BUTTON|A|INPUT|SELECT|TEXTAREA|IMG|SVG)$/i.test(el.tagName) || el.getAttribute('role') === 'button';
            const exempt = (el) => { for (let e = el; e && e !== document.documentElement; e = e.parentElement) { if (e.hasAttribute && e.hasAttribute('data-allow-overlap')) return true; const p = getComputedStyle(e).position; if (p === 'fixed' || p === 'sticky') return true; } return false; };
            const box = (el) => {   // text blocks: the box of the text itself, not the full-width element
              if (ownText(el) && !control(el)) {
                const rg = document.createRange(); let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
                for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.trim()) { rg.selectNodeContents(n); for (const q of rg.getClientRects()) { if (q.width < 1 || q.height < 1) continue; l = Math.min(l, q.left); t = Math.min(t, q.top); r = Math.max(r, q.right); b = Math.max(b, q.bottom); } }
                if (l < Infinity) return { l, t, r, b };
              }
              const q = el.getBoundingClientRect(); return { l: q.left, t: q.top, r: q.right, b: q.bottom };
            };
            const cands = [...document.body.querySelectorAll('*')].filter((el) => vis(el) && (ownText(el) || control(el)) && !exempt(el)).slice(0, 1500);
            const boxes = cands.map(box);
            const overlaps = [], clipped = [], small = [], tiny = [];
            for (let i = 0; i < cands.length && overlaps.length < CAP; i++) for (let j = i + 1; j < cands.length && overlaps.length < CAP; j++) {
              const a = cands[i], c = cands[j];
              if (a.contains(c) || c.contains(a)) continue;
              const A = boxes[i], B = boxes[j];
              const w = Math.min(A.r, B.r) - Math.max(A.l, B.l), h = Math.min(A.b, B.b) - Math.max(A.t, B.t);
              if (w <= 2 || h <= 2) continue;
              const inter = w * h, minArea = Math.min((A.r - A.l) * (A.b - A.t), (B.r - B.l) * (B.b - B.t));
              if (minArea <= 0 || inter / minArea < 0.15 || inter / minArea >= 0.9) continue;   // fully contained = intentional (icon in input, badge on card)
              overlaps.push(`${name(a)} overlaps ${name(c)} (${Math.round((inter / minArea) * 100)}% of the smaller)`);
            }
            for (const el of cands) {
              const s = getComputedStyle(el);
              if (ownText(el) && clipped.length < CAP) {
                const hx = /hidden|clip/.test(s.overflowX) && el.scrollWidth > el.clientWidth + 1 && s.textOverflow !== 'ellipsis';
                const hy = /hidden|clip/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 1 && !(s.webkitLineClamp && s.webkitLineClamp !== 'none');
                if (hx || hy) clipped.push(`${name(el)} text is cut off`);
              }
              if (ownText(el) && parseFloat(s.fontSize) < 12) small.push(name(el));
              if (mobile && /^(BUTTON|A|INPUT|SELECT)$/i.test(el.tagName) && s.display !== 'inline') { const q = el.getBoundingClientRect(); if (q.width < 44 || q.height < 44) tiny.push(name(el)); }
            }
            return { overlaps, clipped, small: small.length, smallEx: small.slice(0, 3), tiny: tiny.length, tinyEx: tiny.slice(0, 3) };
          }, vp.width < 768);
          for (const o of audit.overlaps) row.problems.push('overlap: ' + o);
          for (const c of audit.clipped) row.problems.push('clipped: ' + c);
          if (audit.small) row.warnings.push(`${audit.small} text element(s) under 12px, e.g. ${audit.smallEx.join(', ')}`);
          if (audit.tiny) row.warnings.push(`${audit.tiny} tap target(s) under 44px, e.g. ${audit.tinyEx.join(', ')}`);
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
for (const r of rows) console.log(`${r.label} | ${r.viewport} | ${r.theme} | ${r.problems.length ? r.problems.join('; ') : 'ok'}${r.warnings.length ? ' [warn: ' + r.warnings.join('; ') + ']' : ''} ${r.file ? '-> ' + path.relative(process.cwd(), r.file) : ''}`);
const hard = rows.filter((r) => r.problems.some((p) => !p.startsWith('horizontal overflow')));
console.log(`\n${rows.length} captures, ${hard.length} with errors, ${rows.filter((r) => r.problems.includes('horizontal overflow')).length} with horizontal overflow, ${rows.filter((r) => r.warnings.length).length} with warnings (small text / small tap targets)`);
process.exit(hard.length ? 1 : 0);
