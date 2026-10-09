# Review — Gate 1 (round 1)
Verdict: PASS
Owner to fix: none (NOTEs are optional, for the human's eye at the gate)

Scope: `docs/IDEA.md` (15 lines, predates the intake template: no Tech stack / server / acceptance / locked-decisions / do-not-use / ask-first sections), `docs/PRD.md` (265 lines), `docs/DECISIONS.md`, `docs/STACK.md`. Not program mode, not change mode.

## BLOCK
(none)

## NOTE
1. [N1] PRD has no `## Intake check` section — evidence: `grep -in 'intake check' docs/PRD.md` → no match (headings run 1–9, 7b, 7c). The `Prototype:` line exists (PRD.md:46) and a Look & feel section exists (PRD.md:227). Not a BLOCK because the idea has none of the newer intake sections. The PRD does list what the idea left unstated, in 7b ("ไม่ได้ระบุ") and 9 Open questions, so the content is there without the section.
2. [N2] The date example in US-07 has the wrong weekday — evidence: PRD.md:100 `"อ. 7 ต.ค. 2569"`; `date -d 2026-10-07 +%A` → Wednesday (พ.), not Tuesday (อ.). It is only an illustration, but QA or dev could copy it as an expected string. Change the example to "พ. 7 ต.ค. 2569".
3. [N3] US-11 allows two behaviors for an empty month — evidence: PRD.md:120 `ไม่แสดงส่วนนี้ (หรือแสดง "ยังไม่มีรายจ่ายในเดือนนี้")`. QA cannot write one deterministic test. Pick one at SA or design.
4. [N4] Some acceptance bullets are rules and not Given/When/Then — evidence: US-05 line 88, US-06 lines 93/96, US-07 lines 100–102, US-08 line 106, US-09 line 112. Every story still has at least one testable G/W/T, and the rules are concrete, so this is not worth a fix loop.
5. [N5] Open questions Q2, Q3, Q4 and Q6 re-ask choices that DECISIONS already made with a default (balance without carry-over, fixed categories, demo data path) — evidence: PRD.md:261–265 vs DECISIONS.md:7, 6, 16. This is not silent decision-making, since the choices are logged and surfaced. The idea has no ask-first topics (no `ถ้าไม่แน่ใจ…` line), so nothing is hidden. The human can confirm or change them at the gate.
6. [N6] The idea's "AI เสนอ 3 แบบ" (Look & feel) is deferred to the design stage because the prototype is skipped — evidence: DECISIONS.md:13, PRD.md:46, 244, Q5. Choosing one of the 3 options therefore needs a human step after Gate 1. If the human wants to see the options as clickable screens, switch Q5 to include.
7. [N7] STACK.md's UI layer (shadcn/ui, Tailwind, recharts, `next/font`) is written for the Next.js stack, and the PRD says a client-only app ignores STACK.md — evidence: STACK.md:3 `A client-only app ... ignores this file`; PRD.md:224. No contradiction, but SA and design should state which UI conventions still apply to Vite. At minimum, the Thai-capable font, the theming toggle, and a simple bar list for US-11 are all in the PRD already.

## Checked
1. Coverage: ok. Every requirement bullet of the idea maps to a story.
   - Add with amount/type/category/date/note → US-01/02, §5.
   - Edit and delete → US-03/04.
   - Home balance, income and expense for the selected month → US-05/06.
   - History by month plus category filter → US-07/08.
   - Local data, no login, no server → US-09, §1 Platform.
   - Thai → §7 Localization.
   - The idea's exclusions (multi-user, sync, complex charts, export) are all listed under Non-goals, PRD.md:35–38.
2. No invention: ok. Additions not literally in the idea are each logged in DECISIONS:
   - Simple category bar list (US-11, DECISIONS:8). The idea only excludes "complex" charts, and the PRD keeps it simple.
   - Fixed category set (DECISIONS:6).
   - Buddhist-era dates (DECISIONS:9).
   - Light/dark toggle (DECISIONS:12).
   - Corrupt-storage handling (US-12, DECISIONS:14).
   - Future dates allowed and date bounds (DECISIONS:10).
   - Amounts stored in satang (DECISIONS:5).
3. Acceptance: ok, with N3 and N4. All 12 stories have G/W/T. The idea has no `เกณฑ์ผ่าน` section, so the PRD's own §8 criteria stand in for it.
4. Locked and constrained: ok. The idea has no locked decisions, `ห้ามใช้`, stack or server sections.
   - The PRD's tech constraint (Vite + TS + localStorage, no Next.js/NestJS/PostgreSQL, PRD.md:224) is consistent with the idea ("no server, no login") and with STACK.md:3.
   - No server is needed, so there is no architecture or RAM conflict. See N7.
   - Category counts match DECISIONS: 9 expense and 5 income (PRD.md:180–181 vs DECISIONS:6).
   - The satang ceiling is consistent: 9,999,999,999 = ฿99,999,999.99.
5. Asked-to-stop topics: ok. The idea has no `ถ้าไม่แน่ใจ…` topics. No money, permission or personal-data decision was made silently. Privacy is stated at PRD.md:53 and 220. See N5.
6. Intake check honest: see N1. The `Prototype:` line and the Look & feel section are present. 7b quotes the idea faithfully (`ให้ AI เสนอ 3 แบบ`), and Q1 covers the unstated items.
7. Internal consistency: ok. Story ids US-01…US-12 are unique. All TOC line ranges match the headings (20, 48, 55, 129, 164, 196, 217, 227, 246, 252, 259). No placeholders. See N2 for the one weekday slip.
