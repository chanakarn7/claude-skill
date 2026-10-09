#!/usr/bin/env node
// Autopilot design + prototype consistency check (no LLM, no dependencies).
// Used by designer-agent and proto-agent before finishing, by the PM before Gate V, and by reviewer-agent as evidence.
//
// Run:  node docs/pipeline/templates/check-design.mjs [projectRoot=.] [BASE=docs]
//
// Reads <BASE>/PRD.md, <BASE>/UXUI_DESIGN.md and (if present) <BASE>/mockups/index.html + <BASE>/mockups/screens/.
// Conventions it relies on (documented in designer-agent.md / proto-agent.md):
//   UXUI_DESIGN.md  "## Contrast pairs"  lines:  - <name>: #fg on #bg (light|dark) = <ratio>:1 [large|ui]
//   UXUI_DESIGN.md  "Screens" table (heading containing "Screens"): | screen-id | title | US-xx, US-yy | priority |
//                   optional line:  Not on a screen: US-xx (reason)
//   index.html      every screen root carries  data-screen="<screen-id>"
//   screenshots     docs/mockups/screens/<screen-id>-<desktop|mobile>-<light|dark>.png (screenshot.mjs labels = screen ids)
// Errors (exit 1): contrast below WCAG AA or stated ratio wrong; PRD story on no screen; screen missing in the prototype;
//   prototype hex colors that are not in the design doc (#fff/#000 allowed); hash links to nowhere; no screenshots for a screen.
// Warnings: missing dark/mobile variants, dead "#" links, unexpected external hosts. Exit 2 = nothing to check.

import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || '.');
const base = process.argv[3] || 'docs';
const read = (p) => { const f = path.join(root, p); return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null; };
const design = read(`${base}/UXUI_DESIGN.md`);
const prd = read(`${base}/PRD.md`);
if (!design) { console.error(`nothing to check: no ${base}/UXUI_DESIGN.md`); process.exit(2); }

