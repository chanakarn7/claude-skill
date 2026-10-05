# Autopilot — ทีม AI agent ที่ทำงานอัตโนมัติ

ใส่ไฟล์ไอเดียเข้าไป ทีม agent จะทำงานต่อเองตั้งแต่ PRD → blueprint → design → prototype (ข้ามได้) → code → QA/review → deploy
คนต้องเข้ามาแค่ **2 จุด**: อนุมัติ PRD (Gate 1) และอนุมัติก่อน deploy (Gate 2)

แยกจาก skill เดิม (`/ba`, `/sa`, `/kickoff` …) ทั้งหมด — skill เดิมไว้ใช้แบบคุยโต้ตอบ, autopilot ไว้ใช้แบบรันเอง

## ทีม

| Agent | ตำแหน่ง | เขียน |
|-------|---------|-------|
| PM (`autopilot.md`) | หัวหน้าทีม แจกงาน คุม state และ gate | `docs/pipeline/STATE.md` |
| `ba-agent` | Business Analyst | `docs/PRD.md` |
| `sa-agent` | System Architect | `docs/SA_BLUEPRINT.md` |
| `designer-agent` | UX/UI | `docs/UXUI_DESIGN.md` |
| `proto-agent` | Prototyper (optional — ดูบรรทัด `Prototype:` ใน PRD) | `docs/mockups/index.html` |
| `dev-agent` | Developer (TDD) | source + `docs/DEV_NOTES.md` |
| `qa-agent` | QA + เช็ก security/blueprint (แก้โค้ดแอปไม่ได้) | tests + `docs/QA_REPORT.md` |
| `devops-agent` | DevOps (หลัง Gate 2 เท่านั้น) | Dockerfile, CI, `docs/DEPLOY.md` |

```
idea ─▶ ba ─▶ ⏸ GATE 1 ─▶ sa ─▶ designer ─▶ proto ─▶ dev ─▶ qa ─▶ ⏸ GATE 2 ─▶ devops
                                                     ▲                    │
                                                     └── fix loop ≤ 2 ────┘
```

## วิธีใช้ (Windows)

```powershell
# 1. เริ่ม — รันจนถึง Gate 1 แล้วหยุด
.\autopilot\run.ps1 start .\my-idea.md -Project C:\work\my-app

# 2. อ่าน docs\PRD.md และ docs\DECISIONS.md (แก้ได้ตามใจ) แล้วอนุมัติ
.\autopilot\run.ps1 approve -Project C:\work\my-app      # รันต่อจนถึง Gate 2

# 3. ดูผล QA แล้วอนุมัติ deploy
.\autopilot\run.ps1 approve -Project C:\work\my-app

# ดูสถานะ / รันต่อหลังติด BLOCKED หรือเครื่องดับ
.\autopilot\run.ps1 status -Project C:\work\my-app
.\autopilot\run.ps1 resume -Project C:\work\my-app
```

Mac/Linux: `./autopilot/run.sh start my-idea.md ~/work/my-app` (คำสั่งเดียวกัน)

ลองกับตัวอย่าง: `autopilot/examples/expense-tracker.md`

## Program mode — งานใหญ่หลายโมดูล

สำหรับระบบที่ใหญ่เกินรอบเดียว (เช่น Team Capacity Tracker ฉบับเต็ม) ใช้ `/roadmap` วางแผนก่อน แล้วให้ autopilot ทำทีละโมดูล

```bash
# 1) ใน Claude: /roadmap  → ได้ docs/program/{VISION,ARCHITECTURE,DATA_MODEL,DESIGN_SYSTEM,ROADMAP}.md  (ขั้นนี้คุยกับคนเอง = Gate P)
autopilot program .          # 2) เริ่ม/ทำต่อ — หยุดเองที่ gate
autopilot approve .          # 3) อนุมัติ gate ที่ค้างอยู่ แล้วรันต่อ
```

autopilot ตรวจเจอ `docs/program/ROADMAP.md` เองถึงจะเข้าโหมดนี้ (และ `start` จะถูกปฏิเสธ) แต่ละโมดูลวิ่ง ba → sa → designer → (proto) → dev → qa เหมือนเดิม แต่เอกสารอยู่ที่ `docs/modules/<module>/` และใช้ข้อมูลกลางจาก `docs/program/` — **ไม่สร้างโค้ดใหม่ทุกรอบ** (scaffold เฉพาะโมดูล Foundation) และ **ไม่อ่านเอกสารของโมดูลอื่น** (อ่านผ่าน Entity Catalog ใน DATA_MODEL.md) เพื่อให้โมดูลท้ายๆ ไม่แพงกว่าโมดูลแรก

