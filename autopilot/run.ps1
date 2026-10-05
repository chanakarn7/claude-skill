<#
.SYNOPSIS
  Autopilot - run the autonomous agent team headless with Claude Code.

.EXAMPLE
  .\run.ps1 start .\idea.md -Project C:\work\my-app
  .\run.ps1 status  -Project C:\work\my-app
  .\run.ps1 approve -Project C:\work\my-app     # pass the current gate and continue
  .\run.ps1 resume  -Project C:\work\my-app     # continue after a block/crash
  .\run.ps1 change "what to change | file" -Project C:\work\my-app   # restyle / new requirement / bigger fix on a built project
  .\run.ps1 preview -Project C:\work\my-app     # run the built app with demo data (npm run demo)
  .\run.ps1 program -Project C:\work\my-app     # multi-module build from docs\program\ROADMAP.md (made with /roadmap)
#>
param(
  [Parameter(Mandatory, Position = 0)][ValidateSet('start', 'resume', 'approve', 'status', 'program', 'preview', 'change')][string]$Command,
  [Parameter(Position = 1)][string]$Idea,
  [string]$Project = (Get-Location).Path
)
$ErrorActionPreference = 'Stop'
$OutputEncoding = [Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)

$Root    = $PSScriptRoot
$Project = (New-Item -ItemType Directory -Force $Project).FullName
$State   = Join-Path $Project 'docs\pipeline\STATE.md'

function Find-Claude {
  $cmd = Get-Command claude -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  foreach ($p in @("$env:USERPROFILE\.local\bin\claude.exe", "$env:APPDATA\npm\claude.cmd")) {
    if (Test-Path $p) { return $p }
  }
  throw 'Claude Code CLI not found. Install it or add it to PATH.'
}

function Install-Agents {
  # Agents are installed per project so nothing in ~/.claude is touched.
  $dest = Join-Path $Project '.claude\agents'
  New-Item -ItemType Directory -Force $dest | Out-Null
  Copy-Item (Join-Path $Root 'agents\*.md') $dest -Force
  $tpl = Join-Path $Project 'docs\pipeline\templates'
  New-Item -ItemType Directory -Force $tpl | Out-Null
  Copy-Item (Join-Path $Root 'templates\*') $tpl -Force
  $stack = Join-Path $Project 'docs\STACK.md'
  if (-not (Test-Path $stack)) { Copy-Item (Join-Path $Root 'stack.md') $stack }
  elseif (-not (Select-String -Path $stack -Pattern '^## UI layer \(web\)' -Quiet)) {   # upgrade an older project STACK.md
    $new = (Get-Content (Join-Path $Root 'stack.md') -Raw -Encoding UTF8)
    if ($new -match '(?s)(## UI layer \(web\).*?)(?=## Local database)') { Add-Content $stack -Encoding UTF8 ("`n" + $Matches[1]) }
  }
}

function Get-StateValue([string]$key) {
  if (-not (Test-Path $State)) { return $null }
  $m = Select-String -Path $State -Pattern "^${key}:\s*(.+)$" | Select-Object -First 1
  if ($m) { $m.Matches[0].Groups[1].Value.Trim() }
}

# One run per project: a second approve/resume while a run is active would dispatch
# the same stages twice and both runs would overwrite each other's files.
$Lock = Join-Path $Project 'docs\pipeline\.lock'

function Assert-NotRunning {
  if (-not (Test-Path $Lock)) { return }
  $owner = (Get-Content $Lock -Raw).Trim()
  if ($owner -and (Get-Process -Id $owner -ErrorAction SilentlyContinue)) {
    throw "Autopilot is already running for this project (PID $owner). Wait for it to finish, or check '.\run.ps1 status'."
  }
  Remove-Item $Lock -Force  # stale lock from a crashed run
}

function Invoke-Pilot([string]$pilotCommand) {
  Assert-NotRunning
  New-Item -ItemType Directory -Force (Split-Path $Lock) | Out-Null
  Set-Content $Lock $PID -Encoding ASCII
  Install-Agents
  $claude = Find-Claude
  $prompt = (Get-Content (Join-Path $Root 'autopilot.md') -Raw -Encoding UTF8) + "`n`nCOMMAND: $pilotCommand`n"

  # Pre-gate-2 safety: edits are auto-accepted, Bash is limited to build/test/local-git,
  # and anything that publishes or deploys is denied outright.
  $allowed = @(
    'Agent', 'Read', 'Write', 'Edit', 'Glob', 'Grep',
    'Bash(npm:*)', 'Bash(npx:*)', 'Bash(node:*)', 'Bash(pnpm:*)', 'Bash(yarn:*)',
    'Bash(git init:*)', 'Bash(git add:*)', 'Bash(git commit:*)', 'Bash(git status:*)',
    'Bash(git diff:*)', 'Bash(git log:*)',
    'Bash(ls:*)', 'Bash(cat:*)', 'Bash(mkdir:*)', 'Bash(mv:*)', 'Bash(cp:*)', 'Bash(pwd)',
    'Bash(docker build:*)', 'Bash(docker --version)', 'Bash(docker compose -f docker-compose.dev.yml:*)'
  )
  $denied = @(
    'Bash(git push:*)', 'Bash(npm publish:*)', 'Bash(npx vercel:*)', 'Bash(npx netlify:*)',
    'Bash(npx gh-pages:*)', 'Bash(docker push:*)', 'Bash(docker run:*)',
    'Bash(docker compose -f docker-compose.dev.yml run:*)', 'Bash(docker compose -f docker-compose.dev.yml exec:*)',
    'Bash(aws:*)', 'Bash(ssh:*)', 'Bash(scp:*)', 'Bash(rm -rf /*)'
  )

  $logDir = Join-Path $Project 'docs\pipeline'
  New-Item -ItemType Directory -Force $logDir | Out-Null
  $log = Join-Path $logDir ("run-{0:yyyyMMdd-HHmmss}.log" -f (Get-Date))

  Write-Host ">> autopilot $pilotCommand  (project: $Project)" -ForegroundColor Cyan
  Push-Location $Project
  try {
    $prompt | & $claude -p --permission-mode acceptEdits --strict-mcp-config `
      --allowedTools @allowed --disallowedTools @denied `
      --output-format text 2>&1 | Tee-Object -FilePath $log
  } finally {
    Pop-Location
    Remove-Item $Lock -Force -ErrorAction SilentlyContinue
  }
  Write-Host "`nlog: $log" -ForegroundColor DarkGray
  if (Select-String -Path $log -Pattern 'Failed to authenticate|OAuth access token has expired' -Quiet) {
    throw "Claude CLI is not logged in. Run '$claude' once interactively and sign in (/login), then re-run this command."
  }
  if (Select-String -Path $log -Pattern 'hit your (session|usage) limit|usage limit reached' -Quiet) {
    if (Test-Path $State) {
      $hit = (Select-String -Path $log -Pattern 'limit' | Select-Object -Last 1).Line
      Add-Content $State -Encoding UTF8 ("`n- {0:yyyy-MM-ddTHH:mm:ssZ} runner LIMIT - Claude usage limit reached: {1}" -f (Get-Date).ToUniversalTime(), $hit)
    }
    throw "Stopped: Claude usage limit reached (noted in STATE.md Log). STATE.md may lag one stage. Run '.\run.ps1 resume' after the limit resets."
  }
}

