# Review — Gate B (round 1)
Verdict: PASS
Owner to fix: none required (notes N1-N4 are for sa-agent, optional)

Scope: `docs/IDEA.md` (15 lines, predates the intake template: no Tech stack, server, เกณฑ์ผ่าน, locked-decisions or ถ้าไม่แน่ใจ sections, so those checks were judged against what the idea and the PRD contain), `docs/PRD.md` (267 lines, amended), `docs/SA_BLUEPRINT.md` (254), `docs/contracts/modules.d.ts` (352), `docs/pipeline/PRD_AMENDMENTS.md`, `docs/DECISIONS.md`, `docs/STACK.md`. Fresh review, not program mode, not change mode. Nothing outside this file was edited.

## Contract checker (check 2)
```
$ node docs/pipeline/templates/check-contract.mjs . docs
contract ok: 12 stories served, 0 declared uncovered
exit=0
```
The contract is a TypeScript `.d.ts` and the app has no API, so the `yaml` package was not needed for this run. No findings.

## PRD fidelity table (check 6)
`grep -n 'PRD-AMEND'` finds 21 markers in the blueprint and contract. `grep -n 'status: open' docs/pipeline/PRD_AMENDMENTS.md` returns nothing: all seven entries read `status: applied`. Each amendment was compared with the `[amend A<n>]` line now in `docs/PRD.md`.

| Amend | PRD text now (line) | Blueprint / contract | Match |
|---|---|---|---|
| A1 | PRD:102 weekday "ชื่อวันย่อมาจาก locale th-TH", example "พ. 7 ต.ค. 2569" | contract:170 same example for 2026-10-07; blueprint §7 line 156 same | ok. Re-verified: `date -d 2026-10-07 +%A` → Wednesday; Node `Intl th-TH-u-ca-buddhist` → "พ. 7 ต.ค. 2569" |
| A2 | PRD:122 month with no expenses → breakdown heading and list hidden, no either/or | contract:235 "Empty array → section hidden" | ok |
| A3 | PRD:73 date outside 2000-01-01..2099-12-31 → not saved, "กรุณาเลือกวันที่", picker min/max | blueprint §3 line 80, §5 line 121 (`min="2000-01-01" max="2099-12-31"`, same message); contract:175 | ok |
| A4 | PRD:74 trim, strip commas, ASCII digits, one decimal point; order: (1) empty/other/≤0 → required (2) typed decimals >2 (3) >99,999,999.99 | contract:127-128 regex `/^\d+(\.\d*)?$\|^\.\d+$/` and same order; `MESSAGES` strings match PRD exactly (13 strings grepped in PRD and contract, all found); blueprint §5 line 119 | ok. Examples hold: "0.001" has value >0 and 3 decimals → rule 2; "0.00" → rule 1 |
| A5 | PRD:91 home list ≤5, same order as US-07, "ดูทั้งหมด" sets filter "ทุกหมวด", empty month → ฿0.00 + "ไม่มีรายการในเดือนนี้", no link | contract:225, 240, 341; blueprint §4 lines 107, 112; `MESSAGES.emptyMonth` exists | ok (see N2, N4) |
| A6 | PRD:121 half-up (12.5% → 13%), sum not forced to 100, <0.5% shows 0% | contract:46 and 235 "round-half-up", "sum not forced to 100"; blueprint §7 "half-up percent" | ok. Node check: `Math.round(12.5)` → 13; exact .5 values are exactly representable, so no float risk |
| A7 | PRD:71 code points after trim, truncate at 200, counter "n/200" same count | blueprint §3 line 81, §5 line 122; contract:24, 188 | ok (see N3). Verified: "😀" = 1 code point, "ที่" = 3 |

