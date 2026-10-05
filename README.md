# claude-skills

Personal user-level Claude Code skills — a doc-driven delivery pipeline reusable across all projects.

Lives at `~/.claude/skills/` (Mac/Linux) or `%USERPROFILE%\.claude\skills\` (Windows).

## Pipeline

```
[/grill-me] → brainstorm → /ba → /sa → [design direction] → /uxui → /proto → /scaffold → /dev → /qa → /devops
```

`/grill-me` is an optional pre-`/ba` step: a relentless one-question-at-a-time interview that pressure-tests
a raw idea before it becomes a PRD, so `/ba` starts from a sharpened idea instead of a vague one. It writes
no files — the resolved understanding just carries into the conversation that feeds `/ba`.

`/kickoff` orchestrates the whole chain stage-by-stage, enforcing canonical-file hand-offs
(`docs/PRD.md` → `docs/SA_BLUEPRINT.md` → `docs/UXUI_DESIGN.md` → `docs/mockups/`) and is resumable.

For systems too big for one PRD (ERP, hospital/HIS, marketplace, super-app), `/roadmap` sits one
level above: it decomposes the system into modules, sizes a rough sprint plan, locks the shared
architecture / data model / design system in `docs/program/`, then drives `/kickoff` per module
(writing to `docs/modules/<name>/`) and tracks progress in `docs/program/ROADMAP.md` so the whole
multi-sprint build is resumable across many sessions.

**Which one?** You don't have to choose up front — the skills self-route. `/roadmap` triages on
entry and hands off to `/kickoff` if the system turns out small; `/kickoff` points you up to
`/roadmap` if it's really multi-module. Rule of thumb: **several distinct modules whose data flows
together, shipped across sprints → `/roadmap`; one coherent project → `/kickoff`.**

## Skills

| Skill | Role | Writes |
|-------|------|--------|
| `roadmap` | program orchestrator for big multi-module/multi-sprint builds (triage → decompose → sprint plan → drive `/kickoff` per module) | `docs/program/{VISION,ARCHITECTURE,DATA_MODEL,DESIGN_SYSTEM,ROADMAP}.md` |
| `kickoff` | orchestrator (sizes run, manages token budget, decision points) | — |
| `grill-me` | optional pre-`/ba` interview that pressure-tests a raw idea one question at a time before it's written up | — |
| `ba` | requirements → PRD | `docs/PRD.md` |
| `sa` | technical blueprint (schema, API) | `docs/SA_BLUEPRINT.md` |
| `uxui` | design system + screens (presents 2–3 direction options before locking) | `docs/UXUI_DESIGN.md` |
| `proto` | single-file clickable HTML prototype | `docs/mockups/*.html` |
| `scaffold` | runnable repo skeleton via framework CLIs | repo skeleton |
| `dev` | feature code | source |
| `qa` | test cases / scripts | tests |
| `devops` | Docker, CI/CD, deploy | pipelines |

## Setup on a new machine

```bash
cd ~/.claude
git clone <this-repo-url> skills
```

Then install the companion plugins (not stored here — they come from marketplaces):

```
/plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill
/plugin install ui-ux-pro-max@ui-ux-pro-max-skill
/plugin marketplace add anthropics/skills      # superpowers (brainstorming, TDD, etc.)
/reload-plugins
```

Optional extras: `frontend-design` (official, alt design direction), `taste` (craft enforcement).
