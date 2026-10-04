# RESUME — autopilot (autonomous agent team)

Updated 2026-10-04. Next work happens on **macOS**. User communicates in Thai — reply in Thai.

## What this is
Headless multi-agent pipeline in `autopilot/`, separate from the interactive skills (`ba/ sa/ … kickoff/ roadmap/` — do NOT modify those; user requirement).
- `autopilot/autopilot.md` — PM prompt, piped via stdin to `claude -p` with `COMMAND: start|resume`. PM is the main session (subagents can't spawn subagents), dispatches stages via Agent tool.
- `autopilot/agents/*.md` — 8 subagents (ba, sa, designer, proto, dev, reviewer, qa, devops). Copied into `<project>/.claude/agents/` per run; `~/.claude` untouched.
- `run.sh` (mac/linux) / `run.ps1` (windows): `start <idea> [dir]`, `approve`, `resume`, `status`.
- State: `<project>/docs/pipeline/STATE.md` (keys: status, current_stage, gate1, gate2, fix_loops). Only the script flips gates to approved.
- Contract: every subagent ends with `RESULT: OK|FAIL|BLOCKED — …`. Autonomous choices logged to `docs/DECISIONS.md`. Fix loop dev↔reviewer/qa max 3.

## Status
- ✅ Stages 1–7 proven on Windows with `autopilot/examples/expense-tracker.md` → `sandbox/expense-tracker/` (gitignored): PRD 9 US, Vite+React19+TS, review APPROVE, QA 381/381.
- 🚧 That run's STATE.md lags: stage 7 unticked / no GATE 2 — run died on usage limit after QA wrote `QA_REPORT.md`.
- ⬜ Gate 2 + devops-agent never executed.
- ⬜ `run.sh` never executed on macOS (only `bash -n`).
- ⬜ dev-agent commit fix (one-line `git commit -m` instruction) untested.

## Locked decisions (don't re-litigate)
- Runner = Claude Code headless (`claude -p`), manual trigger, 2 human gates (after PRD, before deploy).
- Permissions: `--permission-mode acceptEdits --strict-mcp-config`, Bash allowlist (npm/npx/node/pnpm/yarn, local git, ls/cat/mkdir/mv/cp, docker build); denylist git push / npm publish / vercel / netlify / gh-pages / docker push. devops prepares, never deploys.
- Agents are standalone (not loading old skills) because old skills contain "STOP and ASK".

## Gotchas learned
- PS 5.1 reads BOM-less .ps1 as ANSI → keep `run.ps1` pure ASCII (em-dash broke parsing).
- PS 5.1 `Tee-Object` writes logs as UTF-16; `Select-String` handles it, `grep` doesn't.
- `.gitattributes` forces `*.sh` LF (repo has `core.autocrlf=true` on the Windows box). Exec bit set in git index.
- Double `approve` spawned two concurrent runs → added PID lock `docs/pipeline/.lock` in both scripts.
- Permission rule `Bash(git commit:*)` doesn't match heredoc/`$(...)` commits → agents told to use one-line `-m`.
- Expired CLI OAuth → 401; usage limit → "hit your session limit". Both now detected in scripts with a clear message.
- Without `--strict-mcp-config` the headless run loads all account MCP connectors (noise + tokens).

## Next step
On the Mac: install Node + Claude Code, `claude` → `/login`, then run the example end-to-end to Gate 2 and through devops:
```bash
./autopilot/run.sh start autopilot/examples/expense-tracker.md ~/work/expense-tracker
```
Verify: lock works, dev-agent commit succeeds, STATE reaches `done`.

## Verify state
`bash -n autopilot/run.sh`; `./autopilot/run.sh status <dir>`; in the generated app: `npm test`, `npx playwright test`, `npm run build`.