Other fidelity checks:
- No blueprint/contract statement overrules the approved PRD without an amendment entry. The only `[DEVIATION]` in the blueprint is the §8 usability proxy (`SA_BLUEPRINT.md:215`, `DECISIONS.md` sa DEVIATION line); it is logged openly and the PRD criterion is kept as "optional human test". See N5.
- No rejected amendment exists.
- Blueprint §4 table, §5 table, contract strings and PRD wording were compared for the rest of the stories (US-01 to US-12): no other conflict found. Messages, storage keys (`expense-tracker:v1`, `:v1:corrupt-<timestamp>`, `:theme`), integer satang range, category ids (9 + 5), US-12 behaviors and the F1 sheet/dialog split agree with PRD §3-§6.

## BLOCK
None.

## NOTE
1. [N1] Stale "pending" wording. The blueprint and contract still describe the amendments as not yet in the PRD. — evidence: `SA_BLUEPRINT.md:4` "Pending PRD amendments: A1–A7 ... every use is marked `[PRD-AMEND An]`"; `modules.d.ts:4` "follows a pending amendment" — all seven are `status: applied` and present in the PRD as `[amend A<n>]`. — suggestion: reword to "applied", keep or drop the markers; harmless to the build.
2. [N2] The A5 contract comment on `navigate` does not match its signature. — evidence: `modules.d.ts:341` "Navigate; from home 'ดูทั้งหมด' sets filter 'all' first, a US-11 row sets that category first" but `navigate(route: Route)` at line 344 takes no filter, so it cannot know which link was used. Dev should call `setCategoryFilter(...)` then `navigate(...)`. — suggestion: say that in the comment. Also `MESSAGES.emptyMonth` `@stories` (line 83) lacks US-05 although A5 now uses it on home.
3. [N3] A7 leaves an order question. — evidence: `SA_BLUEPRINT.md:122` "input handler truncates to 200 code points" and `modules.d.ts:188` "trimmed, max 200 code points"; PRD:71 counts "หลัง trim". With leading spaces the raw text can exceed 200 code points while the trimmed text is 200. The handler cannot trim while typing (it would eat spaces between words). Suggest stating: counter and limit use the trimmed value, truncate after trim on paste/blur. PRD §5 `note` row (PRD:175) still says "0–200 ตัวอักษร" without "code point"; not a conflict, but A7's location list named it.
4. [N4] The §7 test plan does not list the new amended behaviors one by one. — evidence: `SA_BLUEPRINT.md:153-163` has the parse cases, heading, half-up and empty-state items, but no explicit case for "ดูทั้งหมด" resetting the filter, the home empty-month view without the link (A5), the hidden breakdown in a month without expenses (A2), or the out-of-range date picker min/max and message (A3). US-05 and US-11 rows in §10 say "unit + E2E" only. Covered by "A1–A7 as amended" in §11 row 1, so not a BLOCK; add the four cases so qa-agent writes them.
5. [N5] For the human at the gate: §11 weakens two PRD §8 success metrics. Row 3 replaces the "30 s, usability test 3–5 people" metric (PRD:255) with an agent-runnable proxy (≤5 interactions) (`SA_BLUEPRINT.md:215`); row 2 (`:214`) measures "≤4 interactions" but has no measurement for the "≤10 s" half of PRD:256. Both are visible and the human test stays optional. If the human wants the PRD itself to say the proxy is the acceptance test, raise it as an amendment.
6. [N6] Browser floor vs Tailwind v4. — evidence: PRD:223 "Safari iOS 16+"; `SA_BLUEPRINT.md:30` "Tailwind CSS v4". As far as I know Tailwind v4 targets Safari 16.4+, Chrome 111+, Firefox 128+ (cannot verify offline, so NOTE), which would exclude iOS 16.0–16.3. Row 5 tests only a "WebKit (iOS profile)". Either use Tailwind 3.4 or have the human accept 16.4+.
7. [N7] `crypto.randomUUID()` (PRD:170; `SA_BLUEPRINT.md:76`) exists only in secure contexts (HTTPS or localhost). STACK.md's Raspberry Pi target may serve the static files over plain HTTP on a LAN address, where adding an entry would throw. Suggest a fallback id generator or a note for devops to serve over HTTPS.
8. [N8] Operations. `SA_BLUEPRINT.md:252-253` states no backup, no restore for users, and "RPO/RTO: N/A". This is a client-only app with no server data and the PRD non-goals exclude export (Q4 open in PRD:265), so it is not the "data-bearing server app" BLOCK; the human should still see at Gate 1 that clearing browser data loses everything. Health check is HTTP 200 on `/index.html` with no threshold (acceptable for a static host).
9. [N9] Minor, unverifiable or cosmetic. (a) "localStorage ~5 M UTF-16 units per origin (Chrome/Firefox/Safari)" (`:183`) differs between browsers and is unverifiable here; the arithmetic is right (242 units measured for a 27-char note, 415 for a 200-char note; 3,650 × 260 = 949,000; 5,000 × 260 = 1.3 M; 3 M / 260 ≈ 11,538 rows; 9,007,199,254,740,991 / 9,999,999,999 ≈ 900,719 entries). (b) `npx shadcn@latest init` (`:46`) prompts unless run with defaults flags; STACK.md asks for non-interactive scaffold commands. (c) ADR-1 and ADR-3 `Revisit when` are events ("multi-currency is added"), not numbers; ADR-2 and ADR-4 are measurable. (d) Bundle estimate ~120 KB gzip is a plausible sum (60 + 25 + 10 + 5 + 20) but unmeasured until `npm run size`.

