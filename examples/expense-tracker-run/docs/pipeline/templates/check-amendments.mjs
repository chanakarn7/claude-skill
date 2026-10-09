#!/usr/bin/env node
// Autopilot PRD-amendment consistency check (no LLM, no dependencies).
// Used by the PM after ba-agent applied amendments, and by reviewer-agent as evidence.
//
// Run:  node docs/pipeline/templates/check-amendments.mjs [projectRoot=.] [BASE=docs]
//
// Reads <BASE>/pipeline/PRD_AMENDMENTS.md (override: docs/pipeline/...), <BASE>/PRD.md, <BASE>/SA_BLUEPRINT.md, <BASE>/contracts/*.
//   error : an entry is still `open`
//   error : an `applied` entry has no `[amend A<n>]` tag in the PRD
//   error : a `rejected` entry is still tagged in the PRD, or still relied on by the blueprint/contract
//   error : a `[PRD-AMEND A<n>]` marker in the blueprint/contract has no entry in the amendments file
//   warn  : text quoted in an applied entry's "Proposed text" (inside "..." or `...`) is missing from the PRD
//           (the ba-agent may have paraphrased a specific; the reviewer decides)
// Exit code: 0 = no errors (warnings are printed), 1 = errors, 2 = nothing to check.

import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || '.');
const base = process.argv[3] || 'docs';
const read = (p) => { const f = path.join(root, p); return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null; };
const listDir = (p) => { const d = path.join(root, p); return fs.existsSync(d) ? fs.readdirSync(d).map((n) => path.join(p, n)) : []; };
const norm = (s) => s.replace(/\s+/g, ' ').trim();

const prd = read(`${base}/PRD.md`);
const am = read('docs/pipeline/PRD_AMENDMENTS.md') ?? read(`${base}/pipeline/PRD_AMENDMENTS.md`);
const downstream = [`${base}/SA_BLUEPRINT.md`, ...listDir(`${base}/contracts`)].map((p) => [p, read(p)]).filter(([, t]) => t);
if (!prd) { console.error(`no ${base}/PRD.md`); process.exit(2); }

const marks = new Set();
for (const [, t] of downstream) for (const m of t.matchAll(/\[PRD-AMEND (A\d+)\]/g)) marks.add(m[1]);
if (!am) {
  if (marks.size) { console.log(`- error: markers ${[...marks].join(', ')} found downstream but there is no PRD_AMENDMENTS.md`); process.exit(1); }
  console.error('nothing to check: no PRD_AMENDMENTS.md'); process.exit(2);
}

const errors = [], warns = [];
const entries = [];
for (const m of am.matchAll(/^## (A\d+)\b[^\n]*?status:\s*([a-z]+)[^\n]*\n([\s\S]*?)(?=^## A\d+\b|(?![\s\S]))/gm))
  entries.push({ id: m[1], status: m[2], body: m[3] });
if (!entries.length) { console.error('PRD_AMENDMENTS.md has no entries'); process.exit(2); }

const ids = new Set(entries.map((e) => e.id));
const prdN = norm(prd);
for (const e of entries) {
  const tagged = new RegExp(`\\[amend ${e.id}\\]`).test(prd);
  if (e.status === 'open') errors.push(`${e.id}: still open`);
  else if (e.status === 'applied') {
    if (!tagged) errors.push(`${e.id}: applied but the PRD has no [amend ${e.id}] tag`);
    const proposed = (e.body.match(/Proposed text:\s*([\s\S]*)$/) || ['', ''])[1];
    for (const q of proposed.matchAll(/"([^"\n]{4,})"|`([^`\n]{4,})`|«([^»\n]{4,})»/g)) {
      const s = norm(q[1] || q[2] || q[3]);
      if (!prdN.includes(s)) warns.push(`${e.id}: quoted text not found verbatim in the PRD: "${s.slice(0, 60)}"`);
    }
  } else if (e.status.startsWith('rejected')) {
    if (tagged) errors.push(`${e.id}: rejected but the PRD still carries [amend ${e.id}]`);
    if (marks.has(e.id)) errors.push(`${e.id}: rejected but the blueprint/contract still relies on it ([PRD-AMEND ${e.id}])`);
  }
}
for (const id of marks) if (!ids.has(id)) errors.push(`${id}: used as [PRD-AMEND ${id}] downstream but has no entry in PRD_AMENDMENTS.md`);

for (const w of warns) console.log(`- warn: ${w}`);
for (const e of errors) console.log(`- error: ${e}`);
if (errors.length) { console.log(`\n${errors.length} error(s), ${warns.length} warning(s)`); process.exit(1); }
console.log(`amendments ok: ${entries.length} entries, ${marks.size} downstream markers, ${warns.length} warning(s)`);
