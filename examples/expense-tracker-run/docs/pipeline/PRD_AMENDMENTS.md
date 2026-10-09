# PRD amendments

## A1 — US-07 day-heading example has the wrong weekday   status: applied
Raised by: sa-agent   PRD location: §3 US-07, line 100   Kind: fact
Problem: The example "อ. 7 ต.ค. 2569" uses อ. (Tuesday). 7 Oct 2026 is a Wednesday. Evidence: `date -d 2026-10-07 +%A` → `Wednesday`; `new Intl.DateTimeFormat("th-TH-u-ca-buddhist",{weekday:"short",day:"numeric",month:"short",year:"numeric"}).format(new Date(2026,9,7))` → `พ. 7 ต.ค. 2569`. (Same as REVIEW_G1 B1.)
Proposed text: `- แต่ละกลุ่มวันมีหัวข้อวันที่ภาษาไทย ชื่อวันย่อมาจาก locale th-TH ของวันที่ของรายการ (เช่น "พ. 7 ต.ค. 2569")`

## A2 — US-11 behavior for a month with no expenses   status: applied
Raised by: sa-agent   PRD location: §3 US-11, line 120   Kind: choice
Problem: "ไม่แสดงส่วนนี้ (หรือแสดง "ยังไม่มีรายจ่ายในเดือนนี้")" allows two behaviors, so no single test can be written. (Same as REVIEW_G1 B2.) Hiding is chosen: the first-ever empty state (US-10) already shows its own message, and a second empty message would repeat it.
Proposed text: `- Given เดือนที่เลือกไม่มีรายจ่าย Then ไม่แสดงส่วนสัดส่วนรายจ่ายตามหมวด (ทั้งหัวข้อและลิสต์)`

## A3 — Date outside 2000-01-01..2099-12-31 in the form   status: applied
Raised by: sa-agent   PRD location: §3 US-02 line 70; §5 `date` row line 172   Kind: missing-rule
Problem: §5 bounds the date range, but US-02 does not say what the user sees for an out-of-range date. US-06 keeps month navigation unlimited (unchanged here).
Proposed text (append to US-02): `- Given วันที่อยู่นอกช่วง 2000-01-01 ถึง 2099-12-31 When กดบันทึก Then ไม่บันทึก และแสดง "กรุณาเลือกวันที่" (ตัวเลือกวันที่จำกัด min/max ตามช่วงนี้)`

## A4 — Accepted amount format and which message wins   status: applied
Raised by: sa-agent   PRD location: §3 US-02 lines 66–68; §6 comma row line 203   Kind: missing-rule
Problem: When several amount rules fail at once (e.g. "0.001": more than 2 decimals and below ฿0.01) the PRD does not say which single message to show, and "ไม่ใช่ตัวเลข" is not defined (e.g. "1e5", "-5", " 12 ").
Proposed text (append to US-02): `- ช่องจำนวนเงิน: ตัดช่องว่างหัวท้ายและจุลภาคออกก่อน แล้วรับเฉพาะตัวเลขอารบิก มีจุดทศนิยมได้หนึ่งจุด (เช่น "150", "150.5", ".5", "1,250.50"); แสดงข้อความเดียวต่อช่องตามลำดับ: (1) ว่าง/รูปแบบอื่น/ค่า ≤ 0 → "กรุณากรอกจำนวนเงินมากกว่า 0" (2) ทศนิยมที่พิมพ์เกิน 2 หลัก → "ทศนิยมได้ไม่เกิน 2 ตำแหน่ง" (3) เกิน 99,999,999.99 → "จำนวนเงินสูงเกินไป"; เช่น "0.001" → ข้อ 2, "0.00" → ข้อ 1`

## A5 — Home "recent" list: order, empty month, and "ดูทั้งหมด"   status: applied
Raised by: sa-agent   PRD location: §3 US-05 line 89; US-10 lines 115–116; US-08 line 107   Kind: missing-rule
Problem: (a) "รายการล่าสุด" does not say latest by entry date or by createdAt; (b) home has no specified content when the selected month is empty but other months have data; (c) "ดูทั้งหมด" does not say whether an active category filter is kept, and "ทั้งหมด" suggests it is not.
Proposed text (replace the US-05 last bullet): `- Given หน้าแรก Then แสดงรายการของเดือนที่เลือกไม่เกิน 5 รายการ เรียงแบบเดียวกับ US-07 (วันที่ล่าสุดก่อน แล้วเวลาที่สร้างล่าสุดก่อน) พร้อมลิงก์ "ดูทั้งหมด" ไปหน้ารายการของเดือนเดียวกันโดยตั้งตัวกรองเป็น "ทุกหมวด"; ถ้าเดือนที่เลือกไม่มีรายการแต่เดือนอื่นมี ให้ยอดทั้งสามเป็น "฿0.00" และแสดง "ไม่มีรายการในเดือนนี้" แทนลิสต์ (ไม่แสดงลิงก์ "ดูทั้งหมด")`

