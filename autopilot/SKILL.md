---
name: autopilot
description: Runs the headless autonomous agent team (BA → SA → design → prototype → dev → QA → DevOps) on the current project from an idea file, pausing at human gates (PRD, prototype, deploy). Use when the user says "autopilot", "run the agent team", "build this hands-off", or wants to start, approve, resume, or check an autopilot run.
tags: [autopilot, autonomous, agents, pipeline, headless]
---

# Your Role
You are the user's operator for **autopilot** — a separate headless pipeline driven by `run.sh`. You do NOT do the specialist work yourself (no writing the PRD, code, or tests). You start runs, read the results at each gate, and relay them. Details of the pipeline: `AUTOPILOT_DIR/README.md`.

`AUTOPILOT_DIR` = the directory this SKILL.md lives in (normally `~/.claude/skills/autopilot`). Runner: `AUTOPILOT_DIR/run.sh`. The target project is the **current working directory** unless the user names another.

# Commands
| Intent | Command |
|--------|---------|
| Start | `AUTOPILOT_DIR/run.sh start <idea-file> <project-dir>` |
| Approve current gate | `AUTOPILOT_DIR/run.sh approve <project-dir>` |
| Resume after BLOCKED / crash | `AUTOPILOT_DIR/run.sh resume <project-dir>` |
| Change an already-built project (restyle, new requirement, bigger fix) | `AUTOPILOT_DIR/run.sh change "<request text or file>" <project-dir>` |
| Revise / drop the open change request (only while it waits at Gate C) | `AUTOPILOT_DIR/run.sh change --amend "<text>" <project-dir>` / `AUTOPILOT_DIR/run.sh change --cancel <project-dir>` |
| Docs lag code that was changed by hand or by another tool | `AUTOPILOT_DIR/run.sh adopt <project-dir>` (designer rewrites the design doc from the current code) |
| Status (shows whether the process is still running; warns about a killed run and about commits made outside autopilot) | `AUTOPILOT_DIR/run.sh status <project-dir>` |
| See the built app with demo data | `AUTOPILOT_DIR/run.sh preview <project-dir>` (foreground, Ctrl-C to stop; suggest the user runs it in their own terminal) |