| Gate | เมื่อไหร่ | ใครอนุมัติ |
|---|---|---|
| **P** | ก่อนเริ่ม: แบ่งโมดูล/sprint, สถาปัตยกรรม, ดีไซน์, โครงข้อมูลกลาง | คน คุยกับ `/roadmap` |
| **M** (เงื่อนไข) | หลัง ba หรือ sa เมื่อมี `Risk flags:` หรือ `Breaking changes to built modules:` ที่ไม่ใช่ `none` | คน — ถ้าไม่มีความเสี่ยงจะไม่หยุด |
| **S** | ทุก sprint: ทุกโมดูลผ่าน QA + integration QA (`docs/program/SPRINT_<n>_QA.md`) | คน |
| **D** | ทุก sprint เสร็จ → ก่อนเตรียมไฟล์ deploy | คน |

ข้อจำกัด: โมดูลทำทีละตัว (ยังไม่มี parallel) · `ROADMAP.md` คือสถานะจริง (✅/🚧/⬜) และเป็นตัวที่ใช้ resume ข้าม session

## Change mode — ย้อนกลับไปแก้งานที่ทำแล้ว

เมื่อทำเสร็จแล้วอยากแก้ ("หน้าตาไม่สวย" หรือ "เพิ่ม requirement") ไม่ต้องเริ่มใหม่:

```bash
autopilot change "หน้าตาดูเหมือนเว็บยุค 90 อยากได้แนว Linear สะอาด เส้นบาง" .
autopilot change ./new-requirement.md .          # หรือส่งเป็นไฟล์
```

1. runner ตรวจว่า git สะอาด (ไม่นับ `docs/pipeline`) ถ้ามีงานค้างที่ยังไม่ commit จะปฏิเสธ เพื่อกันไม่ให้ทับงานที่แก้มือ แล้วติด tag **`pre-CR-NNN`** เป็นจุดย้อนกลับ และเขียนคำขอลง `docs/changes/CR-NNN.md`
2. **ba-agent วิเคราะห์ผลกระทบ**: ชนิดการเปลี่ยน (`visual` / `requirement` / `bug`), สิ่งที่โดน (US, หน้าจอ, ตาราง), และ **`Plan:` = ขั้นที่ต้องย้อนไปทำใหม่** (restyle = `3,4,5,6` · พฤติกรรมใหม่ = `2,3,4,5,6` · บั๊ก = `5,6`) ถ้าเป็น requirement จะแก้ PRD ในที่เดิม (US ใหม่ต่อเลขเดิม, ที่แก้ติด `[CR-NNN]`, ที่เลิกติด `[REMOVED]`)
3. **Gate C** หยุดให้คุณอนุมัติแผน (แก้บรรทัด `Plan:` ได้ ก่อนเสียงานแพงอย่าง dev/QA)
4. ขั้นที่เลือกทำงานใน **โหมดแก้ของเดิม**: ไม่สร้างใหม่, id เดิมคงที่, dev ทำ restyle ชั้น UI หรือเพิ่ม/แก้ตามเทสต์ (เทสต์ถดถอยทั้งระบบ), QA ทำ visual pass เต็ม
5. แล้วเข้า **Gate V** (ถ้าดีไซน์/prototype ถูกทำใหม่) และ **Gate 2** ตามปกติ

- **Gate C แสดงต้นทุน** (ตารางต่อขั้น + ทางเลือกที่ถูกกว่า) และ **คำถามที่ BA ไม่กล้าเดาแทนคุณ** — คำสั่งที่กว้างอย่าง "ให้สวยขึ้น" จะไม่ถูกตีความแคบเอง และชนิดงานมี `redesign` / `stack-change` เพิ่ม
- เปลี่ยนใจที่ Gate C: `autopilot change --amend "ข้อความใหม่" .` (วิเคราะห์ใหม่) หรือ `autopilot change --cancel .` (ทิ้ง CR คืนสถานะเดิม ไม่แตะโค้ด) — หลังอนุมัติแผนแล้วจะไม่ยกเลิกให้ (ให้ย้อนเองด้วย `git reset --hard pre-CR-NNN`)
- แก้โค้ดเองนอก autopilot (หรือจากแชทอื่น) แล้วเอกสารตามไม่ทัน: `autopilot status` จะเตือน และ `autopilot adopt .` ให้ designer อ่านโค้ดปัจจุบันแล้วอัปเดต `UXUI_DESIGN.md` ส่วน `change` จะอ่านงานนอกระบบเหล่านั้นให้เองจาก `docs/changes/CR-NNN.drift.txt`
- งานที่ต้องปรับแต่งรสนิยมทีละจุด (เช่น "ให้สวยขึ้น") ทำแบบ batch ได้ไม่ดีนัก: จะเลือกแก้ในแชทแบบโต้ตอบ + `preview` แล้ว `adopt` ก็ได้