## A6 — US-11 percentage rounding mode   status: applied
Raised by: sa-agent   PRD location: §3 US-11 line 119   Kind: choice
Problem: "ปัดเป็นจำนวนเต็ม" names no rounding mode, and rounded rows may not sum to 100.
Proposed text (append to US-11 first bullet): `เปอร์เซ็นต์ปัดแบบครึ่งขึ้น (half-up, เช่น 12.5% → 13%) ผลรวมไม่บังคับให้เท่ากับ 100% และหมวดที่มีสัดส่วนน้อยกว่า 0.5% แสดง 0%`

## A7 — What "200 ตัวอักษร" counts in the note   status: applied
Raised by: sa-agent   PRD location: §3 US-02 line 71; §5 `note` row line 173; §6 emoji row line 208   Kind: choice
Problem: Thai vowels/tone marks are separate code points, and emoji are 2 UTF-16 units, so HTML `maxlength` (UTF-16 units), code points and graphemes give different limits and counters. Code points are chosen: same result in every browser (grapheme segmentation varies with ICU versions), and an emoji counts as 1.
Proposed text (append to US-02 note bullet): `นับความยาวเป็น Unicode code point หลัง trim (สระและวรรณยุกต์ไทยนับแยกตัว อีโมจิทั่วไปนับ 1); พิมพ์หรือวางเกิน 200 จะถูกตัดที่ 200 และตัวนับแสดง "n/200" ตามการนับเดียวกัน`

## A8 — Transaction id generator must work on a plain-HTTP LAN host   status: applied
Raised by: sa-agent   PRD location: §5 `id` row, line 170   Kind: fact
Problem: The row prescribes `crypto.randomUUID`, which browsers expose only in secure contexts (HTTPS or localhost). The static files may be served from a LAN machine over plain HTTP (STACK.md "Raspberry Pi first"; e.g. `http://192.168.1.20/`), which is not a secure context, so `crypto.randomUUID` is undefined there and adding an entry would throw. Evidence: TypeScript `lib.dom.d.ts` (MDN text) on `Crypto.randomUUID()`: "Available only in secure contexts."; `Crypto.getRandomValues()` carries no such restriction (WebCrypto IDL marks only `subtle` and `randomUUID` `[SecureContext]`).
Proposed text (§5 `id` row, Notes column): ``สร้างอัตโนมัติเป็น UUID v4 จาก `crypto.getRandomValues` (ใช้ได้ทั้ง HTTPS และ http บนเครือข่ายในบ้าน/สำนักงาน; ไม่ใช้ `crypto.randomUUID` ซึ่งมีเฉพาะ secure context), ไม่ซ้ำ``

## A9 — Note limit is applied to the trimmed text   status: applied
Raised by: sa-agent   PRD location: §3 US-02 line 71 (A7 sentence); §5 `note` row line 175   Kind: choice
Problem: US-02 counts code points "หลัง trim", but "พิมพ์หรือวางเกิน 200 จะถูกตัดที่ 200" does not say whether the cut applies to the raw field text or the trimmed text; with leading/trailing spaces the raw text can exceed 200 code points while the trimmed text is ≤ 200. §5 `note` row still says "0–200 ตัวอักษร" without the A7 counting rule. Chosen: the limit, the counter and the cut all use the trimmed text, so leading/trailing spaces never count and never cause a cut (spaces between words count).
Proposed text: (1) append to the US-02 note bullet: `ช่องว่างหัวท้ายไม่นับและไม่ทำให้ข้อความถูกตัด; เมื่อข้อความหลัง trim เกิน 200 จะเก็บไว้เพียง 200 code point แรกของข้อความหลัง trim (ช่องว่างระหว่างคำนับ)` (2) §5 `note` row Notes: `trim ช่องว่างหัวท้าย; 0–200 Unicode code point หลัง trim (นับแบบเดียวกับ US-02); ว่างได้`
