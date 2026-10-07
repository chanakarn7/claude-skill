# สรุปสำหรับยกไปคุยใน cloud session

เขียนเมื่อ 7 ต.ค. 2026 จากบทสนทนาพัฒนา autopilot (Claude Code, เครื่อง Mac) เนื้อหาเป็นข้อเท็จจริง ณ ตอนที่เขียน ส่วนที่ยังไม่ได้ยืนยันระบุไว้ในหัวข้อ "ยืนยันแล้ว / ยังไม่ยืนยัน"

## บริบท
ผมกับคุณพัฒนา **autopilot** ซึ่งเป็นทีม AI agent ที่รันแบบ headless (`claude -p`) ทำงานตั้งแต่ไอเดียไปจนเตรียมไฟล์ deploy และใช้ **VelaNgan (เวลางาน)** ซึ่งเป็นเครื่องมือจัดตารางทีมกับ capacity เป็นโปรเจกต์ทดลอง ตัวโปรเจกต์ไม่ใช่เป้าหมายหลัก เป้าหมายคือพัฒนาตัว autopilot เอง

## ที่อยู่ของงาน
- **repo สกิล:** `/Users/macbookair/Documents/GitHub/claude-skill` สาขา `feat/autopilot-visual-gates-change-mode` มี 2 commit ล่าสุด `5c10b85` (grill-me) และ `0df767f` (autopilot) ยังไม่ push ยังไม่ merge เข้า `main`
- **สำเนาที่ใช้งานจริง:** `~/.claude/skills/autopilot/` (git repo แยก sync ไว้แล้วให้ตรงกับ commit ล่าสุด)
- **โปรเจกต์ทดลอง:** `/Users/macbookair/Documents/GitHub/vela-ngan` สาขา `feat/ui-refresh-charts-seed` มีเอกสาร `docs/AUTOPILOT_IMPROVEMENTS.md` และ `docs/AUTOPILOT_FIELD_REPORT_2.md` ที่เขียนจากการใช้จริง
- **requirement:** `~/Downloads/requirement.md` (v0.3, มี v0.1/v0.2 เก็บไว้) ตรวจเลขกับไฟล์ Excel แล้ว และมีภาคผนวก A เป็นข้อมูลทดสอบ

## autopilot ตอนนี้ทำงานยังไง
สายงาน: `ba → sa → designer → (proto) → dev → qa → devops` โดยคนเข้ามาที่ gate เท่านั้น
- **Gate 1** อนุมัติ PRD · **Gate V** ดู prototype ก่อนเขียนโค้ด · **Gate 2** ดูผล QA และภาพหน้าจอก่อนเตรียม deploy · **Gate C** อนุมัติแผนของ change request
- **agent:** reviewer ถูกตัดออก ให้ qa ตรวจความปลอดภัยและความตรงกับ blueprint แทน, fix loop สูงสุด 2 รอบ, ba/sa/designer/dev ใช้ Opus ส่วน proto/qa/devops ใช้ Sonnet, effort `medium` ทั้งหมด
- **stack ตั้งต้น:** monorepo (Next.js + NestJS + Prisma) + PostgreSQL + Docker, เตรียม deploy สำหรับ Raspberry Pi (arm64) ก่อน และ AWS เมื่อขายจริง ใช้ shadcn/ui และไอคอนชุดเดียว
- **ความปลอดภัย:** Docker ใช้ได้เฉพาะ `docker build` กับ compose ของ dev, ห้าม `git push`, publish, `aws`, `ssh`, `docker run`
- **คำสั่ง:** `start`, `approve`, `resume`, `status`, `preview` (เลือกพอร์ตว่างเอง), `change "<คำขอ>"` (ย้อนกลับไปแก้งานที่ทำแล้ว), `change --amend/--cancel`, `adopt` (ให้เอกสารตามโค้ดที่แก้นอกระบบ), `program` (งานใหญ่หลายโมดูลจาก `/roadmap`)
- **เรียกผ่านแชท:** `/autopilot <ไอเดีย|พาธ>` หรือ alias `autopilot` ในเทอร์มินัล

## ที่ทำไปในการคุยนี้
1. อ่านและทำความเข้าใจ grill-me กับ autopilot แล้วลดต้นทุน (ตั้งโมเดล, ลด loop, ตัด reviewer, proto เลือกได้ที่ Gate 1)
2. เพิ่ม stack Docker, `templates/docker-compose.dev.yml` แบบตายตัว และ `/autopilot` skill
3. เพิ่ม **program mode** (อ่าน `ROADMAP.md` ทีละโมดูล, gate M/S/D)
4. หลังรันจริงที่ vela-ngan หน้าตาแย่ จึงเพิ่ม Gate V, Look & feel template, designer เสนอ 3 ทิศทาง, proto ต้อง render จริงด้วย Playwright, QA ถ่ายภาพจริง, `[VISUAL-DEVIATION]`
5. เพิ่ม **change mode** ตามที่ผู้ใช้อยากย้อนกลับไปแก้งาน
6. รายงานฉบับที่ 2 จากการใช้จริง ทำให้เพิ่ม runner ที่ทนทานขึ้น (heartbeat, สถานะ `interrupted`, จัดประเภท network/rate-limit/auth, เวลา UTC, `.gitignore`), checkpoint ทีละ story ใน dev, Gate C ที่แสดงต้นทุนและคำถาม, `--amend/--cancel`, `adopt`, `[DEVIATION]`, อ่านเอกสารเป็นส่วนๆ

