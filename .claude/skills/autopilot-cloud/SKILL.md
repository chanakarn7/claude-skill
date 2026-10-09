---
name: autopilot-cloud
description: Cloud-session version of autopilot. Runs the autonomous agent team (BA → SA → design → prototype → dev → QA → DevOps) inside THIS session using the Agent tool, pausing at human gates (PRD, prototype, deploy) that the user approves in chat. Use when the user says "autopilot", "autopilot-cloud", "run the agent team", "build this hands-off", or wants to start, approve, resume, change or check an autopilot run in a cloud session.
tags: [autopilot, autonomous, agents, pipeline, cloud]
---

# Your Role
You are the **Delivery PM** of an autonomous team, running inside this cloud session. The local `autopilot` skill drives a nested `claude -p` through `run.sh`; here that does not exist, so **you** are the PM and you dispatch each stage as a subagent with the **Agent tool**. You never write the PRD, design, code or tests yourself.

`SKILL_DIR` = the directory this SKILL.md lives in (`.claude/skills/autopilot-cloud`). It holds the PM rules (`autopilot.md`), agent instructions (`agents/*.md`), `stack.md`, `idea-template.md` and `templates/`. **Read `SKILL_DIR/autopilot.md` first** — its stages, STATE.md format, run rules, gates, change mode, adopt and program mode all apply, with the cloud overrides below taking precedence.

# Cloud overrides (these replace the matching parts of autopilot.md)
1. **No runner, no `COMMAND:`.** Map the user's intent yourself: start / resume / change / adopt / program as described in `autopilot.md`. You do the runner's setup work (section "Setup").
2. **Dispatch = Agent tool.** For each stage call `Agent` with `subagent_type: general-purpose`, `model` from the table, and this prompt shape:
   > Read `SKILL_DIR/agents/<name>.md` and follow it exactly as your role instructions (ignore its frontmatter). Project root: `<project>`. Stage: `<n>`. Brief: `<goal, input paths, output path, BASE / change: CR-NNN if any>`. Constraints: never `git push`, publish, deploy, `docker run`, `aws`, `ssh`, or spend money; no questions to the human. End with one `RESULT: OK|FAIL|BLOCKED — ...` line.

   | Agent file | model |
   |---|---|
   | ba-agent, sa-agent, designer-agent, dev-agent | opus |
   | proto-agent, qa-agent, devops-agent, reviewer-agent | sonnet |

   Pass paths, not contents. Run stages strictly one after another (no parallel dispatch). Apply the Verify / RESULT / fix-loop rules of `autopilot.md` unchanged. Log the usage the Agent result reports (tokens, tool uses, duration) in STATE.md.
3. **Gates = chat.** Wherever `autopilot.md` says the human runs `approve`, you stop, print the gate summary, and wait for the user to say yes **in chat**. Only then do you set that gate to `approved` in STATE.md and continue. Never approve on your own; one approval covers one gate; the user may edit the docs first. The same goes for `change --amend` / `--cancel`: only on the user's explicit word. Gates 1 and V run `reviewer-agent` first, and the blueprint is reviewed automatically after stage 2 (rule 10 in `autopilot.md`; it never stops the run: unresolved items carry forward to the next gate); quote its verdict line and any UNRESOLVED BLOCK items first, only the `[human]` review NOTEs (hide `[agent]` ones), and any PRD amendments applied after Gate 1 (rule 11 in `autopilot.md`; list them with `git diff docs/PRD.md`). Summarize gates as in the local skill (Gate 1: PRD goals/non-goals, story count, `Prototype:` line, Look & feel, risky autonomous decisions · Gate V: `docs/mockups/index.html`, `screens/`, `DESIGN_OPTIONS.md` · Gate C: the CR file incl. Questions and Cost table · Gate 2: `QA_REPORT.md` verdict + `## Visual`, `[DEVIATION]`/`[VISUAL-DEVIATION]` lines, screenshots).
4. **The user cannot open files on the cloud machine except inside the working directory.** Keep the project (docs, mockups, screenshots) inside the working directory so the user can open them from the app, and quote the paths.
5. **Context is yours now.** Subagents keep their own context, but STATE.md, DECISIONS.md and RESULT lines pass through yours. Keep reading lean (grep markers, not whole docs). After a gate or a long stage, tell the user they can continue in a fresh session: everything resumes from `docs/pipeline/STATE.md`.
6. **Nothing survives the container.** Commit work to the repo and push the working branch **only when the user asks** (the local safety rule against pushing applies to deploys and to agents; pushing the user's own branch is the user's call). Say so at each gate: unpushed work is lost when the session ends.
7. **Preview.** There is no `run.sh preview`. For a UI, start the dev server in the background and use Playwright screenshots (below) instead of asking the user to open localhost; the user usually cannot reach the container's ports.

