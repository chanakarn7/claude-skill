#!/usr/bin/env bash
# Autopilot — Mac/Linux runner.
#   ./run.sh start idea.md [dir] | resume [dir] | approve [dir] | status [dir]
#   ./run.sh change "<what to change | file>" [dir]      # restyle / new requirement / bigger fix on a built project
#   ./run.sh change --amend "<new text>" [dir]           # re-analyse the open change request (before its plan is approved)
#   ./run.sh change --cancel [dir]                       # drop the open change request (before its plan is approved)
#   ./run.sh adopt [dir]                                 # bring the design docs in line with code changed outside autopilot
#   ./run.sh preview [dir]                               # run the built app with demo data (npm run demo, free ports)
#   ./run.sh program [dir]                               # multi-module build from docs/program/ROADMAP.md (made with /roadmap)
# (run.ps1 for Windows: parity for start/resume/approve/status/program/preview/change; the newer commands below are run.sh only for now:
#  change --amend/--cancel, adopt, drift warnings, heartbeat/interrupted status, exit-code classification.)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
CMD="${1:?usage: run.sh start|resume|approve|status|program|preview|change|adopt ...}"
CHANGE_ACTION=new
case "$CMD" in
  start)  IDEA="${2:?idea file required}"; PROJECT="${3:-$PWD}" ;;
  change) case "${2:-}" in
            --cancel) CHANGE_ACTION=cancel; PROJECT="${3:-$PWD}" ;;
            --amend)  CHANGE_ACTION=amend; REQUEST="${3:?amended text required}"; PROJECT="${4:-$PWD}" ;;
            *)        REQUEST="${2:?change request (text or file) required}"; PROJECT="${3:-$PWD}" ;;
          esac ;;
  *)      PROJECT="${2:-$PWD}" ;;
esac
mkdir -p "$PROJECT"; PROJECT="$(cd "$PROJECT" && pwd)"
STATE="$PROJECT/docs/pipeline/STATE.md"
LOCK="$PROJECT/docs/pipeline/.lock"
HEARTBEAT="$PROJECT/docs/pipeline/.heartbeat"
BASEFILE="$PROJECT/docs/pipeline/.base_commit"

now_utc()    { date -u +%FT%TZ; }
is_git()     { git -C "$PROJECT" rev-parse --is-inside-work-tree >/dev/null 2>&1; }
state_get()  { [ -f "$STATE" ] && sed -n "s/^$1:[[:space:]]*//p" "$STATE" | head -1 || true; }
state_set()  { [ -f "$STATE" ] && sed -i.bak "s#^$1:.*#$1: $2#" "$STATE" && rm -f "$STATE.bak" || true; }
state_log()  { [ -f "$STATE" ] && printf '\n- %s runner %s' "$(now_utc)" "$1" >> "$STATE" || true; }
alive()      { [ -f "$LOCK" ] && kill -0 "$(cat "$LOCK")" 2>/dev/null; }

# One run per project, so a double approve can't dispatch the same stages twice.
assert_not_running() {
  if alive; then echo "Autopilot is already running for this project (PID $(cat "$LOCK"))."; exit 1; fi
  rm -f "$LOCK"
}

# Keep runtime files out of git (they change on every run).
ensure_gitignore() {
  local gi="$PROJECT/.gitignore"; touch "$gi"
  for l in 'docs/pipeline/.lock' 'docs/pipeline/.heartbeat' 'docs/pipeline/.base_commit' 'docs/pipeline/run-*.log' 'docs/pipeline/node_modules'; do
    grep -qxF "$l" "$gi" || echo "$l" >> "$gi"
  done
}

# Commits made outside autopilot since its last run (the docs may lag the code).
drift_count() {
  is_git && [ -f "$BASEFILE" ] || { echo 0; return; }
  git -C "$PROJECT" cat-file -e "$(cat "$BASEFILE")^{commit}" 2>/dev/null || { echo 0; return; }
  git -C "$PROJECT" rev-list --count "$(cat "$BASEFILE")..HEAD" 2>/dev/null || echo 0
}
write_drift() {  # $1 = output file
  [ "$(drift_count)" -gt 0 ] || return 0
  { echo "# Work done outside autopilot since its last run ($(cat "$BASEFILE")..HEAD)"; echo
    git -C "$PROJECT" log --stat --format='## %h %s' "$(cat "$BASEFILE")..HEAD" | head -300; } > "$1"
}

set_cr_status() {  # $1 CR file, $2 new status text (portable: BSD sed has no `0,/re/`)
  awk -v v="Status: $2" '!d && /^Status:/{print v; d=1; next} {print}' "$1" > "$1.tmp" && mv "$1.tmp" "$1"
}

