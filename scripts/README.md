# scripts/

Standalone Node scripts run with plain `node` (no bundler, no test runner).
They talk to the **remote** Supabase project because local Docker isn't set up
here. Each reads `.env.local` from the repo root.

| Script | npm | What it does |
|--------|-----|--------------|
| `test-rls-isolation.mjs` | `npm run test:rls` | Creates two throwaway users + orgs and asserts that cross-tenant SELECT / INSERT / UPDATE / DELETE / Storage are all denied and that `audit_logs` is append-only (M0 §6/§15). Always cleans up after itself. Exit 0 = isolation holds. |
| `check-bundle-secrets.mjs` | `npm run check:bundle` | Run after `next build`. Greps `.next/static` for server-only secret values and markers (`sb_secret_`, `service_role`, `postgresql://`). Exit 0 = nothing leaked. |

`npm run verify` chains lint → typecheck → build → check:bundle.

> `test:rls` needs `SUPABASE_SECRET_KEY` (service role) to create/delete the test
> users. It never writes to real tenant data.
