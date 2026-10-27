#!/usr/bin/env node
// Autopilot UI-kit resolver (no LLM, no dependencies). Run by `run.sh` before every pilot run.
//
// Run:  node resolve-kit.mjs [projectRoot=.] [--config <file>]
//
// What a "UI kit" is: a shared component library (for example jb-components) that projects copy in and must use instead of
// writing their own components or installing shadcn/ui.
//
// Resolution order for WHICH kit:
//   1. the `UI kit:` line of docs/IDEA.md  (a git URL and/or a path and/or a registered name; "ไม่ใช้" = none; "ค่าเริ่มต้น" = the user default)
//   2. nothing declared in the intake => no kit (the shadcn/ui default of stack.md applies)
// Registered kits (so a machine change only needs this file or a git URL): ~/.claude/autopilot.json
//   { "defaultKit": "jb-components",
//     "kits": { "jb-components": { "git": "https://github.com/<owner>/jb-components", "ref": "main", "path": "/Users/me/Documents/GitHub/jb-components" } } }
// WHERE the kit is: the local path if it exists, else a shallow git clone into ~/.cache/autopilot/kits/<name>.
//
// Output: docs/pipeline/kit.json   status: "none" | "resolved" (the kit ships its own kit.json) | "needs-discovery" (no kit.json: the
//   kit-agent reads the kit's docs once and writes the manifest, status "discovered") | "error"
// An existing manifest with status "discovered" is kept (the discovery is done once); only the source commit is refreshed.
// Exit code: 0 = ok (including "none"), 1 = a kit was declared but cannot be resolved.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const root = path.resolve(args.find((a) => !a.startsWith('--') && a !== flag('--config')) || '.');
const configFile = flag('--config') || path.join(os.homedir(), '.claude', 'autopilot.json');
const out = path.join(root, 'docs', 'pipeline', 'kit.json');
const read = (p) => { try { return fs.readFileSync(p, 'utf8'); } catch { return null; } };
const sh = (cmd, a, cwd) => execFileSync(cmd, a, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const expand = (p) => (p.startsWith('~') ? path.join(os.homedir(), p.slice(1)) : p);
const write = (m) => { fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, JSON.stringify(m, null, 2) + '\n'); };
const done = (m, msg, code = 0) => { write(m); console.log(msg); process.exit(code); };

const idea = read(path.join(root, 'docs', 'IDEA.md')) || '';
const m = idea.match(/^[-*]\s*\**UI kit[^:\n]*:\**\s*([^\n]*)$/im);
const line = m ? m[1].trim() : '';
const config = (() => { try { return JSON.parse(read(configFile) || '{}'); } catch { return {}; } })();