classify() {  # $1 log, $2 exit code -> "class|detail"
  local log="$1" rc="$2"
  # A clean run with plenty of output is fine even if its text mentions these words; failures are short or non-zero.
  if [ "$rc" -eq 0 ] && [ "$(wc -c < "$log")" -ge 600 ]; then echo "ok|"; return; fi
  if grep -qE 'Failed to authenticate|OAuth access token has expired|Invalid API key' "$log"; then echo "auth|Claude CLI is not logged in"; return; fi
  if grep -qiE "hit your (session|usage|weekly) limit|usage limit reached" "$log"; then
    echo "rate-limit|$(grep -iE 'limit|resets' "$log" | tail -1 | cut -c1-160)"; return; fi
  if grep -qE 'ENOTFOUND|ECONNRESET|ETIMEDOUT|EAI_AGAIN|fetch failed|Could not resolve host|socket hang up' "$log"; then
    echo "network|$(grep -E 'ENOTFOUND|ECONNRESET|ETIMEDOUT|EAI_AGAIN|fetch failed|Could not resolve host|socket hang up' "$log" | tail -1 | cut -c1-160)"; return; fi
  if [ "$rc" -ne 0 ]; then echo "error|exit code $rc: $(tail -n 3 "$log" | tr '\n' ' ' | cut -c1-160)"; return; fi
  echo "ok|"
}

mark_interrupted() {  # $1 reason
  [ -f "$STATE" ] || return 0
  [ "$(state_get status)" = running ] && state_set status interrupted
  state_log "INTERRUPTED — $1; safe to resume with './run.sh resume'"
}
HB_PID=""
cleanup()   { [ -n "$HB_PID" ] && kill "$HB_PID" 2>/dev/null || true; rm -f "$LOCK" "$HEARTBEAT"; }
on_signal() { mark_interrupted "runner received SIG$1"; exit 130; }