# How to run
1. **Idea input.** Whatever follows `/autopilot` is the idea; don't ask for confirmation or offer a menu.
   - It is a path to an existing file → use that file as the idea file.
   - It is free text (a PRD, a brief, a few sentences) → save it **verbatim** to `<project>/idea.md` and use that. Do not rewrite or "improve" it.
   - Nothing was given → ask one open question only: "ไอเดียคืออะไร? (พิมพ์ได้เลย หรือให้พาธไฟล์)". Do not list options.
   - The text may already be a full PRD; that's fine — ba-agent will build on it. Mention `/grill-me` only if the input is a one-liner so vague that ba-agent would have to guess most decisions, and then as a single-sentence suggestion, not a blocker.
   - Assume the project directory is the current working directory; only raise it if it is clearly not a product project (e.g. the skills repo itself).
   - **Look & feel (UI projects only).** If the idea has no `Look & feel` section, ask ONE question before starting: "มีเว็บ/แอปที่ชอบหน้าตาไหม และอยากให้รู้สึกแบบไหน? (ไม่รู้ก็บอกได้ จะให้ AI เสนอ 3 แบบ)". Append the answer to the idea file under `## Look & feel` (verbatim; "ให้ AI เสนอ 3 แบบ" if they don't know). The template with all fields is `AUTOPILOT_DIR/idea-template.md`; offer it if the user wants to fill it in properly. Skip this for non-UI projects and in program mode.
   - **Intake check (before starting).** The idea file is the single intake; the full template is `AUTOPILOT_DIR/idea-template.md` (sections: Requirement, เกณฑ์ผ่าน, Look & feel, Tech stack & ข้อจำกัด, เซิร์ฟเวอร์และการ deploy, การตัดสินใจที่ล็อกแล้ว). Grep the idea for those headings. If **Tech stack** or **เซิร์ฟเวอร์และการ deploy** is missing for a project that needs a server, or **เกณฑ์ผ่าน** is missing, ask ONE consolidated question listing only what is missing (offer "ใช้ค่าเริ่มต้น/ให้ AI เลือก" as an answer) and append the answers verbatim to the idea file under the template's headings. Never ask what the idea already answers. A thorough idea (like a full PRD) passes without questions.
   Then start the run immediately.
2. **Run long commands in the background** (`run_in_background: true`) with the **maximum timeout (`timeout: 7200000`)** every time you start/approve/resume — the default background timeout (30 min) has killed runs silently. A run takes many minutes and a foreground Bash call times out at 10 minutes. You are re-invoked when it exits; do not poll. Tell the user the log path: `<project>/docs/pipeline/run-*.log`.
3. **At a gate** (the run exits with `awaiting_approval`): read `docs/pipeline/STATE.md` and `docs/DECISIONS.md`, then summarize for the user:
   - Gate 1: the PRD's goals/non-goals, the number of user stories, the `Prototype:` line, the Look & feel section (or that none was given), and the autonomous decisions made (highlight risky ones).
   - **Gate V (prototype):** point the user at `docs/mockups/index.html` and the screenshots in `docs/mockups/screens/`, plus `docs/mockups/options.html` and `docs/DESIGN_OPTIONS.md` when the designer proposed 3 directions. To switch direction the user edits the `Chosen:` line in `DESIGN_OPTIONS.md`; the next `approve` regenerates design + prototype once and stops at Gate V again. If the prototype was skipped, say dev has no visual reference.
   - Gate 2: `docs/QA_REPORT.md` verdict (including PASS-WITH-GAPS and the `## Visual` table), fix loops used, "Not automated", every `[VISUAL-DEVIATION]` line in `docs/DECISIONS.md`, and the screenshot paths in `docs/pipeline/screens/`. Offer `run.sh preview` so the user sees the real app before approving.
4. **Never run `approve` on your own.** Only after the user says, in chat, to approve that gate. Approval is per gate; one approval does not cover the next. The user may edit the docs first.
5. **BLOCKED:** show the reason from STATE.md's log, and ask whether to fix the input and `resume`.
6. **Done:** list produced files and how to run the app (from `docs/DEV_NOTES.md`). Autopilot never deploys — devops-agent only prepares files and commands in `docs/DEPLOY.md`; tell the user to run them themselves.

# Change mode (iterating on a built project)
When the project already has a pipeline (`docs/pipeline/STATE.md` with stage 5 done) and the user wants something changed — "หน้าตาไม่สวย", "เพิ่ม requirement ...", a bigger fix — do NOT use `start`. Run `change` with their words as the request (verbatim; a file path also works). Requires a clean git tree outside `docs/pipeline`: if the runner refuses because of uncommitted changes, tell the user to commit or stash and wait; never commit or stash their work for them. The runner tags `pre-CR-NNN` as a restore point (mention it; do not run `git reset` yourself).
- The run stops at **Gate C**: show `docs/changes/CR-NNN.md`: Types, Affected, Plan, Risk flags, **Questions** (relay each one and put the user's answers into the CR file or via `--amend`), and the **Cost** table with its cheaper options (the user cannot judge the cost without it), plus `git diff docs/PRD.md` if the PRD changed. The user may edit `Plan:` (stages 2-7; dev and QA are the expensive ones), `--amend` with new wording, or `--cancel`. Wait for an explicit yes, then `approve`. Never run `--cancel` or `--amend` on your own.
- **Subjective polish** ("ให้สวยขึ้น", "ไม่แน่น") needs a human looking after each tweak, which a batch `change` cannot do well. Offer the user both: a `change` (batch; Gate V shows 3 options) or iterating interactively in this chat (edit the code directly, `preview` to look) and then `adopt` so the docs catch up. Let them choose.
- After Gate C the usual gates apply: **V** if design/prototype re-ran, then **2**. Summarize them as in single mode, including the CR id.
- A bug-only or pure restyle change normally plans `5,6` or `3,4,5,6`; new behavior plans `2,3,4,5,6`. In program mode `change` is refused: new requirements there go through `/roadmap`.

# Program mode (large, multi-module builds)
If `docs/program/ROADMAP.md` exists in the project, it is a program: `run.sh start` is refused. Use `AUTOPILOT_DIR/run.sh program <project-dir>` to start or continue, and `approve` / `status` as usual. If the user asks to build something big and there is no ROADMAP yet, suggest `/roadmap` first (interactive planning is the program-level gate); do not fake the program files.
- Gates are **V** (prototype looked at), **M** (conditional: a module flagged a risk or a breaking change to a built module), **S** (end of sprint, after integration QA) and **D** (all sprints done, before deploy prep). Same rules as single mode: summarize, then wait for an explicit yes in chat per gate; never run `approve` yourself.
- At **M**: show the flagged line from the module's `PRD.md` (`Risk flags:`) or `SA_BLUEPRINT.md` (`Breaking changes to built modules:`) and the related `DECISIONS.md` entries. At **S**: `docs/program/SPRINT_<n>_QA.md` verdict, the ROADMAP.md status table, any "touched" notes. At **D**: all sprint QA reports and the autonomous decisions.
- **V** (design gate, when a module ran its prototype): same as single-mode Gate V, using the module's `docs/modules/<slug>/mockups/`.
- `ROADMAP.md` is the resume point; a run can safely be restarted at any time with `program`.

# When a run stops unexpectedly
`status` says `interrupted`, or warns that STATE says `running` with no process: the run was killed (timeout, crash, closed laptop) or hit an external problem (the STATE log says `BLOCKED(external)` with `network`, `rate-limit <reset time>` or `auth`). Fix the cause (network back, wait for the reset, `claude` then `/login`) and run `resume`; it is safe. Tell the user the reset time when it is a rate limit.

# Notes
- Usage per stage (tokens, tool calls, time) is logged in STATE.md by the PM; quote it when asking for approval of an expensive gate.
- If the project needs a server/DB (default stack: Next + Nest + PostgreSQL, see `AUTOPILOT_DIR/stack.md`), Docker must be running on this machine or the run will BLOCK.
- Requires the `claude` CLI to be installed and logged in; a run is a nested `claude -p` and consumes usage on top of this session.
- Do not run two runs on the same project (the runner locks, but don't try).
- Agents are copied into `<project>/.claude/agents/`; `~/.claude` is not touched.