switch ($Command) {
  'start' {
    if (-not $Idea) { throw 'Usage: .\run.ps1 start <idea-file> [-Project <dir>]' }
    $ideaPath = (Resolve-Path $Idea).Path
    $docs = New-Item -ItemType Directory -Force (Join-Path $Project 'docs')
    Copy-Item $ideaPath (Join-Path $docs 'IDEA.md') -Force
    Invoke-Pilot 'start docs/IDEA.md'
  }
  'resume' { Invoke-Pilot 'resume' }
  'program' { Invoke-Pilot 'program' }
  'approve' {
    Assert-NotRunning
    $stage = Get-StateValue 'current_stage'
    $gate = switch -Regex ($stage) { 'GATE 1' { 'gate1' } 'GATE 2' { 'gate2' } 'GATE C' { 'gateC' } 'GATE V' { if ((Get-Content $State -Raw) -match '(?m)^mode:\s*program') { 'gate' } else { 'gateV' } } 'GATE [MSD]' { 'gate' } default { $null } }
    if (-not $gate) { throw "Nothing to approve - current stage is '$stage'. Run '.\run.ps1 status'." }
    (Get-Content $State -Raw -Encoding UTF8) -replace "(?m)^${gate}:\s*pending", "${gate}: approved" `
      -replace '(?m)^status:\s*awaiting_approval', 'status: running' |
      Set-Content $State -Encoding UTF8 -NoNewline
    Add-Content $State -Encoding UTF8 ("`n- {0:yyyy-MM-ddTHH:mm:ssZ} {1} human APPROVED" -f (Get-Date).ToUniversalTime(), $gate)
    Write-Host "[OK] $gate approved" -ForegroundColor Green
    Invoke-Pilot 'resume'
  }
  'status' {
    if (-not (Test-Path $State)) { Write-Host 'No pipeline in this project yet.'; break }
    Get-Content $State -Encoding UTF8
    $owner = if (Test-Path $Lock) { (Get-Content $Lock -Raw).Trim() } else { $null }
    if ($owner -and (Get-Process -Id $owner -ErrorAction SilentlyContinue)) { Write-Host "`nprocess: RUNNING (PID $owner)" } else { Write-Host "`nprocess: not running" }
  }
  'change' {
    if (-not $Idea) { throw 'Usage: .\run.ps1 change "<what to change | file>" [-Project <dir>]' }
    if (-not (Test-Path $State)) { throw "No pipeline in $Project yet - use 'start' first." }
    Assert-NotRunning
    if (Test-Path (Join-Path $Project '.git')) {
      $dirty = git -C $Project status --porcelain -- . ':(exclude)docs/pipeline' ':(exclude).claude' ':(exclude)docs/changes'
      if ($dirty) { throw "Uncommitted changes in $Project. Commit or stash them first (a change run edits existing files)." }
    }
    $dir = New-Item -ItemType Directory -Force (Join-Path $Project 'docs\changes')
    $n = @(Get-ChildItem $dir.FullName -Filter 'CR-*.md').Count + 1
    $cr = 'CR-{0:000}' -f $n
    $body = if (Test-Path $Idea) { Get-Content $Idea -Raw -Encoding UTF8 } else { $Idea }
    Set-Content (Join-Path $dir.FullName "$cr.md") -Encoding UTF8 ("# $cr`nStatus: requested`n`n## Request`n$body`n")
    if (Test-Path (Join-Path $Project '.git')) { git -C $Project tag "pre-$cr" 2>$null; Write-Host "restore point: git tag pre-$cr" }
    Invoke-Pilot "change $cr"
  }
  'preview' {
    if (-not (Test-Path (Join-Path $Project 'package.json'))) { throw "No package.json in $Project - build the app first." }
    Write-Host '>> starting the app with demo data (npm run demo) - Ctrl-C to stop' -ForegroundColor Cyan
    Push-Location $Project; try { npm run demo } finally { Pop-Location }
  }
}