const errors = [], warns = [];
const hex6 = (h) => { h = h.replace('#', '').toLowerCase(); return h.length === 3 ? [...h].map((c) => c + c).join('') : h; };
const lum = (h) => { const v = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

// ---- palette and contrast
const palette = new Set((design.match(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g) || []).map(hex6));
const cm = design.match(/^#{1,4}\s*(?:\d+\.?\s*)?Contrast pairs[^\n]*\n([\s\S]*?)(?=^#{1,4}\s|(?![\s\S]))/im);
if (!cm) errors.push('no "Contrast pairs" section in UXUI_DESIGN.md (list every text/background pair with its computed ratio)');
else {
  let n = 0;
  for (const m of cm[1].matchAll(/^[-*]\s*([^:\n]+):\s*(#[0-9a-fA-F]{3,6})\s+on\s+(#[0-9a-fA-F]{3,6})[^=\n]*=\s*([\d.]+)\s*:\s*1([^\n]*)/gim)) {
    n++;
    const [, name, fg, bg, stated, rest] = m;
    const real = ratio(hex6(fg), hex6(bg));
    const need = /large|ui/i.test(rest) ? 3 : 4.5;
    if (real + 0.005 < need) errors.push(`contrast "${name.trim()}": ${fg} on ${bg} is ${real.toFixed(2)}:1, needs ${need}:1`);
    else if (Math.abs(real - parseFloat(stated)) > 0.15) errors.push(`contrast "${name.trim()}": stated ${stated}:1 but computed ${real.toFixed(2)}:1`);
  }
  if (n < 4) errors.push(`"Contrast pairs" lists ${n} parsable pair(s); expected at least 4 (text, muted text, primary button, link/accent, in each theme)`);
}

// ---- screens table
const sm = design.match(/^#{1,4}[^\n]*Screens[^\n]*\n([\s\S]*?)(?=^#{1,3}\s|(?![\s\S]))/im);
const screens = [];
const covered = new Set();
if (!sm) errors.push('no "Screens" section in UXUI_DESIGN.md');
else {
  for (const line of sm[1].split('\n')) {
    const c = line.split('|').map((x) => x.trim());
    if (c.length < 4 || /^-+$/.test(c[1] || '') || /screen|id/i.test(c[1] || '') && /stor/i.test(line)) continue;
    const id = (c[1] || '').replace(/`/g, '');
    const us = line.match(/\bUS-\d+\b/g) || [];
    if (/^[a-z0-9][a-z0-9-_]*$/.test(id) && us.length) { screens.push(id); us.forEach((u) => covered.add(u)); }
  }
  for (const m of sm[1].matchAll(/Not on a screen:([^\n]*)/gi)) (m[1].match(/\bUS-\d+\b/g) || []).forEach((u) => covered.add(u));
  if (!screens.length) errors.push('the Screens section has no parsable table rows (| screen-id | title | US-xx | priority |)');
}
if (prd && screens.length) {
  const stories = new Set(prd.match(/\bUS-\d+\b/g) || []);
  for (const u of [...stories].sort()) if (!covered.has(u)) errors.push(`${u}: appears on no screen (add it to a Screens row or list it under "Not on a screen:")`);
}

// ---- prototype
const proto = read(`${base}/mockups/index.html`);
if (proto) {
  const attrs = (proto.match(/data-screen\s*=\s*["']([^"']+)["']/g) || []).map((s) => s.replace(/.*=\s*["']|["']/g, ''));
  const have = new Set(attrs);
  for (const id of screens) if (!have.has(id)) errors.push(`screen "${id}" has no data-screen="${id}" element in the prototype`);
  const ids = new Set([...(proto.match(/\sid\s*=\s*["']([^"']+)["']/g) || []).map((s) => s.replace(/.*=\s*["']|["']/g, '')), ...have]);
  for (const m of proto.matchAll(/href\s*=\s*["']#([^"']*)["']/g)) {
    const t = m[1].replace(/^\//, '');
    if (t === '') warns.push('dead link href="#" in the prototype');
    else if (!ids.has(t) && !ids.has(m[1])) errors.push(`link to "#${m[1]}" has no matching id/data-screen`);
  }
  const stripped = proto.replace(/\b(?:href|id|for|name|data-[\w-]+)\s*=\s*["'][^"']*["']/g, '');
  const used = new Set((stripped.match(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g) || []).map(hex6));
  const off = [...used].filter((h) => !palette.has(h) && h !== 'ffffff' && h !== '000000');
  if (off.length) errors.push(`${off.length} color(s) in the prototype are not in the design doc: ${off.slice(0, 8).map((h) => '#' + h).join(', ')}${off.length > 8 ? ' …' : ''}`);
  const hosts = new Set([...proto.matchAll(/(?:src|href)\s*=\s*["']https?:\/\/([^/"']+)/g)].map((m) => m[1]));
  const okHosts = /^(fonts\.googleapis\.com|fonts\.gstatic\.com|cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|unpkg\.com)$/;
  for (const h of hosts) if (!okHosts.test(h)) warns.push(`unexpected external host in the prototype: ${h}`);

  // ---- screenshots
  const dir = path.join(root, base, 'mockups/screens');
  const files = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
  const dark = /\bdark\b/i.test(design) && !/single-theme|ธีมเดียว/i.test(design);
  for (const id of screens) {
    const mine = files.filter((f) => f.startsWith(`${id}-`));
    if (!mine.length) { errors.push(`no screenshot for screen "${id}" in ${base}/mockups/screens/`); continue; }
    for (const v of ['desktop', 'mobile']) if (!mine.some((f) => f.includes(`-${v}-`) || f.includes(`-${v}.`))) warns.push(`screen "${id}": no ${v} screenshot`);
    if (dark && !mine.some((f) => f.includes('dark'))) warns.push(`screen "${id}": no dark-theme screenshot`);
  }
} else warns.push('no prototype yet (docs/mockups/index.html): design checks only');

for (const w of warns) console.log(`- warn: ${w}`);
for (const e of errors) console.log(`- error: ${e}`);
if (errors.length) { console.log(`\n${errors.length} error(s), ${warns.length} warning(s)`); process.exit(1); }
console.log(`design ok: ${screens.length} screens, ${palette.size} palette colors, ${warns.length} warning(s)`);
