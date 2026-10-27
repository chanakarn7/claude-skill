#!/usr/bin/env node
// Autopilot UI-kit installer (no LLM, no dependencies): copies a kit into the project the same way every time.
// Used by dev-agent (stage 5, right after scaffolding) and by a person who runs the pipeline by hand.
//
// Run:  node docs/pipeline/templates/install-kit.mjs [projectRoot=.] [--target apps/web] [--update] [--force] [--dry-run] [--install]
//   --target   folder of the web app inside the project (default: the manifest's `target`, else the project root)
//   --update   re-copy kit files that changed in the kit, but only where the project copy is still the one this installer wrote
//              (docs/kit.lock records a hash per file); locally edited kit files are listed as conflicts and left alone
//   --force    overwrite everything the manifest lists (use on a fresh scaffold only)
//   --dry-run  print the plan, write nothing
//   --install  run `npm install` for the manifest's dependencies in the target
//
// Reads docs/pipeline/kit.json (written by resolve-kit.mjs, or by the kit-agent after discovery). Manifest fields used:
//   source.path            where the kit lives
//   target                 default web app folder
//   copy: [{ from, to, overwrite? }]   files or folders, relative to the kit and to the target; `overwrite: true` replaces scaffold defaults
//                                      (tailwind.config.ts, globals.css, ...)
//   generated: [{ to, content }]       files written when missing (for example the root layout from the kit's setup guide)
//   brand: { file, template }          template with {{COLORS}}, replaced by the CI hexes of docs/IDEA.md (สีหลัก / สีรอง / สีตกแต่ง)
//   dependencies, devDependencies      package names (or name@range) for the target
//   exclude                            extra path fragments to skip (node_modules, .next, .DS_Store are always skipped)
// Writes docs/kit.lock { name, source{commit,dirty,ref,git}, target, installedAt, files{ path: sha256 } }.
// Exit code: 0 = ok (conflicts are reported, not failures), 1 = cannot install.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const has = (n) => args.includes(n);
const root = path.resolve(args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--target') || '.');
const read = (p) => { try { return fs.readFileSync(p, 'utf8'); } catch { return null; } };
const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const fail = (m) => { console.error('install-kit: ' + m); process.exit(1); };

const manifest = (() => { try { return JSON.parse(read(path.join(root, 'docs/pipeline/kit.json')) || 'null'); } catch { return null; } })();
if (!manifest) fail('no docs/pipeline/kit.json (run resolve-kit.mjs first)');
if (!['resolved', 'discovered'].includes(manifest.status)) fail(`kit manifest status is "${manifest.status}"${manifest.status === 'needs-discovery' ? ': the kit-agent must write the manifest first' : manifest.error ? ': ' + manifest.error : ''}`);
const kitDir = manifest.source && manifest.source.path;
if (!kitDir || !fs.existsSync(kitDir)) fail(`kit folder not found: ${kitDir} (run resolve-kit.mjs again)`);

const target = flag('--target') || manifest.target || '.';
const dest = path.join(root, target);
const lockFile = path.join(root, 'docs/kit.lock');
const lock = (() => { try { return JSON.parse(read(lockFile) || 'null'); } catch { return null; } })();
const SKIP = new Set(['node_modules', '.next', '.git', '.DS_Store', ...(manifest.exclude || [])]);
const update = has('--update'), force = has('--force'), dry = has('--dry-run');

const walk = (d, rel = '') => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
  if (SKIP.has(e.name) || (manifest.exclude || []).some((x) => path.join(rel, e.name).includes(x))) return [];
  const r = path.join(rel, e.name);
  return e.isDirectory() ? walk(path.join(d, e.name), r) : [r];
});

