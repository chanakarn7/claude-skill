#!/usr/bin/env node
// Autopilot review snapshot (no LLM, no dependencies): makes round 2 of a gate review a real diff review.
//
// Run:  node docs/pipeline/templates/review-snapshot.mjs save <1|B|V> [projectRoot=.] [--base docs/modules/x]
//       (the PM runs it BEFORE it returns a gate's work to its owner)
//       node docs/pipeline/templates/review-snapshot.mjs diff <1|B|V> [projectRoot=.] [--base docs/modules/x]
//       (the PM runs it AFTER the return, then gives the printed .diff path to the reviewer as `diff:`)
//
// save: copies the files the reviewer looks at for that gate to docs/pipeline/snapshots/G<gate>/ (paths kept).
// diff: compares them with the current files, writes docs/pipeline/snapshots/G<gate>.diff (unified diff, readable without a
//   shell) and prints a summary. Exit 0 = something changed, 2 = nothing changed (reuse the last verdict), 1 = no snapshot.
// Files per gate (BASE = docs, or the module folder in program mode):
//   1: BASE/PRD.md, docs/DECISIONS.md
//   B: BASE/SA_BLUEPRINT.md, docs/STACK.md, docs/contracts/*, docs/pipeline/PRD_AMENDMENTS.md, BASE/PRD.md
//   V: BASE/UXUI_DESIGN.md, BASE/DESIGN_OPTIONS.md, BASE/PRD.md, BASE/mockups/**/*.html

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const [mode, gateRaw] = args;
const rest = args.slice(2).filter((a, i, all) => !a.startsWith('--') && all[i - 1] !== '--base');
const root = path.resolve(rest[0] || '.');
const base = (flag('--base') || 'docs').replace(/\/+$/, '');
const gate = String(gateRaw || '').toUpperCase();
if (!['save', 'diff'].includes(mode) || !['1', 'B', 'V'].includes(gate)) {
  console.error('usage: review-snapshot.mjs <save|diff> <1|B|V> [projectRoot] [--base docs/modules/x]');
  process.exit(1);
}
const snapDir = path.join(root, 'docs/pipeline/snapshots', `G${gate}`);
const diffFile = path.join(root, 'docs/pipeline/snapshots', `G${gate}.diff`);

const walk = (dir, re) => {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs, { withFileTypes: true }).flatMap((e) => {
    const rel = path.join(dir, e.name);
    return e.isDirectory() ? (e.name === 'screens' ? [] : walk(rel, re)) : re.test(e.name) ? [rel] : [];
  });
};
const files = () => [...new Set({
  1: [`${base}/PRD.md`, 'docs/DECISIONS.md'],
  B: [`${base}/SA_BLUEPRINT.md`, 'docs/STACK.md', ...walk('docs/contracts', /./), 'docs/pipeline/PRD_AMENDMENTS.md', `${base}/PRD.md`],
  V: [`${base}/UXUI_DESIGN.md`, `${base}/DESIGN_OPTIONS.md`, `${base}/PRD.md`, ...walk(`${base}/mockups`, /\.html$/)],
}[gate])];

if (mode === 'save') {
  fs.rmSync(snapDir, { recursive: true, force: true });
  let n = 0;
  for (const f of files()) {
    const src = path.join(root, f);
    if (!fs.existsSync(src)) continue;
    fs.mkdirSync(path.dirname(path.join(snapDir, f)), { recursive: true });
    fs.copyFileSync(src, path.join(snapDir, f));
    n++;
  }
  fs.rmSync(diffFile, { force: true });
  console.log(`snapshot G${gate}: ${n} file(s) saved to docs/pipeline/snapshots/G${gate}/`);
  process.exit(0);
}

if (!fs.existsSync(snapDir)) { console.error(`no snapshot for gate ${gate}: run "save" before the return`); process.exit(1); }
const all = [...new Set([...files(), ...walk(path.relative(root, snapDir), /./).map((p) => path.relative(path.join('docs/pipeline/snapshots', `G${gate}`), p))])];
let out = '', changed = 0, same = 0;
for (const f of all) {
  const old = path.join(snapDir, f), cur = path.join(root, f);
  const a = fs.existsSync(old), b = fs.existsSync(cur);
  if (!a && !b) continue;
  if (a && b && fs.readFileSync(old).equals(fs.readFileSync(cur))) { same++; continue; }
  changed++;
  if (a && b) {
    try { execFileSync('diff', ['-u', '--label', `before/${f}`, '--label', `after/${f}`, old, cur], { encoding: 'utf8' }); }
    catch (e) { out += (e.stdout || `(diff unavailable for ${f})\n`) + '\n'; }
  } else out += `--- ${a ? 'before/' + f : '/dev/null'}\n+++ ${b ? 'after/' + f : '/dev/null'}\n(file ${b ? 'added' : 'removed'} since the snapshot)\n\n`;
}
fs.writeFileSync(diffFile, out || '(no differences)\n');
console.log(`diff G${gate}: ${changed} file(s) changed, ${same} unchanged -> ${path.relative(root, diffFile)} (${out.split('\n').length - 1} lines)`);
process.exit(changed ? 0 : 2);
