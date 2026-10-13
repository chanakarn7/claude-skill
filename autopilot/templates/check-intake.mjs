#!/usr/bin/env node
// Autopilot intake check (no LLM, no dependencies): is the idea file complete enough to spend tokens on?
//
// Run:  node check-intake.mjs <idea.md>
// Reports, per section of idea-template.md, whether it is GIVEN (real content), DELEGATED ("ให้ AI ..." / "ไม่รู้" / "ใช้ค่าเริ่มต้น":
// the agents will decide and log it) or MISSING (heading absent or only template placeholders), plus a few quality hints.
// Advisory only: exit 0 always (exit 2 = file not found). `run.sh start` prints it before the run begins.

import fs from 'node:fs';
import path from 'node:path';

const file = process.argv[2];
if (!file || !fs.existsSync(file)) { console.error('usage: node check-intake.mjs <idea.md>'); process.exit(2); }
const text = fs.readFileSync(path.resolve(file), 'utf8');

const SECTIONS = [
  { key: 'Requirement', star: true, re: /^##\s*1\.?\s*Requirement/im },
  { key: 'เกณฑ์ผ่าน (acceptance)', star: true, re: /^##\s*2\.?\s*เกณฑ์ผ่าน/im },
  { key: 'Look & feel', star: 'if UI', re: /^##\s*Look\s*&\s*feel/im },
  { key: 'Tech stack & ข้อจำกัด', star: true, re: /^##\s*Tech stack/im },
  { key: 'เซิร์ฟเวอร์และการ deploy', star: 'if deploy', re: /^##\s*เซิร์ฟเวอร์/im },
  { key: 'การตัดสินใจที่ล็อกแล้ว', star: false, re: /^##\s*การตัดสินใจที่ล็อก/im },
  { key: 'ถ้าไม่แน่ใจ', star: false, re: /^##\s*ถ้าไม่แน่ใจ/im },
];
const heads = [...text.matchAll(/^##\s[^\n]*$/gim)].map((m) => m.index);
const bodyOf = (re) => {
  const m = text.match(re); if (!m) return null;
  const start = m.index + m[0].length;
  const next = heads.find((i) => i > m.index);
  return text.slice(start, next ?? text.length);
};
const DELEGATED = /ให้ AI|ให้ agent|ไม่รู้|ใช้ค่าเริ่มต้น|ตัดสินใจเอง/;
// a "field" line has real content after its label: "- **label:** text" or a plain bullet/number with text; "..." and <placeholders> do not count
const realLines = (body) => body.split('\n').map((l) => l.replace(/^[\s>*#\-\d.)]+/, '').replace(/\*\*[^*]*\*\*:?/g, '').trim())
  .filter((l) => l.length >= 6 && !/^(\.{2,3}|…|<[^>]*>|---+)$/.test(l) && !/^\(?ตัวอย่าง/.test(l) && !/^>/.test(l));

if (/^#\s*ไอเดีย:\s*<ชื่อโปรเจกต์>/m.test(text)) {
  console.log(`Intake check: ${file}\n\n  This is the blank template (title is still "<ชื่อโปรเจกต์>"): fill it in, or start from an example in examples/.\n\nintake: not started`);
  process.exit(0);
}
const rows = []; const hints = [];
let given = 0, delegated = 0, missing = 0;
const freeForm = !/^##\s/m.test(text);
for (const s of SECTIONS) {
  const body = bodyOf(s.re);
  let status, detail = '';
  if (freeForm && s.key === 'Requirement') { const n = realLines(text).length; status = n ? 'GIVEN (free text)' : 'MISSING'; detail = `${n} line(s) of free text; the BA treats the whole file as the requirement`; }
  else if (body === null) { status = 'MISSING'; }
  else {
    const lines = realLines(body);
    if (!lines.length) status = 'MISSING';
    else if (lines.length <= 4 && DELEGATED.test(body) || (DELEGATED.test(body) && lines.length <= 2)) status = 'DELEGATED';
    else status = 'GIVEN';
    detail = `${lines.length} filled line(s)`;
  }
  rows.push([s.key, s.star === true ? '★' : s.star ? '★ ' + s.star : '', status, detail]);
  if (status.startsWith('GIVEN')) given++; else if (status === 'DELEGATED') delegated++; else if (s.star === true) missing++;
}

// quality hints
const req = bodyOf(SECTIONS[0].re) ?? (freeForm ? text : '');
const numbered = (req.match(/^\s*\d+\.\s+\S/gm) || []).length;
if (req && numbered < 3 && !freeForm) hints.push('Requirement: fewer than 3 numbered "ต้องทำได้" items; list each capability on its own line.');
if (req && !/ไม่ต้องมี|non-?goal|out of scope/i.test(req)) hints.push('Requirement: no "ไม่ต้องมี (รอบนี้)" list; without it the BA decides the scope limits itself.');
const acc = bodyOf(SECTIONS[1].re);
if (acc !== null && !/\d/.test(acc)) hints.push('เกณฑ์ผ่าน: no number anywhere; add measurable limits (taps, seconds, users, rows) so QA can test them.');
const server = bodyOf(SECTIONS[4].re);
if (server !== null && !DELEGATED.test(server)) {
  if (!/arm64|x86|amd64/i.test(server)) hints.push('เซิร์ฟเวอร์: CPU architecture not stated (arm64 / x86_64); the SA cannot check the stack fits the machine.');
  if (!/\b\d+\s*(GB|MB|กิกะ)|RAM/i.test(server)) hints.push('เซิร์ฟเวอร์: RAM not stated.');
  if (!/https|http|LAN|โดเมน/i.test(server)) hints.push('เซิร์ฟเวอร์: network/HTTPS not stated (plain HTTP breaks APIs that need a secure context).');
}
const stack = bodyOf(SECTIONS[3].re);
if (stack !== null && !/auth/i.test(stack)) hints.push('Tech stack: Auth not stated.');
const look = bodyOf(SECTIONS[2].re);
if (look !== null) {
  const subs = ['ผู้ใช้และบริบท', 'ความรู้สึก', 'เว็บ/แอปอ้างอิง', 'anti-reference', 'ลำดับความสำคัญของหน้า', 'สี / ฟอนต์', 'ความหนาแน่น', 'ข้อมูลตัวอย่าง', 'เกณฑ์ผ่านด้านภาพ'];
  const empty = subs.filter((t) => { const m = look.match(new RegExp('###[^\\n]*' + t.replace(/[/]/g, '\\/') + '[^\\n]*\\n([\\s\\S]*?)(?=\\n###|(?![\\s\\S]))')); return !m || !realLines(m[1]).length; });
  if (empty.length) hints.push(`Look & feel: empty sub-section(s): ${empty.join(', ')} (agents will propose or guess; they log it for Gate 1).`);
}

const w = Math.max(...rows.map((r) => r[0].length));
console.log(`Intake check: ${file}\n`);
for (const [k, star, st, d] of rows) console.log(`  ${k.padEnd(w)}  ${star.padEnd(10)}  ${st.padEnd(18)} ${d}`);
if (hints.length) console.log('\nHints:\n' + hints.map((h) => '  - ' + h).join('\n'));
console.log(`\nintake: ${given} given, ${delegated} delegated, ${missing} required section(s) missing` + (missing ? ' — the agents will guess these and list the guesses at Gate 1' : ''));
process.exit(0);
