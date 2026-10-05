# ส่งมอบงาน: Autopilot ทีม AI agent ที่ทำงานอัตโนมัติ

> อัปเดต 2026-10-04 · เครื่องที่จะใช้จริง: **MacBook (macOS)**

## สิ่งที่ได้

ทีม AI 8 ตำแหน่ง มี "PM" อีกตัวคอยแจกงาน รับไฟล์ไอเดียหนึ่งไฟล์แล้วทำต่อเองจนได้แอปที่ทดสอบแล้ว คนต้องเข้ามาตัดสินใจแค่ 2 จุด

```
ไอเดีย → BA เขียน PRD → ⏸ คนอนุมัติ (Gate 1)
      → SA ออกแบบระบบ → Designer → ต้นแบบ → Dev เขียนโค้ด → QA (รวมเช็ก review)
      → ⏸ คนอนุมัติก่อน deploy (Gate 2) → DevOps เตรียมไฟล์ deploy
```

- ไม่ต้องตอบคำถามระหว่างทาง ถ้าข้อมูลไม่พอ agent จะเลือกเองแล้วจดเหตุผลไว้ใน `docs/DECISIONS.md` ให้คนตรวจตอนอนุมัติ
- ถ้า QA เจอปัญหา จะส่งกลับให้ Dev แก้เองได้สูงสุด 2 รอบ
- หยุดกลางทางได้ (เครื่องดับ หรือ usage limit เต็ม) แล้วสั่ง `resume` ให้ทำต่อจากจุดเดิม
- **ระบบจะไม่ deploy หรือ push ขึ้นที่ไหนเองเด็ดขาด** คำสั่งพวก `git push`, `npm publish`, `docker push` และคำสั่ง deploy ถูกบล็อกไว้ ขั้น DevOps แค่เตรียมไฟล์กับคำสั่งให้คนกดเอง
- แยกจาก skill เดิม (`/ba`, `/sa`, `/kickoff` …) ทั้งหมด skill เดิมยังใช้แบบคุยโต้ตอบได้ตามปกติ

## ผลทดสอบจริง (แอปบันทึกรายรับรายจ่าย ทดสอบบน Windows)

| ขั้น | ผล |
|---|---|
| PRD | 9 user stories, agent ตัดสินใจเอง 12 ข้อ ใช้เวลาประมาณ 3 นาที |
| ออกแบบ + ต้นแบบ | ดีไซน์ "Calm Pocket Ledger" 4 หน้าจอ ต้นแบบกดเล่นได้ |
| โค้ด | React + TypeScript เก็บข้อมูลในเครื่อง build ผ่าน |
| Review | อนุมัติ ไม่มีปัญหาร้ายแรง |
| QA | **ผ่าน 381/381 tests** (ตามรายงานของ QA agent) |

จากอนุมัติ Gate 1 จนเทสต์ผ่านใช้เวลาประมาณ 45 นาที ยังไม่ได้ทดสอบขั้น DevOps (Gate 2)

## ติดตั้งบน MacBook (ทำครั้งเดียว)

1. ติดตั้ง **Node.js** (LTS) จาก nodejs.org หรือใช้ `brew install node`
2. ติดตั้ง Claude Code แล้ว login:
   ```bash
   npm install -g @anthropic-ai/claude-code
   claude          # พิมพ์ /login แล้ว sign in ในเบราว์เซอร์ เสร็จแล้วพิมพ์ /exit
   ```
3. ดึง repo นี้ลงเครื่อง: `git clone` (หรือ `git pull` ถ้ามีอยู่แล้ว)
4. (ไม่บังคับ) ติดตั้ง Docker Desktop ถ้าอยากให้ขั้น DevOps ลอง build image จริง

## วิธีใช้บน Mac

```bash
# 1) เริ่มงาน: รันจนถึง Gate 1 แล้วหยุด
./autopilot/run.sh start my-idea.md ~/work/my-app

# 2) อ่าน ~/work/my-app/docs/PRD.md กับ DECISIONS.md (แก้ได้) แล้วอนุมัติ
./autopilot/run.sh approve ~/work/my-app

# 3) ดูผล QA แล้วอนุมัติขั้น deploy
./autopilot/run.sh approve ~/work/my-app

# ดูสถานะ / ทำต่อหลังหยุดกลางทาง
./autopilot/run.sh status ~/work/my-app
./autopilot/run.sh resume ~/work/my-app
```

ไฟล์ไอเดียเขียนเป็นภาษาไทยธรรมดาได้เลย ดูตัวอย่างที่ `autopilot/examples/expense-tracker.md`
(บน Windows ใช้ `.\autopilot\run.ps1` ด้วยคำสั่งเดียวกัน แต่ใส่โฟลเดอร์ด้วย `-Project <dir>`)

## สิ่งที่ต้องมี

- บัญชี Claude ที่ login ใน Claude Code แล้ว **ไม่ต้องใช้ API key หรือรหัสผ่านอื่น**
- usage ของบัญชี: งานขนาดแอปเล็กหนึ่งตัวกิน usage เยอะพอสมควร ตอนทดสอบ limit เต็มกลางทางหนึ่งครั้ง (สั่ง resume ทำต่อได้)

## ข้อควรรู้ / สิ่งที่ยังไม่เสร็จ

- ⚠️ **ยังไม่เคยรันบน Mac จริง** สคริปต์ `run.sh` เช็ค syntax แล้ว และเขียนให้ใช้กับเครื่องมือของ Mac ได้ แต่ทดสอบจริงแล้วแค่ฝั่ง Windows ครั้งแรกบน Mac ควรลองกับตัวอย่าง expense-tracker ก่อน
- ⚠️ **ยังไม่ได้ทดสอบขั้น DevOps (Gate 2)**
- ⚠️ ตอนทดสอบ Dev agent **commit โค้ดไม่ผ่าน** เพราะติดสิทธิ์ แก้คำสั่งให้ agent แล้ว แต่ยังไม่ได้รันทดสอบซ้ำ
- **อย่ากด approve ซ้ำซ้อน** ตอนทดสอบเคยกดพร้อมกัน 2 ที่ ตอนนี้มีตัวล็อกกันไว้แล้ว ถ้ายังรันอยู่ ระบบจะไม่ยอมเริ่มอีก run
- ทุก agent ทำงานด้วยภาษาอังกฤษ (เอกสาร PRD ฯลฯ เป็นภาษาอังกฤษ) แต่ตัวแอปที่ได้เป็นภาษาไทยตามไอเดีย

## ไฟล์อยู่ที่ไหน

| อะไร | ที่อยู่ |
|---|---|
| คู่มือใช้งานโดยละเอียด | `autopilot/README.md` |
| คำสั่งของ PM | `autopilot/autopilot.md` |
| agent แต่ละตำแหน่ง | `autopilot/agents/*.md` |
| สคริปต์สั่งงาน | `autopilot/run.sh` (Mac), `autopilot/run.ps1` (Windows) |
| สถานะของแต่ละโปรเจกต์ | `<โปรเจกต์>/docs/pipeline/STATE.md` และ log ใน `docs/pipeline/run-*.log` |