const files = [];   // { toRel, buf, overwrite }
for (const c of manifest.copy || []) {
  const from = path.join(kitDir, c.from);
  if (!fs.existsSync(from)) { console.warn(`warn: manifest copies ${c.from} but the kit has no such path`); continue; }
  if (fs.statSync(from).isDirectory()) for (const r of walk(from)) files.push({ toRel: path.join(c.to || c.from, r), buf: fs.readFileSync(path.join(from, r)), overwrite: !!c.overwrite });
  else files.push({ toRel: c.to || c.from, buf: fs.readFileSync(from), overwrite: !!c.overwrite });
}
// CI colors from the intake feed the brand file
const idea = read(path.join(root, 'docs/IDEA.md')) || '';
const colors = ['สีหลัก', 'สีรอง', 'สีตกแต่ง'].map((l) => {
  const m = idea.match(new RegExp('^[-*]\\s*\\**' + l + '[^:\\n]*:\\**\\s*([^\\n]*)$', 'm'));
  const h = m && m[1].match(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/);
  return h ? h[0] : null;
});
const given = colors.filter(Boolean);
if (manifest.brand && manifest.brand.file && manifest.brand.template) {
  if (!given.length) console.warn('warn: no CI hex in docs/IDEA.md; the brand file is not generated (the designer/dev choose the colors and write it)');
  else files.push({ toRel: manifest.brand.file, buf: Buffer.from(manifest.brand.template.replace('{{COLORS}}', JSON.stringify(given).replace(/"/g, "'"))), generated: true });
}
for (const g of manifest.generated || []) files.push({ toRel: g.to, buf: Buffer.from(g.content), generated: true });

const result = { copied: [], unchanged: [], conflicts: [], kept: [] };
const newLock = { name: manifest.name, source: { commit: manifest.source.commit, dirty: manifest.source.dirty, ref: manifest.source.ref, git: manifest.source.git }, target, installedAt: new Date().toISOString(), files: {} };
for (const f of files) {
  const abs = path.join(dest, f.toRel), rel = path.join(target, f.toRel);
  const kitHash = sha(f.buf), cur = fs.existsSync(abs) ? sha(fs.readFileSync(abs)) : null;
  const locked = lock && lock.files && lock.files[rel];
  let action;
  if (cur === null) action = 'copy';
  else if (cur === kitHash) action = 'same';
  else if (force || (f.overwrite && !locked && !update && manifest.overwriteScaffold !== false)) action = 'copy';
  else if (locked && cur === locked) action = 'copy';          // untouched since our last install: safe to update
  else if (f.generated) action = 'keep';                         // generated files are only written when missing
  else action = 'conflict';
  if (action === 'copy') { if (!dry) { fs.mkdirSync(path.dirname(abs), { recursive: true }); fs.writeFileSync(abs, f.buf); } result.copied.push(rel); newLock.files[rel] = kitHash; }
  else if (action === 'same') { result.unchanged.push(rel); newLock.files[rel] = kitHash; }
  else if (action === 'keep') { result.kept.push(rel); if (locked) newLock.files[rel] = locked; }
  else { result.conflicts.push(rel); if (locked) newLock.files[rel] = locked; }
}

const deps = [...(manifest.dependencies || [])], dev = [...(manifest.devDependencies || [])];
if (!dry) { fs.mkdirSync(path.dirname(lockFile), { recursive: true }); fs.writeFileSync(lockFile, JSON.stringify(newLock, null, 2) + '\n'); }
const tsc = read(path.join(dest, 'tsconfig.json')) || '';
if (tsc && !/"@\/\*"/.test(tsc)) console.warn(`warn: ${path.join(target, 'tsconfig.json')} has no "paths": { "@/*": ["./src/*"] }; the kit imports itself with @/`);
if (has('--install') && !dry && (deps.length || dev.length)) {
  if (deps.length) execFileSync('npm', ['install', ...deps], { cwd: dest, stdio: 'inherit' });
  if (dev.length) execFileSync('npm', ['install', '-D', ...dev], { cwd: dest, stdio: 'inherit' });
}
console.log(`${dry ? '[dry run] ' : ''}install-kit ${manifest.name} @ ${(manifest.source.commit || '').slice(0, 8)}${manifest.source.dirty ? ' (kit had uncommitted changes)' : ''} -> ${target}`);
console.log(`  copied ${result.copied.length}, already identical ${result.unchanged.length}, kept project version ${result.kept.length}, CONFLICTS ${result.conflicts.length}`);
for (const c of result.conflicts.slice(0, 20)) console.log(`  conflict (project file differs from the kit, left alone): ${c}`);
if (deps.length || dev.length) console.log(`  dependencies: ${has('--install') ? 'installed' : `npm install ${deps.join(' ')}${dev.length ? ` && npm install -D ${dev.join(' ')}` : ''}   (in ${target})`}`);
