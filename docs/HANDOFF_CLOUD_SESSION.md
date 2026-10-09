# ส่งต่องานจาก cloud session กลับไป MacBook

เขียนเมื่อ 9 ต.ค. 2026 เป็นสรุปของ cloud session ที่ต่อจาก `docs/HANDOFF_SESSION.md` (ฉบับนั้นคือ Mac → cloud ฉบับนี้คือ cloud → Mac) ข้อมูลทุกข้อมาจากสิ่งที่ทำและทดสอบใน session นี้ ส่วนที่ยังไม่ได้ทดสอบระบุไว้ในหัวข้อ "ยืนยันแล้ว / ยังไม่ยืนยัน"

## เริ่มต้นบน Mac

```bash
cd /Users/macbookair/Documents/GitHub/claude-skill
git status                                  # ดูก่อนว่ามีงานค้างในเครื่องไหม
git fetch origin && git checkout main && git pull origin main
git log --oneline -8                        # ต้องเห็น e567d01 (หรือใหม่กว่า)
```
- ทุกอย่างอยู่ใน `main` แล้ว (ไม่มี branch แยก) commit ที่เกี่ยวข้อง: `fa0d44e` `c806c47` `f344426` `959a9e6` `9dde08e` `68fa65a` `e567d01`
- ถ้า Mac ยังมี commit ที่ไม่ได้ push (เช่น branch `feat/autopilot-visual-gates-change-mode`) ให้ `git log origin/main..HEAD` ดูก่อน แล้ว merge แทนการ pull ทับ
- ที่ใช้งานจริงบน Mac คือ `~/.claude/skills/` (handoff เดิมบอกว่า autopilot เป็น git repo แยก) ต้องซิงก์จาก repo นี้ไปที่นั่น:
  `rsync -a --delete autopilot/ ~/.claude/skills/autopilot/` และ `rsync -a <สกิล>/ ~/.claude/skills/<สกิล>/` สำหรับ `ba sa uxui proto kickoff roadmap grill-me scaffold dev qa devops` ตรวจชื่อปลายทางก่อน ถ้า `~/.claude/skills` เป็น clone ของ repo นี้อยู่แล้ว ใช้ `git pull` ตรงนั้นพอ
- `.claude/skills/*-cloud` ใช้เฉพาะ cloud session ปล่อยไว้ได้ ไม่กระทบ Mac

## ที่ทำใน session นี้

1. **สกิลสำหรับ cloud (`-cloud`)** ใน `.claude/skills/`: `ba-cloud sa-cloud uxui-cloud proto-cloud dev-cloud qa-cloud devops-cloud scaffold-cloud kickoff-cloud roadmap-cloud grill-me-cloud` และ `autopilot-cloud`
   - สกิลธรรมดา → `-cloud` สร้างด้วย `sed` (เติม `-cloud` ในชื่อและลิงก์ภายใน)
   - `autopilot-cloud` ให้ session เป็น PM แล้วส่งงานแต่ละขั้นเป็น subagent ผ่าน Agent tool (ไม่มี `claude -p` ซ้อน) gate คือผู้ใช้ตอบในแชท
2. **Intake เดียว** (`autopilot/idea-template.md` → `docs/IDEA.md`): requirement, เกณฑ์ผ่าน, look & feel, tech stack & ข้อจำกัด, เซิร์ฟเวอร์และการ deploy, การตัดสินใจที่ล็อกแล้ว, ถ้าไม่แน่ใจให้ agent... ตัวเปิดงาน (`/autopilot`, `/kickoff`) ตรวจช่องว่างแล้วถามครั้งเดียว ทุก agent อ่านจากไฟล์นี้
3. **reviewer-agent** (`autopilot/agents/reviewer-agent.md`) ตรวจอิสระก่อน Gate 1 และ Gate V และตรวจ blueprint อัตโนมัติหลังขั้น SA (ไม่หยุดรัน): ติดป้าย NOTE เป็น `[human]`/`[agent]` (gate summary แสดงเฉพาะ `[human]`), ส่งกลับเจ้าของงาน 1 รอบเมื่อ BLOCK, รอบ 2 ตรวจเฉพาะ diff จาก snapshot, BLOCK ที่ยังไม่ผ่านจะ "carry forward" ไป gate ถัดไป (`[review][UNRESOLVED]` ใน DECISIONS) Gate B ถูกเอาออกแล้ว
4. **PRD amendment**: ถ้า SA/designer/proto/dev/qa เจอข้อผิดของ PRD ห้ามแก้อ้อมๆ ให้เขียนใน `docs/pipeline/PRD_AMENDMENTS.md` (ชนิด fact / choice / missing-rule), เขียนงานต่อบนข้อความที่เสนอ (ป้าย `[PRD-AMEND An]`), PM ส่ง ba-agent โหมด `amend` แก้ PRD (ป้าย `[amend An]`) และแสดงที่ gate ถัดไป (กฎ 11 ใน `autopilot.md`) ถ้าต้องกลับพฤติกรรมที่ PRD เขียนชัดเจน ให้ `BLOCKED` ไม่ใช่ amendment
5. **sa-agent**: blueprint 13 หัวข้อ (Stack, Architecture, Data model, Contracts, Validation, Folder, Testing, Security checklist, Capacity & fit, Traceability, Acceptance verification, ADR-lite, Operations) contract ที่เครื่องอ่านได้ (`docs/contracts/openapi.yaml` หรือ `modules.d.ts`) และตรวจ API ที่ใช้ได้เฉพาะ HTTPS กับวิธีเสิร์ฟจริง
6. **designer/proto**: `UXUI_DESIGN.md` ต้องมีตาราง Screens ที่ครอบคลุมทุก `US-xx`, `## Contrast pairs` (คำนวณจริง), Look & feel map; prototype ต้องมี `data-screen="<screen-id>"` และใช้สีจาก token เท่านั้น; screenshot ตั้งชื่อ `<screen-id>-<desktop|mobile>-<light|dark>.png`
7. **ตัวตรวจด้วยเครื่อง (ไม่ใช้ LLM)** ใน `autopilot/templates/`:
   - `check-contract.mjs` (contract parse ได้, story id มีจริง, `$ref` resolve, Error schema เดียว, ทุก story มีที่อยู่) OpenAPI ต้อง `npm install --no-save --prefix docs/pipeline yaml`
   - `check-amendments.mjs` (ไม่มีรายการ open, ป้ายตรงกัน)
   - `check-design.mjs` (contrast, story↔หน้า, `data-screen`, ลิงก์, สีนอก token, screenshot ต่อหน้า)
   - PM รันก่อนเรียก reviewer ถ้าล้มให้ข้าม reviewer แล้วส่งกลับเลย
