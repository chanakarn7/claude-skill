#!/usr/bin/env node
// Autopilot contract check (used by sa-agent before finishing, by reviewer-agent as evidence, by dev-agent on drift).
//
// One-time setup in the project (does not touch the app's own package.json):
//   npm install --no-save --prefix docs/pipeline yaml
// (docs/pipeline/node_modules is already git-ignored)
//
// Run:  node docs/pipeline/templates/check-contract.mjs [projectRoot=.] [BASE=docs]
//
// Checks docs/contracts/openapi.yaml (server apps) and/or docs/contracts/modules.d.ts (client-only apps):
//   openapi.yaml : parses; every operation has operationId + x-stories (US ids that exist in the PRD) + at least one 2xx
//                  response; every $ref resolves; every 4xx/5xx response uses the shared Error schema; every PRD user story is
//                  served by some operation or appears under "Uncovered stories" in SA_BLUEPRINT.md
//   modules.d.ts : every exported function/const has a JSDoc line "@stories US-xx[, US-yy]" with ids that exist in the PRD;
//                  same coverage rule
// Exit code: 0 = ok, 1 = findings (printed, one per line), 2 = nothing to check / missing dependency.

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const root = path.resolve(process.argv[2] || '.');
const base = process.argv[3] || 'docs';
const rd = (p) => (fs.existsSync(path.join(root, p)) ? fs.readFileSync(path.join(root, p), 'utf8') : null);

const prd = rd(`${base}/PRD.md`);
if (!prd) { console.error(`no ${base}/PRD.md`); process.exit(2); }
const prdStories = new Set(prd.match(/\bUS-\d+\b/g) || []);
const blueprint = rd(`${base}/SA_BLUEPRINT.md`) || '';
const unc = (blueprint.match(/Uncovered stories:?([^\n]*(?:\n[-*] [^\n]*)*)/i) || ['', ''])[1];
const uncovered = new Set(unc.match(/\bUS-\d+\b/g) || []);

const findings = [];
const served = new Set();
const fail = (m) => findings.push(m);
const checkIds = (ids, where) => {
  if (!ids.length) fail(`${where}: no story ids`);
  for (const id of ids) { if (!prdStories.has(id)) fail(`${where}: ${id} is not in the PRD`); else served.add(id); }
};

let checked = 0;

const oa = rd(`${base}/contracts/openapi.yaml`) ?? rd(`${base}/contracts/openapi.yml`);
if (oa !== null) {
  checked++;
  let YAML;
  try { YAML = createRequire(path.join(root, 'docs/pipeline/'))('yaml'); }
  catch { console.error('missing dependency: npm install --no-save --prefix docs/pipeline yaml'); process.exit(2); }
  let doc;
  try { doc = YAML.parse(oa); } catch (e) { fail(`openapi.yaml does not parse: ${e.message.split('\n')[0]}`); }
  if (doc) {
    const resolve = (ref) => ref.replace(/^#\//, '').split('/').reduce((o, k) => (o ? o[k.replace(/~1/g, '/').replace(/~0/g, '~')] : undefined), doc);
    const walk = (node, where) => {
      if (Array.isArray(node)) node.forEach((n, i) => walk(n, `${where}[${i}]`));
      else if (node && typeof node === 'object') {
        if (typeof node.$ref === 'string' && resolve(node.$ref) === undefined) fail(`${where}: unresolved $ref ${node.$ref}`);
        for (const [k, v] of Object.entries(node)) walk(v, `${where}.${k}`);
      }
    };
    walk(doc, 'openapi');
    const hasError = !!doc.components?.schemas?.Error;
    if (!hasError) fail('components.schemas.Error is missing (one shared error shape)');
    const ops = [];
    for (const [url, item] of Object.entries(doc.paths || {}))
      for (const [method, op] of Object.entries(item || {})) {
        if (!['get', 'post', 'put', 'patch', 'delete'].includes(method)) continue;
        const where = `${method.toUpperCase()} ${url}`;
        ops.push(where);
        if (!op.operationId) fail(`${where}: operationId missing`);
        checkIds(op['x-stories'] || [], where);
        const codes = Object.keys(op.responses || {});
        if (!codes.some((c) => /^2/.test(c))) fail(`${where}: no 2xx response`);
        for (const c of codes) if (/^[45]/.test(c)) {
          let r = op.responses[c];
          if (r && typeof r.$ref === 'string') r = { ...r, resolved: resolve(r.$ref) };
          if (!/schemas\/Error\b/.test(JSON.stringify(r))) fail(`${where}: ${c} response does not use the shared Error schema`);
        }
      }
    if (!ops.length) fail('openapi.yaml has no operations');
  }
}

const dts = rd(`${base}/contracts/modules.d.ts`);
if (dts !== null) {
  checked++;
  const re = /(\/\*\*[\s\S]*?\*\/)\s*export\s+(?:declare\s+)?(?:async\s+)?(?:function|const)\s+(\w+)/g;
  const seen = new Set();
  let m;
  while ((m = re.exec(dts))) {
    seen.add(m[2]);
    const tag = m[1].match(/@stories\s+([^\n*]+)/);
    checkIds(tag ? tag[1].match(/\bUS-\d+\b/g) || [] : [], `${m[2]}`);
  }
  const exported = [...dts.matchAll(/export\s+(?:declare\s+)?(?:async\s+)?(?:function|const)\s+(\w+)/g)].map((x) => x[1]);
  for (const n of exported) if (!seen.has(n)) fail(`${n}: missing JSDoc block with @stories`);
  if (!exported.length) fail('modules.d.ts exports nothing');
}

if (!checked) { console.error(`nothing to check: no ${base}/contracts/openapi.yaml or modules.d.ts`); process.exit(2); }

for (const id of [...prdStories].sort()) if (!served.has(id) && !uncovered.has(id)) fail(`${id}: not served by any operation/function and not under "Uncovered stories"`);

if (findings.length) { console.log(findings.map((f) => `- ${f}`).join('\n')); console.log(`\n${findings.length} finding(s)`); process.exit(1); }
console.log(`contract ok: ${served.size} stories served, ${uncovered.size} declared uncovered`);
