# ตัวอย่างผลรัน autopilot-cloud: expense-tracker (BA → SA → designer → proto → reviewer)

สแนปช็อตของโปรเจกต์ทดลองที่รันใน cloud session วันที่ 7-9 ต.ค. 2026 เก็บไว้ให้ **เอาไปทดสอบต่อได้เลย** (บน Mac หรือ cloud session ใหม่) โดยไม่ต้องรันขั้น BA → proto ใหม่ ซึ่งใช้ราว 1.2M token

ที่มาและบริบทของงานทั้งหมดอยู่ใน `docs/HANDOFF_CLOUD_SESSION.md` ไฟล์นี้อธิบายเฉพาะตัวอย่างนี้

## สถานะของ run ตอนที่เก็บ

| ขั้น | สถานะ |
|---|---|
| 1 BA | เสร็จ PRD 12 stories (`docs/PRD.md`) |
| Gate 1 | **ไม่เคยอนุมัติ** (`gate1: pending`) run ข้ามไปทดสอบขั้นถัดไปตามคำสั่งผู้ใช้ และบรรทัด `Prototype:` ใน PRD ถูกสลับ skip → include |
| 2 SA | เสร็จ blueprint 13 หัวข้อ + `docs/contracts/modules.d.ts` PRD amendment A1-A9 ถูกยกโดย SA และถูก ba-agent (โหมด amend) ใช้กับ PRD แล้ว |
| รีวิว blueprint | PASS (NOTE `[human]` 4, `[agent]` 7) |
| 3 designer | เสร็จ `Direction: Banknote` 5 หน้า (`docs/UXUI_DESIGN.md`, `docs/DESIGN_OPTIONS.md`) |
| 4 proto | เสร็จ `docs/mockups/index.html`, `options.html`, screenshot 72 ใบ |
| รีวิว Gate V | **BLOCK 1 ข้อ (B1)** ยอดรวมซ้อนปุ่ม "ล้างตัวกรอง" บนหน้ารายการที่กรองแล้วที่ 390 px (`docs/mockups/index.html` บรรทัด ~211-213) **ยังไม่ได้ส่งกลับให้ proto-agent แก้** นี่คือจุดที่ run หยุด |
| 5-7 dev / QA / DevOps | ยังไม่ได้ทำ |

## แผนผังไฟล์

```
docs/IDEA.md, PRD.md, SA_BLUEPRINT.md, UXUI_DESIGN.md, DESIGN_OPTIONS.md, DECISIONS.md, STACK.md
docs/contracts/modules.d.ts                  contract ของแอป client-only
docs/mockups/index.html, options.html        prototype (+ screens/ 72 ภาพ + report.json, screens/options/)
docs/pipeline/STATE.md                       สถานะที่แก้ให้ตรงกับความจริงแล้ว
docs/pipeline/PRD_AMENDMENTS.md              A1-A9 ทั้งหมด status: applied
docs/pipeline/REVIEW_G1.md                   รีวิว Gate 1 รอบหลัง (BLOCK 2: ตัวอย่างวันผิด, เดือนว่างแบบ "หรือ")
docs/pipeline/REVIEW_GB.md                   รีวิว blueprint ล่าสุด (PASS)
docs/pipeline/REVIEW_GV.md                   รีวิว Gate V (BLOCK B1)
docs/pipeline/templates/                     ตัวตรวจ + screenshot.mjs (สำเนาของ autopilot-cloud ซึ่งใช้ Chromium ของ container ถ้ามี ไม่งั้นใช้ของ playwright)
history/                                     ผลรุ่นก่อนไว้เทียบ
```

`history/`
- `PRD.round0-before-amendments.md` PRD ก่อนใช้ amendment ใดๆ (มีข้อผิด 2 ข้อที่ reviewer จับได้)
- `REVIEW_G1.round1-pass.md` รีวิว Gate 1 รอบแรก (PASS 7 NOTE) เทียบกับ `docs/pipeline/REVIEW_G1.md` (BLOCK 2) เพื่อดูผลของเกณฑ์ BLOCK ใหม่
- `REVIEW_GB.first-run-pass.md` รีวิว blueprint รอบแรก (PASS 9 NOTE ก่อนมีป้าย `[human]/[agent]`)
- `run1-sa-before-amendment-mechanism/` blueprint และ contract จาก SA รอบแรก (347 บรรทัด) ที่ SA แก้ข้อผิดของ PRD ใน blueprint เองและจดเป็น `[DEVIATION]` ใช้เทียบกับรอบที่ใช้กลไก amendment

## เริ่มทดสอบต่อ

```bash
cp -r examples/expense-tracker-run ~/work/expense-tracker-run && cd ~/work/expense-tracker-run
git init -q && git add -A && git commit -qm "snapshot"                    # ให้มี git diff ไว้ดูผลการแก้
npm install --no-save --prefix docs/pipeline playwright yaml              # สองตัวพร้อมกัน (ติดทีละตัวจะลบตัวก่อนหน้า)
npx --prefix docs/pipeline playwright install chromium                     # บน Mac; ใน cloud ที่มี /opt/pw-browsers/chromium ข้ามขั้นนี้
```