8. **`stack.md`**: ส่วน UI layer ใช้ได้ทั้ง Next.js และ Vite (แอป client-only ข้ามเฉพาะส่วน server); `run.sh` เพิ่ม `docs/pipeline/snapshots` ใน `.gitignore` และรองรับ `approve` ที่ gate เดิม
9. **สกิลโต้ตอบ** `ba`, `sa`, `uxui`, `proto` เขียนใหม่ให้ใช้มาตรฐานเดียวกับ agent (อ่าน intake, ซักเฉพาะช่องว่าง, โครงเอกสารเดียวกับ agent, amendment) ส่วน `dev`, `qa`, `devops`, `scaffold` โต้ตอบ **ยังไม่ได้ปรับ**

## ผลทดสอบ (โปรเจกต์ทดลอง expense-tracker แอป client-only)

โฟลเดอร์ `test-projects/` ถูก ignore (ไม่ตามมา Mac) แต่สแนปช็อตของ run นี้เก็บไว้ครบที่ **`examples/expense-tracker-run/`** (PRD, blueprint, contract, design, prototype พร้อม screenshot 72 ใบ, รายงาน reviewer, `history/` ผลรอบก่อนไว้เทียบ) พร้อมขั้นตอนทดสอบต่อใน `examples/expense-tracker-run/README.md` — ใช้เป็นจุดเริ่มทดสอบรอบส่งกลับของ reviewer และขั้น dev/QA ได้เลยโดยไม่ต้องรัน BA → proto ใหม่

| ขั้น | ผล | ใช้ |
|---|---|---|
| BA (PRD) | 12 stories, ตั้ง `Prototype: skip` | ~2m44s / 79k token |
| reviewer Gate 1 | รอบแรก PASS; รอบหลังเพิ่มเกณฑ์ ได้ BLOCK 2 ข้อ (ตัวอย่างวันผิดวัน, พฤติกรรมเดือนว่างเป็น "หรือ") | ~1m / 82-84k |
| SA | blueprint 254-347 บรรทัด ผ่าน `check-contract` 12 story; รอบหลังเพิ่มกลไก amendment: ยก 7 ข้อเป็น amendment ไม่แก้ PRD | 6-7.5m / 128-136k |
| BA โหมด amend | แก้ PRD ครบ ติดป้าย `[amend An]` | ~1-1.3m / 77-87k |
| reviewer Gate B | PASS ไม่มี BLOCK, NOTE 4 `[human]` + 7 `[agent]` | 3.5-4m / 133-143k |
| SA แก้ NOTE | ยก amendment เพิ่ม A8 (id generator ใช้ `crypto.randomUUID` ไม่ได้บน HTTP), A9 | 3.5m / 122k |
| designer | Banknote / Night Market / Plain Ledger เลือก Banknote 5 หน้า, 53 contrast pairs ผ่านตัวตรวจ | 7.8m / 150k |
| proto | 5 หน้า, 72 screenshot, ผ่าน `check-design` | 11.9m / 205k |
| reviewer Gate V | **BLOCK 1 ข้อ** (ยอดรวมซ้อนปุ่ม "ล้างตัวกรอง" บนมือถือ — ตัวตรวจด้วยเครื่องไม่เห็น reviewer เห็นจากภาพ ผมยืนยันแล้ว) + NOTE 4 `[human]` 5 `[agent]` | 1.7m / 116k |

ต้นทุนรวมก่อนเขียนโค้ดแอปเล็กหนึ่งตัวประมาณ 1.2M token (รวมรอบทดสอบซ้ำของ SA ซึ่งปกติไม่เกิด)

