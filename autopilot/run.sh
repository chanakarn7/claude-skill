#!/usr/bin/env bash
# Autopilot — Mac/Linux runner. Same commands as run.ps1:
#   ./run.sh start idea.md [project-dir] | resume [dir] | approve [dir] | status [dir]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
CMD="${1:?usage: run.sh start|resume|approve|status ...}"
if [ "$CMD" = start ]; then IDEA="${2:?idea file required}"; PROJECT="${3:-$PWD}"; else PROJECT="${2:-$PWD}"; fi
mkdir -p "$PROJECT"; PROJECT="$(cd "$PROJECT" && pwd)"
STATE="$PROJECT/docs/pipeline/STATE.md"

LOCK="$PROJECT/docs/pipeline/.lock"
# One run per project, so a double approve can't dispatch the same stages twice.
assert_not_running() {
  if [ -f "$LOCK" ] && kill -0 "$(cat "$LOCK")" 2>/dev/null; then
    echo "Autopilot is already running for this project (PID $(cat "$LOCK"))."; exit 1
  fi
  rm -f "$LOCK"
}

pilot() {
  assert_not_running
  mkdir -p "$PROJECT/.claude/agents" "$PROJECT/docs/pipeline"
  echo $$ > "$LOCK"; trap 'rm -f "$LOCK"' EXIT
  cp "$ROOT"/agents/*.md "$PROJECT/.claude/agents/"
  local log="$PROJECT/docs/pipeline/run-$(date +%Y%m%d-%H%M%S).log"
  echo "▶ autopilot $1  (project: $PROJECT)"
  { cat "$ROOT/autopilot.md"; printf '\n\nCOMMAND: %s\n' "$1"; } | (cd "$PROJECT" && claude -p \
    --permission-mode acceptEdits --strict-mcp-config \
    --allowedTools Agent Read Write Edit Glob Grep 'Bash(npm:*)' 'Bash(npx:*)' 'Bash(node:*)' \
      'Bash(pnpm:*)' 'Bash(yarn:*)' 'Bash(git init:*)' 'Bash(git add:*)' 'Bash(git commit:*)' \
      'Bash(git status:*)' 'Bash(git diff:*)' 'Bash(git log:*)' 'Bash(ls:*)' 'Bash(cat:*)' \
      'Bash(mkdir:*)' 'Bash(mv:*)' 'Bash(cp:*)' 'Bash(pwd)' 'Bash(docker build:*)' 'Bash(docker --version)' \
    --disallowedTools 'Bash(git push:*)' 'Bash(npm publish:*)' 'Bash(npx vercel:*)' 'Bash(npx netlify:*)' \
      'Bash(npx gh-pages:*)' 'Bash(docker push:*)' \
    --output-format text) 2>&1 | tee "$log"
  echo "log: $log"
  if grep -qE 'Failed to authenticate|OAuth access token has expired' "$log"; then
    echo "Claude CLI is not logged in. Run 'claude' once, sign in with /login, then re-run."; exit 1
  fi
  if grep -qiE 'hit your (session|usage) limit|usage limit reached' "$log"; then
    echo "Stopped: Claude usage limit reached. STATE.md may lag one stage. Run './run.sh resume' after the limit resets."; exit 1
  fi
}

command -v claude >/dev/null || { echo "Claude Code CLI not found in PATH. Install: npm install -g @anthropic-ai/claude-code"; exit 1; }

case "$CMD" in
  start)  mkdir -p "$PROJECT/docs"; cp "$IDEA" "$PROJECT/docs/IDEA.md"; pilot 'start docs/IDEA.md' ;;
  resume) pilot resume ;;
  approve)
    assert_not_running
    stage="$(sed -n 's/^current_stage:[[:space:]]*//p' "$STATE" | head -1)"
    case "$stage" in *"GATE 1"*) gate=gate1 ;; *"GATE 2"*) gate=gate2 ;; *) echo "Nothing to approve (stage: $stage)"; exit 1 ;; esac
    sed -i.bak -e "s/^${gate}:[[:space:]]*pending/${gate}: approved/" -e 's/^status:[[:space:]]*awaiting_approval/status: running/' "$STATE" && rm -f "$STATE.bak"
    printf '\n- %s %s human APPROVED' "$(date +%FT%T)" "$gate" >> "$STATE"
    echo "✔ $gate approved"; pilot resume ;;
  status) cat "$STATE" 2>/dev/null || echo 'No pipeline in this project yet.' ;;
  *) echo "unknown command: $CMD"; exit 1 ;;
esac