**ตรวจว่าสแนปช็อตสมบูรณ์** (ตัวตรวจทั้งสามต้องผ่านด้วยข้อความนี้):
```bash
node docs/pipeline/templates/check-contract.mjs   . docs   # contract ok: 12 stories served, 0 declared uncovered
node docs/pipeline/templates/check-amendments.mjs . docs   # amendments ok: 9 entries, 8 downstream markers, 0 warning(s)
node docs/pipeline/templates/check-design.mjs     . docs   # design ok: 5 screens, 38 palette colors, 0 warning(s)
```

### ทดสอบที่ 1: รอบส่งกลับ + reviewer รอบ 2 (ยังไม่เคยรัน)
เป้า: ยืนยันกติกา `round: 2` (ตรวจเฉพาะ diff) และวัดต้นทุนเทียบ reviewer รอบเต็ม (~116k token ที่ Gate V)
1. เก็บสำเนา: `mkdir -p docs/pipeline/snapshots/GV && cp docs/mockups/index.html docs/mockups/options.html docs/pipeline/snapshots/GV/`
2. ส่ง proto-agent (sonnet) แก้เฉพาะ B1 โดยใช้ `docs/pipeline/REVIEW_GV.md` เป็นรายการแก้ แล้ว capture screenshot ของหน้า list ที่เปลี่ยนใหม่ และรัน `check-design`
3. ส่ง reviewer-agent (sonnet) ด้วย `gate: V`, `round: 2`, snapshot path และรายงานเดิม
4. คาดหวัง: B1 ถูกยืนยันว่าแก้แล้ว (เปิดภาพ `list-filtered-mobile-light/dark.png` ใหม่), ไม่มี BLOCK ใหม่จาก diff, ต้นทุนน้อยกว่ารอบเต็มชัดเจน
5. ถ้า reviewer ตรวจนอก diff หรือเรียกอ่านเอกสารทั้งชุดซ้ำ แปลว่ากติกา round 2 ใน `reviewer-agent.md` ต้องเข้มขึ้น

### ทดสอบที่ 2: ต่อไปถึง dev / QA / DevOps
เป้า: ดู dev-agent และ qa-agent ใช้ contract, Acceptance verification (blueprint §11) และเกณฑ์ผ่านได้จริงไหม (ส่วนนี้ยังไม่ได้ปรับให้ตรวจด้วยเครื่อง)
1. ตั้ง `gate1: approved`, `gateV: approved` ใน `docs/pipeline/STATE.md` (หรือใช้ `run.sh approve` บน Mac) หลังแก้ B1
2. รัน dev-agent ด้วย brief ตาม `autopilot.md` ขั้น 5 (blueprint บอกให้ scaffold ใน `.scaffold/` แล้วคัดลอกขึ้นมา **ห้ามใช้ `create-vite --overwrite` ที่ root ของโปรเจกต์ เพราะจะลบ `docs/`**)
3. ดูว่า dev สร้าง type จาก `docs/contracts/modules.d.ts`, ทุก `US-xx` มี test และ QA เขียน contract test ตามที่ระบุ

### ทดสอบที่ 3: ตัวตรวจด้วยเครื่อง (ไม่ใช้ token)
- ทำให้ผิดเอง: ลบป้าย `[amend A2]` ใน PRD, ใส่สี `#ff0000` ใน `index.html`, แก้ ratio ใน Contrast pairs แล้วรันตัวตรวจทั้งสามเพื่อดูว่าจับได้ (เคยทดสอบแล้วบนชุดจำลองเล็กกว่านี้)
- ลองเพิ่มตัวตรวจ "องค์ประกอบทับกัน" ใน `screenshot.mjs` (เทียบ `getBoundingClientRect`) แล้วดูว่าจับ B1 ได้ไหม (งานค้างข้อ 2 ใน handoff)

## ปัญหาที่รู้แล้วในตัวอย่างนี้ (ไม่ใช่ข้อผิดพลาดของสแนปช็อต)

- **B1** ตามข้างบน เป็น BLOCK เดียวที่ค้าง
- NOTE `[human]` ที่ Gate V: ทิศทาง Banknote เป็นการเลือกของ AI ไม่มีคนยืนยัน, หน้า options ไม่มีภาพโหมดมืด, ช่องวันที่ใช้ `<input type="date">` แสดงปีคริสต์แบบสหรัฐ ขัดกับ UI ที่ใช้พุทธศักราช, prototype โหลด Google Fonts
- PRD §9 Q5 ยังเขียนว่า prototype เป็น skip ทั้งที่บรรทัด `Prototype:` เป็น include เพราะผู้ใช้สลับเพื่อทดสอบ
- `docs/DECISIONS.md` ยาวขึ้นเรื่อยๆ ตามขั้นที่รัน ถือเป็นตัวอย่างขนาดจริงของ log ที่ reviewer และ PM ต้องอ่านแบบเลือกท่อน
- screenshot แบบเต็มหน้าบนมือถือแสดง tab bar/ปุ่ม + กลางหน้า เป็นผลของการ capture ไม่ใช่เลย์เอาต์ผิด

## ต้นทุนของขั้นที่ผ่านมา (token รวมต่อ subagent)

BA 79k · reviewer Gate 1 82-84k · SA 128-136k · BA amend 77-87k · reviewer blueprint 133-143k · SA แก้ NOTE 122k · designer 150k · proto 205k · reviewer Gate V 116k เวลารวมประมาณ 55 นาที (ขั้นละ 1-12 นาที)
