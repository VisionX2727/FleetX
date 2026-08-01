# Fleet Manager

Fleet Manager is a mobile-first operations app for small fleet owners to track vehicles, daily work, fuel, drivers, customers, khata balances, receipts, and profitability.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/fleet-manager/src/pages/` — main mobile screens for home, fleet, logs, khata, fuel, analytics, drivers, calculator, and settings
- `artifacts/fleet-manager/src/lib/store.tsx` — local-first fleet data model and persistence
- `artifacts/fleet-manager/src/lib/supabase.ts` — Supabase browser client and Google OAuth configuration
- `artifacts/fleet-manager/src/index.css` — industrial yellow/steel visual theme

## Architecture decisions

- The first milestone is local-first so the app remains usable offline and keeps records across reloads.
- Supabase is used for Google OAuth and logout; fleet entities are currently stored in local browser storage.
- Khata charges are linked to work logs and vehicles so receipts and payment QR amounts are derived from recorded work.

## Product

Users can register vehicles, record work and fuel by vehicle/date, assign drivers, track driver pay, manage customer khata ledgers, generate UPI payment QR codes, download receipt text, view vehicle profitability, use a persistent calculator, and save business details/logo for receipts.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