ข้อจำกัด: ใช้ได้กับโหมดโปรเจกต์เดียว (โหมด program ใช้ `/roadmap` สำหรับ requirement ใหม่) · เปิดใช้ซ้อนทีละ CR · `runner` เติมหัวข้อ UI layer ลง `docs/STACK.md` เก่าให้อัตโนมัติ

## เมื่อ run สะดุด

- `autopilot status` บอกว่า process ยังรันอยู่ไหมจริงๆ (heartbeat) และเตือนถ้า STATE.md บอก `running` แต่ process ตายไปแล้ว
- เมื่อถูกฆ่า/ล้ม/ชนลิมิต/เน็ตหลุด runner จะเปลี่ยน `status: interrupted` และเขียนสาเหตุลง Log เป็น `BLOCKED(external) — network | rate-limit <เวลารีเซ็ต> | auth` (เวลาเป็น UTC `…Z` ทั้งหมด) แล้ว `autopilot resume .` ได้อย่างปลอดภัย
- dev-agent commit ทีละ user story และจด `docs/pipeline/DEV_PROGRESS.md` ทำให้ `resume` ข้ามส่วนที่เสร็จแล้วได้ ไม่ต้องทำขั้น dev ใหม่ตั้งแต่ต้น
- Log ของแต่ละขั้นมี usage (token / tool calls / เวลา) ให้ดูก่อนอนุมัติ gate ที่แพง
- runner เติม `docs/pipeline/.lock`, `.heartbeat`, `run-*.log` ลง `.gitignore` ให้ (ไฟล์ที่เคยถูก track อยู่แล้วต้องสั่ง `git rm --cached` เอง)
- `autopilot preview` เลือกพอร์ตว่างให้เอง (เริ่ม 3000/3001) และ `seed:demo` สร้างบัญชีเดโมทุกบทบาทที่ล็อกอินได้เลย
- ทุกการตัดสินใจที่ลด scope หรือเบี่ยงจากเอกสารมีแท็ก `[DEVIATION]` และ PM แสดงทุกรายการที่ทุก gate
- agent อ่านเอกสารเป็นส่วนๆ (สารบัญก่อน) ไม่โหลดทั้งไฟล์
- หมายเหตุ: `run.ps1` (Windows) ยังไม่ได้รับของใหม่รอบนี้ (`change --amend/--cancel`, `adopt`, drift, heartbeat/interrupted, จัดประเภท exit code)

## ด่านดีไซน์ (Gate V) และการตรวจภาพ

หลังเจอปัญหา "ฟังก์ชันครบแต่หน้าตาแย่" (บทเรียนจากโปรเจกต์ vela-ngan) ปรับให้มี **คนเห็นหน้าตาก่อนเขียนโค้ด** และให้ทุกขั้นตอน **มองภาพจริง**:

- **Gate V** หยุดหลัง prototype (ก่อน dev): เปิด `docs/mockups/index.html` + ภาพใน `docs/mockups/screens/` ดูก่อน ถ้าข้าม prototype จะเตือนที่ Gate 2
- **Look & feel ในไอเดีย** (ดู `idea-template.md`): เว็บอ้างอิง ความรู้สึก ที่ไม่เอา ลำดับหน้า สี/ฟอนต์ ธีม ชนิดกราฟ ข้อมูลตัวอย่าง ถ้าไม่ระบุ `/autopilot` ถามหนึ่งข้อ และถ้ายังไม่รู้ designer จะเสนอ **3 ทิศทางที่ต่างกันจริง** ใน `docs/DESIGN_OPTIONS.md` พร้อม `docs/mockups/options.html` เทียบหน้าเดียวกันสามแบบ — เปลี่ยนทิศทางโดยแก้บรรทัด `Chosen:` แล้ว `approve` (ระบบรัน designer+proto ใหม่หนึ่งรอบแล้วหยุดที่ Gate V อีกครั้ง)
- **proto-agent ต้อง render ไฟล์ตัวเองจริง** (Playwright, `templates/screenshot.mjs`) เก็บภาพ 1440/390 px × สว่าง/มืด ถ้า render ไม่ได้ = BLOCKED
- **dev-agent**: stack.md บังคับ shadcn/ui + icon family เดียว + next/font + recharts + ปุ่มสลับธีม ตรวจตัวเองก่อนจบ, เช็กภาพหลังทำ 2 หน้าแรก (`docs/pipeline/VISUAL_CHECK.md`), ข้อมูลเดโมครบทุกเคส (`seed:demo`, `npm run demo`) และถ้าตัดอะไรจาก design doc ต้องลง `[VISUAL-DEVIATION]`
- **qa-agent**: Visual pass บังคับ (ไม่มี fallback เงียบ) ถ่ายภาพจากแอปจริง อ่านภาพเอง ผลลง `## Visual` ใน QA_REPORT; ผล `PASS-WITH-GAPS` ถ้ายืนยันภาพบางส่วนไม่ได้
- **Gate 2** แสดงภาพหน้าจอ + รายการ `[VISUAL-DEVIATION]`; ไม่มีภาพ = BLOCKED · ใช้ `autopilot preview <project>` เปิดแอปจริงพร้อมข้อมูลเดโมก่อนอนุมัติ
- `autopilot status` บอกด้วยว่า process ยังรันอยู่ไหม และเมื่อชนลิมิตจะจดลง STATE.md Log
- designer-agent ใช้ `model: opus` (งานรสนิยมต้องการมากกว่า sonnet)

