# Autopilot — ทีม AI agent ที่ทำงานอัตโนมัติ

ใส่ไฟล์ไอเดียเข้าไป ทีม agent จะทำงานต่อเองตั้งแต่ PRD → blueprint → design → prototype → code → review → QA → deploy
คนต้องเข้ามาแค่ **2 จุด**: อนุมัติ PRD (Gate 1) และอนุมัติก่อน deploy (Gate 2)

แยกจาก skill เดิม (`/ba`, `/sa`, `/kickoff` …) ทั้งหมด — skill เดิมไว้ใช้แบบคุยโต้ตอบ, autopilot ไว้ใช้แบบรันเอง

## ทีม

| Agent | ตำแหน่ง | เขียน |
|-------|---------|-------|
| PM (`autopilot.md`) | หัวหน้าทีม แจกงาน คุม state และ gate | `docs/pipeline/STATE.md` |
| `ba-agent` | Business Analyst | `docs/PRD.md` |
| `sa-agent` | System Architect | `docs/SA_BLUEPRINT.md` |
| `designer-agent` | UX/UI | `docs/UXUI_DESIGN.md` |
| `proto-agent` | Prototyper | `docs/mockups/index.html` |
| `dev-agent` | Developer (TDD) | source + `docs/DEV_NOTES.md` |
| `reviewer-agent` | Code reviewer (แก้โค้ดไม่ได้) | `docs/REVIEW.md` |
| `qa-agent` | QA (แก้โค้ดแอปไม่ได้) | tests + `docs/QA_REPORT.md` |
| `devops-agent` | DevOps (หลัง Gate 2 เท่านั้น) | Dockerfile, CI, `docs/DEPLOY.md` |

```
idea ─▶ ba ─▶ ⏸ GATE 1 ─▶ sa ─▶ designer ─▶ proto ─▶ dev ─▶ reviewer ─▶ qa ─▶ ⏸ GATE 2 ─▶ devops
                                                     ▲                    │
                                                     └── fix loop ≤ 3 ────┘
```

## วิธีใช้ (Windows)

```powershell
# 1. เริ่ม — รันจนถึง Gate 1 แล้วหยุด
.\autopilot\run.ps1 start .\my-idea.md -Project C:\work\my-app

# 2. อ่าน docs\PRD.md และ docs\DECISIONS.md (แก้ได้ตามใจ) แล้วอนุมัติ
.\autopilot\run.ps1 approve -Project C:\work\my-app      # รันต่อจนถึง Gate 2

# 3. ดูผล review/QA แล้วอนุมัติ deploy
.\autopilot\run.ps1 approve -Project C:\work\my-app

# ดูสถานะ / รันต่อหลังติด BLOCKED หรือเครื่องดับ
.\autopilot\run.ps1 status -Project C:\work\my-app
.\autopilot\run.ps1 resume -Project C:\work\my-app
```

Mac/Linux: `./autopilot/run.sh start my-idea.md ~/work/my-app` (คำสั่งเดียวกัน)

ลองกับตัวอย่าง: `autopilot/examples/expense-tracker.md`

## กติกาความปลอดภัย

- **ไม่ถามคน** — ข้อมูลไม่พอ agent เลือกเองแล้วจดใน `docs/DECISIONS.md` ให้คนตรวจตอน gate
- รันด้วย `--permission-mode acceptEdits` — แก้ไฟล์ได้ แต่ Bash จำกัดแค่ npm/npx/node/git local/docker build
- **ห้ามเด็ดขาด** (deny list): `git push`, `npm publish`, `vercel`/`netlify`/`gh-pages` deploy, `docker push`
- devops-agent เตรียมไฟล์ deploy + คำสั่ง แต่ **ไม่ deploy จริง** — คนกดเอง
- agent ติดตั้งลง `<project>/.claude/agents/` ของแต่ละโปรเจกต์ ไม่แตะ `~/.claude`
- ทุก run เก็บ log ไว้ที่ `docs/pipeline/run-*.log`
