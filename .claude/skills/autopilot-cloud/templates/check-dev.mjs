#!/usr/bin/env node
// Autopilot implementation check (no LLM, no dependencies).
// Used by dev-agent before finishing, by the PM right after stage 5 (before QA), and by qa-agent as its traceability input.
//
// Run:  node docs/pipeline/templates/check-dev.mjs [projectRoot=.] [BASE=docs] [--run] [--tests]
//   (no flags)  static checks only: story -> test coverage, UI layer, demo data
//   --run       also run `npm run lint` and `npm run build` (each only if the script exists; a failure is an error)
//   --tests     with --run: also run `npm test` (needs the database up when the tests use one, so the PM does not pass it)
//
// Conventions it relies on (documented in dev-agent.md / qa-agent.md):
//   every test name or file mentions the story it proves:  "US-03 AC2: rejects negative amount"  (AC<n> = the n-th Given/When/Then of that story)
//   program mode (BASE = docs/modules/<slug>): only tests whose path or text contains <slug> count, e.g. `inventory: US-03 AC2: ...`
//   PRD stories start a line with  US-<n>  (heading, bullet or bold), their acceptance criteria use the word "Given"
// Writes <root>/docs/pipeline/COVERAGE.md (story -> tests -> ACs) and <root>/docs/pipeline/CHECK_DEV.md (this report).
// Errors (exit 1): a story no test mentions; lint/build/test failed; web UI without components/ui (unless a [DEVIATION] says why);
//   server project without a `seed:demo` script and a root `demo` script; no test script at all.
// UI kit mode (docs/pipeline/kit.json): instead of the shadcn checks, the kit must be installed (docs/kit.lock), its files unedited (hash per file), and screens must not use raw
//   <button>/<input>/<select>/<textarea>/<table>/<dialog> where the kit has components (error from 5 occurrences unless a [DEVIATION] mentioning the kit is logged).
// Warnings: AC numbers a story has but no test mentions; missing icon library / font loading / theme handling / chart library; no .env.example.
// "Mentioned" is not "verified": the tests still have to pass and QA decides whether each AC is really asserted. Exit 2 = nothing to check.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const pos = args.filter((a) => !a.startsWith('--'));
const root = path.resolve(pos[0] || '.');
const base = pos[1] || 'docs';
const rel = (p) => path.relative(root, p) || '.';
const read = (p) => { try { return fs.readFileSync(p, 'utf8'); } catch { return null; } };

const prd = read(path.join(root, base, 'PRD.md'));
if (!prd) { console.error(`nothing to check: no ${base}/PRD.md`); process.exit(2); }

const SKIP = new Set(['node_modules', '.git', 'dist', '.next', 'build', 'out', 'coverage', '.turbo', '.cache', '.vercel']);
const walk = (dir, cb, depth = 0) => {
  let ents; try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of ents) {
    if (e.name.startsWith('.') && e.name !== '.env.example') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (SKIP.has(e.name)) continue; if (rel(p).startsWith('docs/pipeline')) continue; walk(p, cb, depth + 1); }
    else cb(p);
  }
};