## โมเดลและต้นทุน

- `ba`, `sa`, `designer`, `dev` ใช้ `model: opus`; `proto`, `qa`, `devops` ใช้ `model: sonnet` (alias — จะได้รุ่นไหนขึ้นกับ model config ของเครื่อง ถ้าอยากล็อกรุ่นให้ใส่ model ID เต็มใน frontmatter)
- ตั้ง `effort` รายตัวใน frontmatter: ทุก agent = `medium` (ปรับได้ตั้งแต่ `low` ถึง `max`; ถ้าไม่ตั้งจะตาม session)
- ถ้าแอปเล็ก (≤3 หน้าจอ) ba-agent จะแนะนำ `Prototype: skip` ใน PRD — แก้เป็น `include` ได้ตอนอ่านที่ Gate 1

## Stack ตั้งต้น

แอปที่ต้องมี server/ข้อมูลร่วม/auth ใช้ `stack.md` เป็นค่าเริ่มต้น (copy ไปที่ `<project>/docs/STACK.md` แก้ต่อโปรเจกต์ได้):
**monorepo (npm workspaces)** `apps/web` (Next.js) + `apps/api` (NestJS + Prisma) + `packages/shared` (types/zod) + PostgreSQL + Docker
แอปฝั่ง client ล้วนยังใช้ Vite + localStorage เหมือนเดิม

- **ต้องเปิด Docker ไว้** ตอนรัน เพราะ dev/QA ใช้ Postgres จาก `docker-compose.dev.yml` (ไฟล์ตายตัวใน `templates/`, bind แค่ `127.0.0.1:5433`) ถ้า Docker ไม่ทำงานจะ BLOCKED ไม่แอบสลับเป็น SQLite
- สิทธิ์ docker ที่ agent มี: `docker build` และ `docker compose -f docker-compose.dev.yml ...` (ยกเว้น `run`/`exec`) — `docker run`, `docker push`, `aws`, `ssh`, `scp` ถูกห้าม
- devops-agent เตรียมไฟล์ deploy 2 ทาง: **Raspberry Pi** (arm64, build image นอกเครื่อง Pi) และ **AWS** (ECS/EC2 + RDS) ใน `docs/DEPLOY.md` — คนเป็นคนสั่ง deploy เอง

## กติกาความปลอดภัย

- **ไม่ถามคน** — ข้อมูลไม่พอ agent เลือกเองแล้วจดใน `docs/DECISIONS.md` ให้คนตรวจตอน gate
- รันด้วย `--permission-mode acceptEdits` — แก้ไฟล์ได้ แต่ Bash จำกัดแค่ npm/npx/node/git local/docker build
- **ห้ามเด็ดขาด** (deny list): `git push`, `npm publish`, `vercel`/`netlify`/`gh-pages` deploy, `docker push`/`docker run`, `aws`/`ssh`/`scp`
- devops-agent เตรียมไฟล์ deploy + คำสั่ง แต่ **ไม่ deploy จริง** — คนกดเอง
- agent ติดตั้งลง `<project>/.claude/agents/` ของแต่ละโปรเจกต์ ไม่แตะ `~/.claude`
- ทุก run เก็บ log ไว้ที่ `docs/pipeline/run-*.log`