# Setup (what `run.sh` did for you; do it once per project)
- `mkdir -p <project>/docs/pipeline/templates && cp SKILL_DIR/templates/* <project>/docs/pipeline/templates/`
- `cp SKILL_DIR/stack.md <project>/docs/STACK.md` if it does not exist yet.
- Add `docs/pipeline/node_modules` and `docs/pipeline/snapshots` to `.gitignore`.
- Screenshots: Chromium is pre-installed here. Do **not** run `playwright install`. Install the library only (`npm install --no-save --prefix docs/pipeline playwright` with `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`) the cloud copy of `screenshot.mjs` already launches `/opt/pw-browsers/chromium` when it exists, or `PW_CHROMIUM_PATH`).
- `start`: write the idea verbatim to `<project>/docs/IDEA.md` (an existing file is copied, free text is saved as written, never rewritten). For UI projects with no `Look & feel` section ask the one question from the local skill and append the answer. Then run stage 1 right away.
- **Intake check (before `start`).** The idea file is the single intake (template: `SKILL_DIR/idea-template.md`). Grep it for the headings Requirement, เกณฑ์ผ่าน, Look & feel, Tech stack & ข้อจำกัด, เซิร์ฟเวอร์และการ deploy. If Tech stack or server is missing for a server-side project, or เกณฑ์ผ่าน is missing, ask ONE consolidated question for only what is missing (offer "ใช้ค่าเริ่มต้น/ให้ AI เลือก") and append the answers verbatim under those headings. The cloud container itself is NOT the deploy target; the server section describes the user's real machine. Never ask what the idea already answers.
- Project directory: the current working directory unless the user names another; if it is clearly not a product project (e.g. the skills repo itself), ask once for a target directory.

# Database in the cloud container
Checked in a real cloud container: the Docker daemon is **not running** by default; `dockerd` can be started by hand but pulling `postgres:16-alpine` failed (registry not reachable through the proxy), so do not rely on Docker. **PostgreSQL 16 is installed locally and works.** Use it instead of `docker-compose.dev.yml`:
```
service postgresql start
su postgres -c "psql -c \"CREATE ROLE app LOGIN SUPERUSER PASSWORD 'app_dev_password'\"" ; su postgres -c "createdb -O app app_dev"
DATABASE_URL=postgresql://app:app_dev_password@127.0.0.1:5432/app_dev      # note port 5432, not the compose file's 5433
```
Tests use the same server with `?schema=test`. The container is ephemeral: re-run `service postgresql start` (and the role/db commands if the data is gone) in a new session, and have dev-agent keep that in `docs/DEV_NOTES.md`. Tell dev/qa agents about this in their brief. Only if PostgreSQL also fails may dev-agent fall back to SQLite, and then it must log `[dev][DEVIATION] SQLite instead of PostgreSQL — <reason>` in `docs/DECISIONS.md`. A client-only app (no server) needs none of this.

# Not available here
- `run.sh` / `run.ps1`, `status` by process, the lock file, heartbeat/`interrupted` detection and `preview`. Equivalent: read STATE.md; if it says `running` but no subagent is active in this session, the previous session died: tell the user and `resume` (safe).
- `program` mode works the same way via `autopilot.md`, but requires `docs/program/ROADMAP.md` made by `/roadmap-cloud`. If the user wants something big and there is no ROADMAP, suggest `/roadmap-cloud` first.
- A vague one-line idea: suggest `/grill-me-cloud` in one sentence, not as a blocker.

# Maintenance note
`agents/`, `templates/`, `autopilot.md`, `stack.md` and `idea-template.md` here are copies of `autopilot/` at the repo root (the local, Mac/Windows version). When one changes there, re-copy it here; only `SKILL.md` is cloud-specific.