if (!line || /^(ไม่ใช้|ไม่มี)/.test(line) || /^(none|no)\b/i.test(line) || (/shadcn/i.test(line) && !/https?:|git@|~\/|\/(Users|home)\//.test(line))) {
  done({ schema: 1, status: 'none', reason: line ? `intake says: ${line}` : 'no "UI kit:" line in docs/IDEA.md' }, `kit: none (${line || 'not declared'}) -> shadcn/ui default`);
}

// ---- which kit
let spec = {};
const url = line.match(/(https?:\/\/[^\s`"')]+|git@[^\s`"')]+)/);
const pth = line.match(/(~\/[^\s`"')]+|\/(?:Users|home|opt|srv|mnt|tmp|var)\/[^\s`"')]+)/);
const refm = line.match(/(?:ref|branch|commit|tag)\s*[:=]?\s*([\w./-]+)/i) || (url && trim(url[1]).match(/#([\w./-]+)$/));
const named = line.match(/\b([a-z0-9][a-z0-9._-]{2,})\b/i);
const trim = (x) => x.replace(/[,.;:)\]]+$/, '');
if (url) spec.git = trim(url[1]).replace(/#[\w./-]+$/, '');
if (pth) spec.path = trim(pth[1]);
if (refm) spec.ref = refm[1];
let name = null;
const first = (line.match(/^[`\s]*([a-z0-9][a-z0-9._-]+)/i) || [])[1];
const firstIsName = first && !/^(path|git|ref|branch|commit|tag|https?|http|url)$/i.test(first);
if (/ค่าเริ่มต้น|default/i.test(line) && !spec.git && !spec.path) name = config.defaultKit;
else if (!spec.git && !spec.path) name = (line.match(/`([^`]+)`/) || named || [])[1] || null;
else if (firstIsName) spec.name = first;   // "fakekit (path: /x, ref: main)": the leading word names the kit
if (name) {
  const reg = (config.kits || {})[name];
  if (!reg) done({ schema: 1, status: 'error', error: `kit "${name}" is not registered in ${configFile} and the intake gives no git URL or path` }, `kit: ERROR - "${name}" is not registered in ${configFile}; give a git URL or a path in the "UI kit:" line`, 1);
  spec = { ...reg, ...spec };
  spec.name = name;
}
spec.name = spec.name || path.basename((spec.path || spec.git || 'kit').replace(/\.git$/, ''));
spec.ref = spec.ref || 'main';

// ---- where it is
let dir = null, how = null;
if (spec.path && fs.existsSync(expand(spec.path))) { dir = path.resolve(expand(spec.path)); how = 'path'; }
else if (spec.git) {
  const cache = path.join(os.homedir(), '.cache', 'autopilot', 'kits', spec.name);
  try {
    if (fs.existsSync(path.join(cache, '.git'))) { sh('git', ['fetch', '--depth', '1', 'origin', spec.ref], cache); sh('git', ['checkout', '-q', 'FETCH_HEAD'], cache); }
    else { fs.mkdirSync(path.dirname(cache), { recursive: true }); sh('git', ['clone', '--depth', '1', '--branch', spec.ref, spec.git, cache]); }
    dir = cache; how = 'git';
  } catch (e) {
    const why = String(e.stderr || e.message).split('\n').map((l) => l.trim()).filter(Boolean).filter((l) => /^(fatal|error|remote)/i.test(l)).pop() || String(e.stderr || e.message).split('\n')[0];
    done({ schema: 1, status: 'error', error: `cannot clone ${spec.git} (${spec.ref}): ${why}` }, `kit: ERROR - cannot clone ${spec.git}: ${why}`, 1);
  }
}
if (!dir) done({ schema: 1, status: 'error', error: `no usable location for kit "${spec.name}" (path ${spec.path || '-'} missing, no git URL)` }, `kit: ERROR - kit "${spec.name}": path ${spec.path || '(none)'} does not exist and there is no git URL`, 1);

const source = { type: how, path: dir, git: spec.git || null, ref: spec.ref, commit: null, dirty: false };
try { source.commit = sh('git', ['rev-parse', 'HEAD'], dir); source.dirty = sh('git', ['status', '--porcelain'], dir).length > 0; } catch { /* not a git checkout */ }

// ---- what it contains
const shipped = (() => { try { return JSON.parse(read(path.join(dir, 'kit.json')) || 'null'); } catch { return null; } })();
const pkg = (() => { try { return JSON.parse(read(path.join(dir, 'package.json')) || '{}'); } catch { return {}; } })();
const compDir = path.join(dir, 'src', 'components');
const components = fs.existsSync(compDir) ? fs.readdirSync(compDir, { withFileTypes: true }).filter((e) => e.isFile() && /\.tsx$/.test(e.name)).map((e) => e.name.replace(/\.tsx$/, '')).sort() : [];
const facts = {
  entryDocs: ['AGENTS.md', 'README.md', 'docs/guide/01-workflow.md', 'docs/guide/02-setup.md', 'docs/guide/03-requirement-map.md', 'docs/guide/04-page-recipes.md', 'docs/guide/05-rules.md', 'docs/guide/06-checklist.md', 'docs/api/README.md'].filter((f) => fs.existsSync(path.join(dir, f))),
  dependencies: pkg.dependencies || {},
  devDependencies: pkg.devDependencies || {},
  componentFiles: components,
};

const prev = (() => { try { return JSON.parse(read(out) || 'null'); } catch { return null; } })();
if (shipped) {
  done({ ...shipped, schema: shipped.schema ?? 1, status: 'resolved', name: shipped.name || spec.name, source, components: shipped.components || components },
    `kit: ${spec.name} resolved via ${how} (${(source.commit || '').slice(0, 8) || 'no git'}${source.dirty ? ', UNCOMMITTED CHANGES in the kit' : ''}), manifest shipped by the kit`);
}
if (prev && prev.status === 'discovered' && prev.name === spec.name) {
  const changed = prev.source && prev.source.commit && source.commit && prev.source.commit !== source.commit;
  done({ ...prev, source, facts }, `kit: ${spec.name} - discovered manifest kept${changed ? ` (kit moved ${prev.source.commit.slice(0, 8)} -> ${source.commit.slice(0, 8)}: re-run discovery if its docs changed)` : ''}`);
}
done({ schema: 1, status: 'needs-discovery', name: spec.name, source, facts },
  `kit: ${spec.name} found via ${how} (${(source.commit || '').slice(0, 8) || 'no git'}${source.dirty ? ', UNCOMMITTED CHANGES in the kit' : ''}); it ships no kit.json, so the kit-agent will read its docs once (${components.length} components, ${facts.entryDocs.length} guide files)`);
