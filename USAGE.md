# วิธีใช้ชุดสกิลนี้ (อ่านอันนี้ก่อน)

## 1. เรียกใช้ยังไง
- **ในแชท Claude Code:** พิมพ์ `/ชื่อสกิล` ตามด้วยสิ่งที่ต้องการ เช่น `/kickoff อยากได้ระบบจองห้องประชุม` หรือ `/autopilot ./idea.md`
- **ในเทอร์มินัล (เฉพาะ autopilot):** `autopilot <คำสั่ง> ...` (alias ที่ชี้ไป `~/.claude/skills/autopilot/run.sh`)
- สกิลอยู่ที่ `~/.claude/skills/` (ติดตั้งจาก repo นี้) ต้องเปิดแชทใหม่หลังอัปเดตจึงเห็นรายการสกิลล่าสุด
- สกิล `*-cloud` มีไว้ใช้ใน cloud session เท่านั้น ไม่ต้องสนใจบนเครื่องตัวเอง

## 2. ใช้ตัวไหนเมื่อไหร่

| สถานการณ์ | ใช้ |
|---|---|
| ไอเดียยังคลุมเครือ อยากถูกซักก่อน | `/grill-me` |
| ทำโปรเจกต์ใหม่ **ทีละขั้น คุยโต้ตอบเอง** | `/kickoff` (เรียก `/ba` → `/sa` → `/uxui` → `/proto` → `/scaffold` → `/dev` → `/qa` → `/devops` ให้ตามลำดับ) |
| ระบบใหญ่หลายโมดูล (ERP, ระบบโรงพยาบาล ฯลฯ) | `/roadmap` วางแผน แล้วทำโมดูลด้วย `/kickoff` หรือ `autopilot program` |
| อยากให้ **ทีม agent ทำเอง** หยุดให้คนตรวจที่ gate | `/autopilot` หรือ `autopilot start` |
| ต้องการแค่เอกสาร/ชิ้นเดียว | สกิลเดี่ยว: `/ba` (PRD) · `/sa` (blueprint) · `/uxui` (ดีไซน์) · `/proto` (ต้นแบบ) · `/dev` · `/qa` · `/devops` |
| แก้โปรเจกต์ที่ทำเสร็จแล้ว (ขอแก้ดีไซน์/requirement เพิ่ม) | `autopilot change "…"` หรือทำมือตามหัวข้อ "ขอแก้งาน" ใน `/kickoff` |

## 3. autopilot: คำสั่งและ gate

```bash
autopilot start idea.md .          # เริ่ม (พิมพ์ผลตรวจ intake ให้ดูก่อน) หยุดที่ Gate 1
autopilot approve .                # อนุมัติ gate ที่ค้างอยู่ แล้วรันต่อ
autopilot status .                 # ดู gate ปัจจุบัน และว่า process ยังรันอยู่ไหม
autopilot resume .                 # รันต่อหลังหยุดกลางทาง (เน็ตหลุด ชนลิมิต ปิดเครื่อง)
autopilot preview .                # เปิดแอปที่สร้างแล้วพร้อมข้อมูลเดโม
autopilot change "ข้อความ" .       # ขอแก้ของที่ทำแล้ว (--amend แก้คำขอ, --cancel ยกเลิก)
autopilot adopt .                  # เอกสารตามไม่ทันโค้ดที่แก้มือ ให้ designer อัปเดต
autopilot program .                # ระบบใหญ่ตาม docs/program/ROADMAP.md (ทำด้วย /roadmap)
```

| Gate | เมื่อไหร่ | คุณทำอะไร |
|---|---|---|
| 1 | PRD เสร็จ | อ่าน `docs/PRD.md` + `docs/DECISIONS.md` แล้ว approve |
| V | prototype เสร็จ (ก่อนเขียนโค้ด) | เปิด `docs/mockups/index.html` ดู (เลือกทิศทางโดยแก้ `Chosen:` ใน `DESIGN_OPTIONS.md`) |
| 2 | dev + QA เสร็จ | ดู `docs/QA_REPORT.md` และภาพใน `docs/pipeline/screens/` แล้ว approve (ยังไม่ deploy ให้) |
| C | วิเคราะห์ผลของ `change` เสร็จ | ดู `docs/changes/CR-NNN.md` (แผน ต้นทุน คำถาม) |
| M / S / D | โหมด program: โมดูลเสี่ยง / จบ sprint / จบทั้งหมด | อ่านสรุปแล้ว approve |

