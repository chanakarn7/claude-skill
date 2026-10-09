# Default stack (autopilot)

Applies when the PRD needs a server, shared data, multi-user, or auth. A **client-only** app (no shared data) skips the server parts (`Layout`, the NestJS/Prisma scaffold, `Local database`, `Deployment targets`) and stays on Vite + TypeScript + localStorage/IndexedDB — **but the `UI layer` and `Visual verification` sections apply to every UI project, client-only or not**, using the Vite equivalents noted there. An idea file may override anything here — record the override in `docs/DECISIONS.md`.

## Layout — monorepo (npm workspaces)
```
package.json              workspaces: ["apps/*", "packages/*"]
apps/web                  Next.js (App Router) + TypeScript + Tailwind
apps/api                  NestJS + TypeScript + Prisma (prisma/ lives here)
packages/shared           TypeScript types + zod schemas shared by web and api (the API contract)
docker-compose.dev.yml    dev/test PostgreSQL (copied from docs/pipeline/templates/ — do not edit)
```
- web ↔ api over REST/JSON; base URL from `NEXT_PUBLIC_API_URL`; api enables CORS for the web origin from env.
- Request/response shapes are defined once in `packages/shared` and imported by both apps.
- Use `org_id` on every table only if the PRD asks for multi-tenancy.

## Tools
- Package manager: **npm** (workspaces). Node LTS.
- Database: **PostgreSQL 16**, Prisma migrations only (never hand-edit the DB, never destructive rewrites of applied migrations).
- Tests: Jest (api, Nest default), Vitest + Testing Library (web, shared). E2E: Playwright only if browser install works; otherwise integration tests.
- Scaffold (non-interactive; fall back to the nearest standard CLI if one fails twice and log it):
  - `npx create-next-app@latest apps/web --ts --tailwind --eslint --app --use-npm --no-git --yes`
  - `npx @nestjs/cli new apps/api --package-manager npm --skip-git --strict`

## UI layer (every web UI project — Next.js app or client-only Vite app)
- **Component library: shadcn/ui** (`npx shadcn@latest init`, then `add` button input select dialog sheet badge card table tabs dropdown-menu tooltip sonner). It supports both Next.js and Vite. Components live in `components/ui` (`apps/web/src/components/ui` in the monorepo; `src/components/ui` in a Vite app) and are used for EVERY button, input, select, dialog, menu, table and badge. Hand-written replacements are forbidden unless the blueprint records why in `docs/DECISIONS.md`.
- **Icons:** lucide-react (or phosphor), one family only. No emoji as structural icons or status markers.
- **Fonts:** the font named in the design doc must actually load; verify in the built page. Next.js: `next/font` (google or local). Vite: `@fontsource/<family>` packages imported in the entry file (local, no CDN), or a `<link>` in `index.html`. Thai UI needs a Thai-capable font (Noto Sans Thai, IBM Plex Sans Thai, Prompt, Sarabun).
- **Charts:** recharts (or similar) whenever the PRD has a dashboard or summary screen. A PRD that asks only for a simple bar list may use plain CSS/SVG bars (record why in `docs/DECISIONS.md`).
- **Theming:** CSS variables from the design tokens; light + dark + system with a visible toggle, unless the idea file says single-theme.
- **Utility CSS:** Tailwind utilities in JSX (Next.js: `create-next-app --tailwind`; Vite: the `@tailwindcss/vite` plugin). The global stylesheet holds tokens and resets only, not component classes.

## Visual verification (all UI projects)
- `docs/pipeline/templates/screenshot.mjs` (Playwright) renders pages and captures screenshots at 1440 and 390 px in light and dark; proto-agent, dev-agent and qa-agent use it. Setup is in the script header.
- `npm run demo` at the repo root (honors `DEMO_WEB_PORT`/`DEMO_API_PORT`, default 3000/3001; web in dev mode; prints the demo accounts, which never require a password change) starts the database, migrates, loads demo data (`seed:demo`, every state/role/edge case, realistic volume), starts api + web, and prints URLs and demo accounts. `run.sh preview` calls it.

## Local database (dev and tests)
- `docker compose -f docker-compose.dev.yml up -d --wait` then `DATABASE_URL=postgresql://app:app_dev_password@127.0.0.1:5433/app_dev`.
- Tests use the same server with `?schema=test` appended.
- Stop with `docker compose -f docker-compose.dev.yml down` (keeps the volume).
- If the Docker daemon is not running: reply `RESULT: BLOCKED — Docker daemon not running`. Do **not** silently switch to SQLite or mock the database.

## Deployment targets (devops-agent, after Gate 2)
- **Raspberry Pi first** — `linux/arm64`, Docker Compose, images built off-device (a Pi is too small for `next build`).
- **AWS for paying customers** — container-based (ECS or EC2 + RDS PostgreSQL); Graviton (arm64) keeps one image for both targets.
- Prepare files and documented commands only. The human runs any deploy.