// ---- PRD stories and their acceptance criteria
const stories = new Map();   // id -> { title, acs }
{
  const lines = prd.split('\n'); let cur = null;
  for (const line of lines) {
    const m = line.match(/^\s*(?:#{1,6}\s*|[-*]\s+|\|\s*)?(?:\*\*)?(US-\d+)\b(.*)$/);
    if (m) { cur = m[1]; if (!stories.has(cur)) stories.set(cur, { title: m[2].replace(/[*|#`]/g, '').replace(/^[\s—–:.-]+/, '').trim().slice(0, 60), acs: 0 }); }
    else if (/^#{1,3}\s/.test(line) && !/US-\d+/.test(line)) cur = null;
    if (cur) stories.get(cur).acs += (line.match(/\bGiven\b/gi) || []).length;
  }
}
if (!stories.size) { console.error('nothing to check: no "US-<n>" stories found in the PRD'); process.exit(2); }

// ---- tests and the stories they mention
const testFiles = [];
walk(root, (p) => {
  const r = rel(p);
  if (!/\.[cm]?[jt]sx?$/.test(p)) return;
  if (/\.(test|spec)\.[cm]?[jt]sx?$/.test(p) || /(^|\/)(__tests__|e2e|tests?)\//.test(r)) testFiles.push(p);
});
const covered = new Map();   // id -> { files:Set, acs:Set }
// Program mode: every module numbers its stories from US-01, so only tests that belong to THIS module count: the module slug (the folder name under docs/modules/) must appear in the test's path or text.
const modSlug = /^docs\/modules\/[^/]+/.test(base) ? base.split('/')[2].toLowerCase() : null;
for (const f of testFiles) {
  const src = read(f) || '';
  if (modSlug && !(rel(f).toLowerCase().includes(modSlug) || src.toLowerCase().includes(modSlug))) continue;
  for (const m of src.matchAll(/\bUS-(\d+)(?:[\s,:;.\-–]{0,3}AC\s?(\d+))?/g)) {
    const id = `US-${m[1].padStart(2, '0')}`; const alt = `US-${m[1]}`;
    const key = stories.has(id) ? id : stories.has(alt) ? alt : null;
    if (!key) continue;
    if (!covered.has(key)) covered.set(key, { files: new Set(), acs: new Set() });
    covered.get(key).files.add(rel(f)); if (m[2]) covered.get(key).acs.add(Number(m[2]));
  }
}

const errors = [], warns = [], notes = [];
const rows = [];
for (const [id, s] of stories) {
  const c = covered.get(id);
  if (!c) { errors.push(`${id} has no test that mentions it (name tests "${id} AC<n>: ...")`); rows.push(`| ${id} | ${s.title} | 0 | - | - | NO TEST |`); continue; }
  const missing = [];
  for (let i = 1; i <= s.acs; i++) if (!c.acs.has(i)) missing.push(i);
  if (s.acs && missing.length) warns.push(`${id}: AC ${missing.join(', ')} of ${s.acs} not named in any test`);
  rows.push(`| ${id} | ${s.title} | ${c.files.size} | ${[...c.files].slice(0, 3).join(', ')}${c.files.size > 3 ? ', …' : ''} | ${s.acs ? `${s.acs - missing.length}/${s.acs}` : 'n/a'} | ${missing.length ? 'partial' : 'mentioned'} |`);
}

// ---- package.json files (root + workspaces), deps and scripts
const pkgs = [];
walk(root, (p) => { if (path.basename(p) === 'package.json') { try { pkgs.push({ file: rel(p), json: JSON.parse(read(p)) }); } catch { /* ignore */ } } });
const deps = new Set(); const scripts = {};
for (const { file, json } of pkgs) {
  for (const k of Object.keys({ ...json.dependencies, ...json.devDependencies })) deps.add(k);
  for (const [k, v] of Object.entries(json.scripts || {})) (scripts[k] ||= []).push(file);
}
const hasDep = (re) => [...deps].some((d) => re.test(d));
const rootScripts = pkgs.find((p) => p.file === 'package.json')?.json.scripts || {};
const decisions = read(path.join(root, 'docs/DECISIONS.md')) || '';
const deviated = (word) => new RegExp(`\\[(VISUAL-)?DEVIATION\\][^\\n]*${word}`, 'i').test(decisions);
const hasWebUi = hasDep(/^(next|react|react-dom|vite|vue|svelte)$/);
const hasServer = hasDep(/^(@nestjs\/core|express|fastify|hono|koa|prisma|@prisma\/client)$/);

// ---- UI kit mode (docs/pipeline/kit.json resolved|discovered): the kit replaces the shadcn/ui layer checks
const kitManifest = (() => { try { return JSON.parse(read(path.join(root, 'docs/pipeline/kit.json')) || 'null'); } catch { return null; } })();
const kitMode = !!kitManifest && ['resolved', 'discovered'].includes(kitManifest.status);
if (kitMode) {
  const lockText = read(path.join(root, 'docs/kit.lock'));
  const kitDev = /\[(VISUAL-)?DEVIATION\][^\n]*\bkit\b/i.test(decisions);
  if (!lockText) errors.push(`UI kit "${kitManifest.name}" is declared but not installed (no docs/kit.lock): run node docs/pipeline/templates/install-kit.mjs . --target ${kitManifest.target || '.'} --install`);
  else {
    const lock = JSON.parse(lockText);
    const owned = new Set(Object.keys(lock.files || {}).map((f) => path.resolve(root, f)));
    let edited = [], missing = [];
    for (const [f, h] of Object.entries(lock.files || {})) {
      const abs = path.join(root, f);
      if (!fs.existsSync(abs)) { missing.push(f); continue; }
      if (crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex') !== h) edited.push(f);
    }
    if (missing.length) errors.push(`${missing.length} kit file(s) from docs/kit.lock are missing, e.g. ${missing.slice(0, 3).join(', ')}`);
    if (edited.length) (kitDev ? warns : errors).push(`${edited.length} kit file(s) were edited after installation (${edited.slice(0, 4).join(', ')}${edited.length > 4 ? ', …' : ''})${kitDev ? ' - logged as [DEVIATION]' : '; do not edit the kit, or log "[dev][DEVIATION] kit file edited: <path> - <why>"'}`);
    // screens must use kit components, not raw controls
    const appDir = path.join(root, lock.target || '.', 'src');
    const raw = [];
    if (fs.existsSync(appDir)) walk(appDir, (f) => {
      if (!/\.[jt]sx$/.test(f) || owned.has(path.resolve(f)) || /\.(test|spec)\./.test(f) || /(^|\/)(__tests__|test|tests|qa)\//.test(rel(f))) return;
      const n = (read(f) || '').match(/<(button|input|select|textarea|table|dialog)\b/g);
      if (n) raw.push([rel(f), n.length]);
    });
    const total = raw.reduce((a, [, n]) => a + n, 0);
    if (total) (total >= 5 && !kitDev ? errors : warns).push(`${total} raw HTML control(s) (<button>, <input>, <select>, <textarea>, <table>, <dialog>) in ${raw.length} app file(s) where the kit has components, e.g. ${raw.sort((a, b) => b[1] - a[1]).slice(0, 3).map(([f, n]) => `${f} (${n})`).join(', ')}`);
    notes.push(`UI kit ${kitManifest.name} @ ${(lock.source && lock.source.commit || '').slice(0, 8)}: ${Object.keys(lock.files || {}).length} installed file(s), ${edited.length} edited`);
  }
} else if (hasWebUi) {
  let uiFiles = 0; let src = '';
  walk(root, (p) => {
    const r = rel(p);
    if (/(^|\/)components\/ui\//.test(r) && /\.[jt]sx?$/.test(p)) uiFiles++;
    if (/\.(tsx|jsx|css|ts|js)$/.test(p) && /(^|\/)(src|app)\//.test(r) && src.length < 4e6) src += (read(p) || '') + '\n';
  });
  if (uiFiles < 3 && !deviated('shadcn')) errors.push('web UI has no components/ui (shadcn/ui) with at least 3 components; use it or log "[dev][DEVIATION] shadcn ..." in DECISIONS.md');
  else notes.push(`components/ui: ${uiFiles} file(s)`);
  if (!hasDep(/^(lucide-react|@phosphor-icons\/react|@tabler\/icons-react|react-icons|@radix-ui\/react-icons|lucide-vue-next|lucide-svelte)$/)) warns.push('no icon library in package.json (design doc wants one icon family)');
  if (!/next\/font|@fontsource|@font-face/.test(src)) warns.push('no font loading found (next/font, @fontsource or @font-face); the design doc font may not load');
  if (!/next-themes|setTheme|data-theme|prefers-color-scheme|classList\.(toggle|add)\(['"]dark/.test(src)) warns.push('no theme handling found (toggle / prefers-color-scheme); the design doc asks for light + dark');
  const design = read(path.join(root, base, 'UXUI_DESIGN.md')) || '';
  if (/\bchart/i.test(design) && !hasDep(/^(recharts|chart\.js|react-chartjs-2|@nivo\/.+|victory.*|echarts.*|@visx\/.+|apexcharts|d3)$/)) warns.push('design doc mentions charts but no chart library is installed');
}

// ---- demo data / developer experience
if (hasServer) {
  if (!scripts['seed:demo']) errors.push('server project without a `seed:demo` script (idempotent demo data covering every status/role/edge case)');
  if (!rootScripts.demo) errors.push('server project without a root `demo` script (starts db, migrates, seeds, runs api + web, prints URLs and demo accounts)');
  const hasPrismaSchema = (() => { let f = false; walk(root, (p) => { if (path.basename(p) === 'schema.prisma') f = true; }); return f; })();
  if (hasPrismaSchema && !fs.existsSync(path.join(root, '.env.example'))) warns.push('no .env.example at the repository root');
}
const nDev = (decisions.match(/\[(VISUAL-)?DEVIATION\]/g) || []).length;
if (nDev) notes.push(`${nDev} [DEVIATION] decision(s) logged (shown to the human at the gates)`);

// ---- lint / build / tests
const runRows = [];
if (flags.has('--run')) {
  if (!Object.keys(rootScripts).length) errors.push('no root package.json scripts to run (lint/build/test)');
  const steps = [['lint', 'run lint'], ['build', 'run build']];
  if (flags.has('--tests')) steps.push(['test', 'test']);
  if (flags.has('--tests') && !rootScripts.test) errors.push('no `test` script in the root package.json');
  for (const [name, cmd] of steps) {
    if (!rootScripts[name]) { runRows.push(`| ${name} | skipped (no "${name}" script) |`); continue; }
    const t0 = Date.now();
    const r = spawnSync('npm', cmd.split(' '), { cwd: root, encoding: 'utf8', timeout: 15 * 60 * 1000, env: { ...process.env, CI: '1' } });
    const secs = Math.round((Date.now() - t0) / 1000);
    if (r.status === 0) runRows.push(`| ${name} | ok (${secs}s) |`);
    else {
      const tail = `${r.stdout || ''}\n${r.stderr || ''}`.trim().split('\n').slice(-12).join('\n');
      runRows.push(`| ${name} | FAILED (exit ${r.status ?? r.signal}) |`);
      errors.push(`npm ${cmd} failed (exit ${r.status ?? r.signal}):\n${tail.split('\n').map((l) => '    ' + l).join('\n')}`);
    }
  }
}

// ---- report
const total = stories.size, withTest = [...stories.keys()].filter((id) => covered.has(id)).length;
const out = [];
out.push(`# check-dev — ${new Date().toISOString()}`);
out.push(`Stories with a test that mentions them: ${withTest}/${total} · test files: ${testFiles.length} · web UI: ${hasWebUi ? 'yes' : 'no'} · server: ${hasServer ? 'yes' : 'no'}`);
out.push(errors.length ? `\n## Errors (${errors.length})\n${errors.map((e) => '- ' + e).join('\n')}` : '\n## Errors\nnone');
out.push(warns.length ? `\n## Warnings (${warns.length})\n${warns.map((w) => '- ' + w).join('\n')}` : '\n## Warnings\nnone');
if (notes.length) out.push(`\n## Notes\n${notes.map((n) => '- ' + n).join('\n')}`);
if (runRows.length) out.push(`\n## Commands\n| step | result |\n|---|---|\n${runRows.join('\n')}`);
const report = out.join('\n');
const cov = `# Coverage (story -> tests -> ACs)\nGenerated by check-dev.mjs. "Mentioned" means a test name or file names the story/AC; it does not prove the AC is asserted — QA decides that from the tests listed here.\n\n| Story | Title | Test files | Files | ACs named | Status |\n|---|---|---|---|---|---|\n${rows.join('\n')}\n`;
try { fs.mkdirSync(path.join(root, 'docs/pipeline'), { recursive: true }); fs.writeFileSync(path.join(root, 'docs/pipeline/COVERAGE.md'), cov); fs.writeFileSync(path.join(root, 'docs/pipeline/CHECK_DEV.md'), report + '\n'); } catch { /* read-only checkouts still print the report */ }
console.log(report);
console.log(errors.length ? `\ncheck-dev: FAIL (${errors.length} error(s), ${warns.length} warning(s))` : `\ncheck-dev: OK (${warns.length} warning(s))`);
process.exit(errors.length ? 1 : 0);