## ยืนยันแล้ว / ยังไม่ยืนยัน

- **ยืนยันแล้ว (รันจริงใน cloud):** BA → SA → designer → proto → reviewer ผ่าน Agent tool, กลไก amendment ครบวงจร (SA ยก → BA แก้ → reviewer เทียบ), ตัวตรวจ 3 ตัวทั้งกรณีผ่านและไม่ผ่าน, ป้าย `[human]/[agent]`, `screenshot.mjs` กับ Chromium ใน container, PostgreSQL 16 ในเครื่อง cloud ใช้ได้
- **ยังไม่เคยรัน:** รอบส่งกลับ (แก้ B1 แล้ว reviewer รอบ 2 แบบ diff + snapshot), dev/QA/DevOps ผ่านระบบใหม่, `run.sh` บน Mac กับของใหม่ทั้งหมด, `run.ps1` (Windows ยังขาดฟีเจอร์ใหม่ส่วนใหญ่), program mode กับ reviewer, `change` mode กับ reviewer/amendment, `autopilot-cloud` แบบเริ่มจาก `/autopilot-cloud` ครบทุกขั้นถึง Gate 2
- **ข้อจำกัดของ cloud ที่พบ:** Docker daemon ไม่ทำงานโดยปริยาย (สั่ง `dockerd` เองได้ แต่ pull image ไม่ได้) จึงใช้ PostgreSQL ในเครื่อง (`service postgresql start`); ติดตั้ง `playwright` กับ `yaml` ด้วย `--no-save` ทีละตัวจะลบตัวก่อนหน้า ต้องติดตั้งพร้อมกัน

## งานค้าง / ข้อเสนอ

1. แก้ B1 ในโปรเจกต์ทดลองแล้วทดสอบ reviewer รอบ 2 (diff-only) เพื่อวัดต้นทุนจริงของกติกาลดต้นทุน
2. เพิ่มตัวตรวจ "องค์ประกอบทับกัน" ใน `screenshot.mjs` (เทียบกล่องด้วย `getBoundingClientRect`) เพื่อให้เครื่องจับกรณี B1 ได้เอง
3. เขียน `tools/sync-cloud.sh` สร้าง `-cloud` จากต้นฉบับให้อัตโนมัติ (ตอนนี้ทำด้วย `sed`/`cp` ด้วยมือ ซึ่งเสี่ยงลืมไฟล์) `autopilot-cloud/SKILL.md` กับ `templates/screenshot.mjs` เป็น cloud-only ห้ามคัดลอกทับ
4. ปรับ `dev-agent`/`qa-agent` ตามแนวเดียวกับ SA/designer (ตัวตรวจเครื่องก่อน QA: build/lint/test ผ่านและทุก `US-xx` มี test; ตารางความครอบคลุมจาก Traceability) และสกิลโต้ตอบ `dev qa devops scaffold`
5. ปรับ `run.ps1` ให้เท่ากับ `run.sh` และหัวข้อข้อกำหนดนอกฟังก์ชัน/integration ภายนอกใน sa-agent (ทำเมื่อมีงานที่มี integration จริง)
6. ปรับตัวตรวจ `check-design.mjs` ถ้าพบว่าเข้มเกินจริงกับโปรเจกต์อื่น (เช่นสีที่ไม่อยู่ใน token จะเป็น error)
7. ตัดสินใจเรื่อง reviewer ว่าจะให้ amendment ชนิด choice/missing-rule ต้องหยุดถามคนหรือไม่ (ตอนนี้ไม่หยุด แค่แสดงที่ gate ถัดไป)

## ความชอบของผู้ใช้ที่เจอใน session นี้

- ไม่ต้อง commit/push จนกว่าจะสั่ง ("อะไรก็ตามถ้ายังไม่สั่ง ยังไม่ต้อง commit") ทำงานบน `main` ได้ ไม่ต้องแยก branch
- ให้คนเข้ามาใน loop น้อยที่สุดแต่คุณภาพต้องอยู่: gate ประจำ 3 ตัว (หลัง BA, หลัง proto, หลัง dev) ไม่เพิ่ม gate ใหม่ ใช้ reviewer + ตัวตรวจด้วยเครื่องแทน
- ชอบตรวจด้วยของจริง (เครื่อง/ภาพ) มากกว่าให้ LLM อ่านซ้ำ และกังวลเรื่องต้นทุน token
- ทำทีละอย่าง บอกผลทดสอบตามจริง รวมถึงข้อที่ยังไม่ได้ทดสอบ

## คำถามที่เหมาะจะคุยต่อ

- จะลดต้นทุนก่อนเขียนโค้ด (~1.2M token ต่อแอปเล็ก) ต่ออีกอย่างไร: ตัด reviewer ที่ Gate V เมื่อตัวตรวจเครื่องผ่าน, หรือให้ proto ทำน้อยลง (ปัจจุบัน proto ใช้ 205k)
- จะผูกตัวตรวจเครื่องของฝั่ง dev (build/test/traceability) เข้ากับ Gate 2 อย่างไร
