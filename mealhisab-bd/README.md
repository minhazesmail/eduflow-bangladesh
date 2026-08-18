# MealHisab BD

Bangladesh-first meal accounting for shared flats, messes and small households.

## Current architecture

- Next.js 16 App Router + React 19 + TypeScript
- Supabase Auth, PostgreSQL, Storage and Realtime
- Database-enforced tenancy/RLS and transactional cycle closing
- Explicit meal overrides with policy-aware implicit meals
- Immutable settlement snapshots and per-cycle opening/closing balances
- English/Bangla-ready UI with BDT formatting

This application lives under `mealhisab-bd/` so the existing EduFlow product in the parent repository remains untouched.

## Local setup

```bash
cd mealhisab-bd
cp .env.example .env.local
npm install
npm run typecheck
npm run test
npm run dev
```

Set these environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_APP_URL`

Do not put a Supabase service-role key in browser or public environment variables.

## Supabase

Apply `supabase/migrations/00001_initial.sql`, then `00002_security.sql`, then `00003_accounting.sql` in order. New public tables are explicitly granted to the authenticated Data API role and protected by RLS.

## Production

Point Vercel at this repository with the project root set to `mealhisab-bd/`. GitHub Actions runs lint/typecheck/unit tests; Vercel Git integration handles preview and production deployment.