## Checked
1. Story coverage: ok. `grep -o 'US-[0-9]*' docs/PRD.md | sort -u` → US-01..US-12 (12 ids). All 12 are in `Traceability` (§10, lines 194-205) with modules and "Verified by"; "Uncovered stories: none"; the checker confirms 12 served. See N4 for test-detail gaps.
2. Contracts: ok. Checker output above (exit 0). §4 operations match `modules.d.ts` exports; every export carries `@stories`; entities (Transaction, StoreV1, Category) exist in §3; `categoryId` points at the fixed 14 categories; field types agree across §3, contract and PRD §5; PRD has one role (§2) and §8 covers it; error shapes are uniform (`FieldErrors`, `SaveResult`). Minor: N2.
3. Fit to the machine: ok. No server or tech stack in the idea; client-only matches STACK.md line 3 and PRD:226. Numbers recomputed (see N9a). Verdict FITS holds: 5,000 rows ≈ 1.3 M units, bundle ≈ 120 KB of 200 KB. No "ห้ามใช้" item exists. See N6, N7 for compatibility notes.
4. Security checklist: ok. Every line answered; each N/A has a reason; personal data (notes, amounts) is named in the privacy line; no server-side enforcement is needed (no server, PRD §2).
5. Definition of done: ok. The idea has no เกณฑ์ผ่าน; §11 rows 1-12 map to PRD §7/§8 criteria, each with command/data/expected. No vague row. See N5.
6. PRD fidelity: ok (table above). No BLOCK; no open amendment; stale "pending" wording is N1.
7. Scope: ok. Nothing from the PRD non-goals added (no backend, auth, export, custom categories, search, PWA); all 12 stories kept.
8. Key decisions: ok. 4 ADRs, each with a real rejected alternative; they agree with §1-§4, `DECISIONS.md` and the idea. See N9c.
9. Operations: ok with N8.
10. Form: ok. Blueprint TOC ranges match the headings (23, 53, 72, 99, 115, 132, 153, 165, 176, 191, 209, 226, 251); PRD TOC ranges also still match after the amendments (20, 48, 55, 131, 166, 198, 219, 229, 248, 254, 261). No placeholder sections. Mermaid in §2 is plausible. `npm create vite@latest`, `@tailwindcss/vite`, `npx shadcn@latest` are real CLIs (see N9b).
