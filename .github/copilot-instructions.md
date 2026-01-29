<!-- Copilot instructions for the Budget-Tracker repository -->

Purpose
-------
- Help AI coding agents become productive quickly in this repo by summarizing architecture, developer workflows, and project-specific patterns.

High-level architecture
-----------------------
- Frontend: Next.js (app router, `app/` directory) written in TypeScript and React 19. Key UI code lives under `app/components/`, `app/dashboard/`, and `app/ui/`.
- Data access: client hooks in `app/hooks/useApi.ts` call REST-style endpoints under `/api/*` (examples: `/api/categories`, `/api/incomes`, `/api/expenses`, `/api/bills`, `/api/credit-cards`).
- Server/DB layer: `app/lib/db.ts` uses the `mssql` package to connect to a SQL Server instance. SQL schema: `database/schema.sql`. Historical API route implementations are in `app/_api_disabled/` (look there for examples to re-enable or adapt).
- Mobile / PWA: Capacitor is configured (`capacitor.config.ts`, `android/`, `ios/`). The app is a PWA (see `public/manifest.json` and `public/sw.js`) and can be packaged with Capacitor.

Developer workflows & important commands
--------------------------------------
- Local dev (web): `npm run dev` — runs Next.js dev server (http://localhost:3000).
- Build web output for Capacitor: `npm run build:web` — runs `next build` and `node scripts/generate-out.js` to produce the `out` web-dir used by Capacitor.
- Capacitor lifecycle (after producing web output):
  - `npm run cap:init` (only once) to initialize Capacitor with `--web-dir=out`.
  - `npm run cap:sync` to copy web assets to native projects.
  - `npm run cap:open:android` / `npm run cap:open:ios` to open native IDEs.
- Linting: `npm run lint` uses `eslint` with project config `eslint.config.mjs`.

Project-specific conventions & patterns
-------------------------------------
- App router usage: pages/components are inside `app/` using the Next 13+ app directory structure. Edit `app/page.tsx` and nested folders for views.
- Client data access: prefer the hooks in `app/hooks/useApi.ts` — they encapsulate fetch patterns and error handling. Use the same `/api/*` path shape when adding endpoints.
- Database connection: `app/lib/db.ts` centralizes `mssql` connection pooling. Do not hardcode secrets when committing; replace with environment configuration when creating production-ready changes.
- Disabled API routes: production API behaviors may be disabled; check `app/_api_disabled/` for prior route code and mirror patterns when re-enabling.
- State: shared UI state is provided through `context/BudgetContext.tsx` — follow its shape when adding features that need global state.

Integration points & external dependencies
----------------------------------------
- SQL Server via `mssql` (see `app/lib/db.ts`). Local credentials live in that file for development; replace with environment variables in PRs.
- Capacitor (`@capacitor/*`) for mobile packaging; native projects are under `android/` and `ios/`.
- Netlify config exists (`netlify.toml`) and serverless function example in `netlify/functions/ping.js`.

Files to inspect first (quick tour)
---------------------------------
- `package.json` (scripts & deps) — build and cap scripts.
- `app/hooks/useApi.ts` — canonical client fetch patterns and endpoint names.
- `app/lib/db.ts` and `database/schema.sql` — DB connection and schema.
- `app/_api_disabled/` — prior API route implementations to reuse.
- `scripts/generate-out.js` — web -> `out` generation used by `build:web`.

Notes for contributors / AI agents
---------------------------------
- Prefer small, focused changes. Preserve Next.js app-router conventions.
- Avoid committing secrets; if you need credentials for local testing, use environment variables and document them in a secure channel.
- When updating mobile flow, validate by running `npm run build:web` then `npm run cap:sync` before opening native projects.

If anything above is unclear or you want more detail (CI, deploy to Netlify/Vercel, or how the mobile packaging is validated), tell me which area to expand.