pilot() {
  command -v claude >/dev/null || { echo "Claude Code CLI not found in PATH. Install: npm install -g @anthropic-ai/claude-code"; exit 1; }
  assert_not_running
  mkdir -p "$PROJECT/.claude/agents" "$PROJECT/docs/pipeline/templates"
  echo $$ > "$LOCK"
  ( while true; do now_utc > "$HEARTBEAT"; sleep 30; done ) & HB_PID=$!
  trap cleanup EXIT; trap 'on_signal INT' INT; trap 'on_signal TERM' TERM
  cp "$ROOT"/agents/*.md "$PROJECT/.claude/agents/"
  cp "$ROOT"/templates/* "$PROJECT/docs/pipeline/templates/"
  if [ ! -f "$PROJECT/docs/STACK.md" ]; then cp "$ROOT/stack.md" "$PROJECT/docs/STACK.md"
  elif ! grep -q '^## UI layer (web)' "$PROJECT/docs/STACK.md"; then   # upgrade an older project STACK.md
    { echo; awk '/^## UI layer \(web\)/{p=1} /^## Local database/{p=0} p' "$ROOT/stack.md"; } >> "$PROJECT/docs/STACK.md"
  fi
  ensure_gitignore
  if [ -f "$STATE" ] && [ "$(state_get status)" = running ]; then
    state_log "previous run left status: running with no live process (it was killed); continuing"
  fi
  local log="$PROJECT/docs/pipeline/run-$(date +%Y%m%d-%H%M%S).log" rc=0
  echo "▶ autopilot $1  (project: $PROJECT)"
  { cat "$ROOT/autopilot.md"; printf '\n\nCOMMAND: %s\n' "$1"; } | (cd "$PROJECT" && claude -p \
    --permission-mode acceptEdits --strict-mcp-config \
    --allowedTools Agent Read Write Edit Glob Grep 'Bash(npm:*)' 'Bash(npx:*)' 'Bash(node:*)' \
      'Bash(pnpm:*)' 'Bash(yarn:*)' 'Bash(git init:*)' 'Bash(git add:*)' 'Bash(git commit:*)' \
      'Bash(git status:*)' 'Bash(git diff:*)' 'Bash(git log:*)' 'Bash(ls:*)' 'Bash(cat:*)' \
      'Bash(mkdir:*)' 'Bash(mv:*)' 'Bash(cp:*)' 'Bash(pwd)' 'Bash(docker build:*)' 'Bash(docker --version)' 'Bash(docker compose -f docker-compose.dev.yml:*)' \
    --disallowedTools 'Bash(git push:*)' 'Bash(npm publish:*)' 'Bash(npx vercel:*)' 'Bash(npx netlify:*)' \
      'Bash(npx gh-pages:*)' 'Bash(docker push:*)' 'Bash(docker run:*)' \
      'Bash(docker compose -f docker-compose.dev.yml run:*)' 'Bash(docker compose -f docker-compose.dev.yml exec:*)' \
      'Bash(aws:*)' 'Bash(ssh:*)' 'Bash(scp:*)' \
    --output-format text) 2>&1 | tee "$log" || rc=$?
  echo "log: $log"
  is_git && git -C "$PROJECT" rev-parse HEAD > "$BASEFILE" 2>/dev/null || true   # what autopilot last saw

  local verdict cls detail; verdict="$(classify "$log" "$rc")"; cls="${verdict%%|*}"; detail="${verdict#*|}"
  case "$cls" in
    auth)       state_set status interrupted; state_log "BLOCKED(external) — auth: $detail; safe to resume after '/login'"
                echo "Claude CLI is not logged in. Run 'claude' once, sign in with /login, then './run.sh resume'."; exit 1 ;;
    rate-limit) state_set status interrupted; state_log "BLOCKED(external) — rate-limit: $detail; safe to resume after it resets"
                echo "Stopped: Claude usage limit reached ($detail). Noted in STATE.md Log. Run './run.sh resume' after it resets."; exit 1 ;;
    network)    state_set status interrupted; state_log "BLOCKED(external) — network: $detail; safe to resume"
                echo "Stopped: network problem ($detail). Run './run.sh resume' when you are back online."; exit 1 ;;
    error)      mark_interrupted "claude exited abnormally — $detail"
                echo "Stopped: $detail. STATE.md marked interrupted; './run.sh resume' is safe."; exit "$rc" ;;
  esac
  if [ -f "$STATE" ] && [ "$(state_get status)" = running ]; then
    mark_interrupted "the run ended without a final status in STATE.md"
    echo "Warning: the run ended but STATE.md still said 'running'; marked interrupted. './run.sh resume' is safe."
  fi
}

open_change() { local c; c="$(state_get change)"; case "$c" in CR-[0-9]*) echo "$c" ;; esac; }

case "$CMD" in
  start)  mkdir -p "$PROJECT/docs"; cp "$IDEA" "$PROJECT/docs/IDEA.md"; pilot 'start docs/IDEA.md' ;;
  resume) pilot resume ;;
  program) pilot program ;;

  adopt)
    [ -f "$STATE" ] || { echo "No pipeline in $PROJECT yet — nothing to adopt."; exit 1; }
    mkdir -p "$PROJECT/docs/changes"; write_drift "$PROJECT/docs/changes/ADOPT.drift.txt"
    [ -f "$PROJECT/docs/changes/ADOPT.drift.txt" ] && echo "$(drift_count) commit(s) outside autopilot will be read" || echo "No commits outside autopilot detected; designer will still compare the docs with the code."
    pilot adopt ;;

  change)
    [ -f "$STATE" ] || { echo "No pipeline in $PROJECT yet — use 'start' first."; exit 1; }
    assert_not_running
    cur="$(open_change)"
    case "$CHANGE_ACTION" in
      cancel)
        [ -n "$cur" ] || { echo "No open change request."; exit 1; }
        if [ "$(state_get gateC)" != pending ]; then
          echo "$cur has already started work (its plan was approved). Autopilot will not undo it."
          echo "To roll back the files yourself: git reset --hard pre-$cur   (restore-point tag; not run for you)"; exit 1
        fi
        prev="$(state_get change_resume)"
        if [ -n "$prev" ]; then state_set current_stage "${prev%% / *}"; state_set status "${prev##* / }"
        elif [ "$(state_get gate2)" = pending ]; then state_set current_stage "GATE 2"; state_set status awaiting_approval   # older STATE without change_resume
        else state_set status done; fi
        state_set change none; state_set gateC n/a
        set_cr_status "$PROJECT/docs/changes/$cur.md" "cancelled $(now_utc)"
        state_log "$cur cancelled by the human (no code was changed; tag pre-$cur kept)"
        echo "✔ $cur cancelled. State restored. Tag pre-$cur kept (delete with: git tag -d pre-$cur)"
        echo "note: the analysis may have edited docs/PRD.md, docs/DECISIONS.md or docs/STACK.md (look for [$cur]). Review: git diff docs/  — revert with: git checkout docs/PRD.md (not run for you)" ;;
      amend)
        [ -n "$cur" ] || { echo "No open change request to amend."; exit 1; }
        [ "$(state_get gateC)" = pending ] || { echo "$cur is already being worked on; amend is only possible at Gate C."; exit 1; }
        printf '\n## Amendment %s\n%s\n' "$(now_utc)" "$(if [ -f "$REQUEST" ]; then cat "$REQUEST"; else printf '%s' "$REQUEST"; fi)" >> "$PROJECT/docs/changes/$cur.md"
        set_cr_status "$PROJECT/docs/changes/$cur.md" "amended"
        write_drift "$PROJECT/docs/changes/$cur.drift.txt"
        pilot "change $cur" ;;
      new)
        if [ -n "$cur" ]; then
          echo "$cur is still open (state: $(state_get current_stage)). Use: change --amend \"<text>\"  to revise it, or  change --cancel  to drop it."; exit 1
        fi
        if is_git && [ -n "$(git -C "$PROJECT" status --porcelain -- . ':(exclude)docs/pipeline' ':(exclude).claude' ':(exclude)docs/changes' ':(exclude).gitignore')" ]; then
          echo "Uncommitted changes in $PROJECT. Commit or stash them first (a change run edits existing files)."; exit 1
        fi
        mkdir -p "$PROJECT/docs/changes"
        n=$(find "$PROJECT/docs/changes" -maxdepth 1 -name 'CR-*.md' | wc -l); CR=$(printf 'CR-%03d' $((n + 1)))
        { printf '# %s\nStatus: requested\n\n## Request\n' "$CR"; if [ -f "$REQUEST" ]; then cat "$REQUEST"; else printf '%s\n' "$REQUEST"; fi; } > "$PROJECT/docs/changes/$CR.md"
        write_drift "$PROJECT/docs/changes/$CR.drift.txt"
        [ -f "$PROJECT/docs/changes/$CR.drift.txt" ] && echo "note: $(drift_count) commit(s) were made outside autopilot since its last run; the analysis will read them (docs/changes/$CR.drift.txt)"
        is_git && git -C "$PROJECT" tag "pre-$CR" 2>/dev/null && echo "restore point: git tag pre-$CR"
        pilot "change $CR" ;;
    esac ;;

  approve)
    [ -f "$STATE" ] || { echo "No pipeline in $PROJECT yet."; exit 1; }
    assert_not_running
    stage="$(state_get current_stage)"
    case "$stage" in *"GATE 1"*) gate=gate1 ;; *"GATE 2"*) gate=gate2 ;;
      *"GATE C"*) gate=gateC ;;
      *"GATE V"*) if grep -q '^mode: program' "$STATE"; then gate=gate; else gate=gateV; fi ;;
      *"GATE M"*|*"GATE S"*|*"GATE D"*) gate=gate ;; *) echo "Nothing to approve (stage: $stage)"; exit 1 ;; esac
    sed -i.bak -e "s/^${gate}:[[:space:]]*pending/${gate}: approved/" -e 's/^status:[[:space:]]*awaiting_approval/status: running/' "$STATE" && rm -f "$STATE.bak"
    state_log "$gate human APPROVED"
    echo "✔ $gate approved"; pilot resume ;;

  status)
    [ -f "$STATE" ] || { echo 'No pipeline in this project yet.'; exit 0; }
    cat "$STATE"; echo
    if alive; then echo "process: RUNNING (PID $(cat "$LOCK"), heartbeat $(cat "$HEARTBEAT" 2>/dev/null || echo '?'))"
    else
      echo "process: not running"
      [ "$(state_get status)" = running ] && echo "⚠ STATE.md says 'running' but no process is alive — the run was killed. Safe to: ./run.sh resume"
    fi
    d="$(drift_count)"; [ "$d" -gt 0 ] && echo "⚠ $d commit(s) outside autopilot since its last run; docs may lag the code. Consider: ./run.sh adopt"
    true ;;

  preview)
    [ -f "$PROJECT/package.json" ] || { echo "No package.json in $PROJECT — build the app first."; exit 1; }
    free_port() { local p="$1"; while (echo >"/dev/tcp/127.0.0.1/$p") 2>/dev/null; do p=$((p + 1)); done; echo "$p"; }
    export DEMO_WEB_PORT="$(free_port 3000)"; export DEMO_API_PORT="$(free_port $((DEMO_WEB_PORT + 1)))"
    echo "▶ starting the app with demo data (npm run demo) — web http://localhost:$DEMO_WEB_PORT  api http://localhost:$DEMO_API_PORT — Ctrl-C to stop"
    (cd "$PROJECT" && npm run demo) ;;

  *) echo "unknown command: $CMD"; exit 1 ;;
esac