## ผลจากการใช้จริงของ vela-ngan
- **รอบแรก:** ฟังก์ชันครบและ test 167 ตัวผ่าน แต่หน้าเว็บแย่เพราะไม่มีใครมองหน้าจอจริง และคุณเห็นหน้าตาครั้งแรกหลัง Gate 2 หลักฐานอยู่ในเอกสารสองฉบับข้างต้น
- **CR-001:** BA ตีความ "สวย" แบบอนุรักษ์ในรอบแรก จึงใช้ `--amend` เขียนใหม่เป็น Phase 1 (ออกแบบ + prototype เท่านั้น) สไตล์ล็อก Modern Flat และเสนอ Team Schedule 3 แบบ ตอนที่ดูล่าสุด designer และ proto ทำเสร็จแล้ว (proto มี 38 ภาพ) เหลือขั้นให้คนเลือกที่ Gate V เป็น CR แรกที่ผ่านระบบใหม่
- **แผนต่อ:** Phase 2 ขึ้นไปเป็น `change` แยกต่อหน้า (Plan `5,6`) เริ่มที่ Team Schedule

## ต้นทุน token (จาก transcript จริง ไม่ใช่ประมาณการ)
- รวม output ของ pipeline ราว 780k token: dev ~385k (รัน 5 รอบ เพราะ resume ทำขั้นใหม่ทั้งขั้น), proto ~178k, designer ~90k, ba ~54k, sa ~47k, qa ~24k
- แชทโต้ตอบที่คุณใช้เองใหญ่กว่าขั้น dev ของ pipeline ทั้งหมด (output ~520k)
- ตารางต้นทุนใน `CR-NNN.md` เป็นแค่ประมาณการของ BA ไม่ใช่ยอดจริง และการให้ PM จด usage ลง STATE ไม่ได้ผล ข้อมูลจริงอยู่ที่ `~/.claude/projects/<โปรเจกต์>/` และ `subagents/*.jsonl`
- ตัวเลขเป็นจำนวน token ไม่ใช่เงินหรือโควตา

## ยืนยันแล้ว / ยังไม่ยืนยัน
- **ทดสอบแล้ว** (ด้วย `claude` ปลอม): ตรรกะของ `run.sh` ทั้งหมด (gate mapping, status, change/amend/cancel/adopt, การจัดประเภทข้อผิดพลาด, `.gitignore`, drift)
- **ใช้จริงแล้ว** (โดย vela-ngan): `change` ถึง Gate C, `--amend`, ขั้นออกแบบ + prototype ของ CR-001
- **ยังไม่เคยรันจริง:** Gate V ที่คนอนุมัติจริง, dev/QA ในโหมดแก้ของเดิม, visual pass ของ QA, `preview`, `adopt`, program mode, `screenshot.mjs` กับ Chromium
- **`run.ps1` (Windows)** ยังไม่ได้รับฟีเจอร์ใหม่ส่วนใหญ่ (เครื่องปัจจุบันเป็น Mac)

## งานค้าง / ข้อเสนอ
1. `autopilot usage .` อ่าน transcript แล้วต่อท้าย `docs/pipeline/USAGE.md` และให้ Gate C เทียบประมาณการกับยอดจริง (เสนอไว้ รอคำตอบ)
2. ทำ Phase 2 ของ vela-ngan เริ่มที่ Team Schedule แล้วดู QA visual pass และต้นทุนจริง
3. โหมดออกแบบวนซ้ำสำหรับงานรสนิยม ("ให้สวยขึ้น") ปัจจุบันเสนอทางเลือกแก้ในแชทแล้ว `adopt` เท่านั้น
4. ปรับ `run.ps1` ให้เท่ากับ `run.sh`
5. merge สาขา `feat/autopilot-visual-gates-change-mode` เข้า `main` และ push เมื่อพร้อม
6. ตรวจว่า alias ของโมเดล (`opus`/`sonnet`) ได้รุ่นที่ตั้งใจจริงไหม transcript แสดง `opus-5-5` และ `sonnet-5`

## ความชอบของผู้ใช้ที่ควรจำ
ใช้ Opus กับ Sonnet เท่านั้น (ไม่ใช้ Haiku), effort medium, ใช้ stack Next + Nest + Docker + PostgreSQL แบบ monorepo, UI ภาษาไทย, กังวลเรื่องต้นทุน token, อยากให้คนเห็นหน้าตาก่อนเขียนโค้ด, ไม่ต้องการให้ BA ตีความคำสั่งแบบแคบเอง

## คำถามที่เหมาะจะถาม cloud session
- จะวัดต้นทุนจริงต่อ run ให้ถาวรยังไงดีที่สุด
- จะให้ dev ทำทีละหน้าโดยไม่รันขั้นแพงซ้ำได้อย่างไร
- การออกแบบแบบวนซ้ำควรอยู่ใน autopilot หรืออยู่ในแชทแบบโต้ตอบ

หมายเหตุ: cloud session น่าจะเข้าถึงไฟล์ในเครื่องไม่ได้ จึงควรแปะไฟล์นี้ทั้งก้อนไปด้วย