ไม่มีปุ่ม "ปฏิเสธ": ถ้าไม่พอใจให้แก้ไฟล์ของ gate นั้นแล้วค่อย approve

## 3b. UI kit (คลังคอมโพเนนต์กลาง เช่น jb-components)
ใส่บรรทัด `UI kit:` ในหัวข้อ Tech stack ของ intake (git URL + ref, path ในเครื่อง หรือชื่อที่ลงทะเบียนไว้) แล้ว autopilot จะ: หา kit (path ก่อน ถ้าไม่มีก็ clone จาก git URL) → ถ้า kit ไม่มี `kit.json` (jb-components มีแล้ว) ให้ `kit-agent` อ่านเอกสารครั้งเดียวแล้วเขียน manifest ให้ตรวจที่ Gate 1 (`docs/pipeline/KIT_NOTES.md`) → dev ติดตั้งด้วย `install-kit.mjs` และต้องใช้คอมโพเนนต์ของ kit (ไม่มี shadcn) → `check-dev` ตรวจว่าไม่เขียนปุ่ม/ช่อง/ตารางเอง และไม่แก้ไฟล์ของ kit
- ดูผลการหา kit โดยไม่รันอะไร: `autopilot kit .`
- ลงทะเบียนชื่อสั้นครั้งเดียว (ย้ายเครื่องแล้วเปลี่ยนแค่ไฟล์นี้) ที่ `~/.claude/autopilot.json`:
  `{ "defaultKit": "jb-components", "kits": { "jb-components": { "git": "https://github.com/<owner>/jb-components", "ref": "main", "path": "/Users/me/Documents/GitHub/jb-components" } } }`
- ตัวอย่างพร้อมรัน: `autopilot/examples/meeting-room-booking-jb.md`
- ใช้ได้ทั้งกับ `autopilot` และสกิลที่สั่งเอง: `/kickoff` ค้นหา kit ครั้งเดียวก่อนขั้น `/ba` แล้ว `/ba`, `/sa`, `/uxui`, `/proto`, `/scaffold`, `/dev`, `/qa` ปรับตาม kit (ไม่ใช้ shadcn) `/roadmap` ตั้ง kit ที่ระดับโปรแกรมใน Sprint 0
- ข้อจำกัด: ใช้กับโปรเจกต์ Next เท่านั้น และโหมด kit ข้าม prototype ตามค่าเริ่มต้น (ดูผลหน้าตาที่ Gate 2)

## 4. ก่อนรันครั้งแรก
- ต้องล็อกอิน `claude` CLI (`claude auth status`) และเปิด Docker ถ้าแอปมี server/ฐานข้อมูล
- เขียน intake ตาม `autopilot/idea-template.md` (ตัวอย่างเต็ม: `autopilot/examples/meeting-room-booking.md`, อธิบายหัวข้อใน `autopilot/examples/README.md`) แล้วเช็กด้วย `node autopilot/templates/check-intake.mjs ไฟล์.md` ได้ก่อนเสีย token
- **ทำโปรเจกต์ในโฟลเดอร์ถาวร (เช่น `~/work/`) ไม่ใช่ `/tmp`** macOS ล้างไฟล์ใน `/tmp` ที่ไม่ได้ใช้เกิน ~3 วัน (เคยทำให้โปรเจกต์ทดสอบหาย)

## 5. อ่านต่อที่ไหน
| ต้องการ | ไฟล์ |
|---|---|
| รายละเอียด autopilot (ทีม agent, change/adopt/program, ตัวตรวจ) | `autopilot/README.md` |
| agent แต่ละตัวทำอะไร | `autopilot/agents/*.md` |
| stack มาตรฐาน | `autopilot/stack.md` |
| ตัวอย่างผลรันจริง (ถึงขั้น proto) | `examples/expense-tracker-run/` |
| สรุปงานและผลทดสอบล่าสุด | `docs/HANDOFF_SESSION.md`, `docs/HANDOFF_CLOUD_SESSION.md` |

## 6. สถานะความน่าเชื่อถือ (ตามที่ทดสอบจริง)
- **ทดสอบแล้ว:** ตัวตรวจด้วยเครื่อง, วงจร dev → QA → fix loop → QA รอบ 2 (ผ่าน agent ที่สั่งเอง), `change` ถึง Gate C
- **ยังไม่เคยรันครบวงจรผ่าน `autopilot start` + PM จริง:** โหมด program, `change` ทุกขั้น, ตัวอย่าง `meeting-room-booking`
- `run.ps1` (Windows) ตามหลัง `run.sh` อยู่
