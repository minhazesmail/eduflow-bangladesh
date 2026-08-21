# EduFlow Bangladesh

Bangladesh-first SaaS for coaching-center management. The production app uses Vanilla HTML/CSS/JS, Supabase Auth/Postgres, Supabase Edge Functions, and Vercel.

## Runtime architecture

```text
index.html → landing site
app.html
  ├─ config.js
  ├─ Supabase JS client
  ├─ mock-data.js
  ├─ mock-data-normalize.js
  ├─ demo-mode.js
  ├─ app-core.js
  ├─ operations-ui-v2.js
  └─ auth-recovery.js
```

`app-core.js` is the primary runtime. `operations-ui-v2.js` supplies the richer attendance/team/payment/result/notice workflows. `auth-recovery.js` adds the password reset flow to the active app. Retired legacy runtimes are not loaded by `app.html`.

## Fresh Supabase setup

Run these in order:

1. `supabase/migrations/0001_base_schema.sql`
2. `migration.sql`
3. `supabase/migrations/0002_stabilization.sql`
4. `supabase/migrations/0003_functionality_hardening.sql`
5. `supabase/migrations/0004_onboarding_trigger.sql`
6. Deploy `supabase/functions/invite-member/index.ts`

The numbered migrations are the canonical source for new deployments. `migration.sql` is retained as a compatibility hardening script for existing installations.

## Existing-project upgrade

Run the same sequence, including the functionality hardening and onboarding migrations. The scripts are written to be idempotent for the policies, indexes, support tables and triggers they own.

## Environment variables

### Browser / Vercel

The browser only uses the Supabase project URL and publishable key from `config.js`. No service-role key is included in client code.

### Supabase Edge Function

`invite-member` expects:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SITE_URL
```

Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser.

## Authentication

The active app supports:

- email/password sign-up
- email/password sign-in
- password recovery email
- secure password reset from a Supabase recovery session
- owner-only team invitations

The password reset redirect is:

```text
https://<your-site>/app.html?mode=recovery
```

Add that URL to Supabase Auth's allowed redirect URLs.

## Demo mode

Open `/app.html?demo=true`.

Demo mode uses in-memory sample Bangladesh data, never reads or writes production Postgres, disables mutations, and shows a persistent Demo Mode banner with an Exit action.

## Invite flow

The owner uses the Team page to call the JWT-protected `invite-member` Edge Function. The function validates the caller, verifies owner role, creates the invitation row, sends the Supabase Auth invite, passes the invitation ID in metadata and redirects the invitee back to `app.html`.

The function handles browser CORS preflight and returns JSON errors consistently.

## Security model

- RLS is enabled on application tables.
- Tenant isolation uses `private.user_org_id()`.
- Database write policies now match the UI role matrix: staff can record attendance/payments but cannot delete or edit payments; teachers can enter/edit results but cannot delete them.
- The signed-in user has an explicit self-view policy on `profiles`.
- Security-definer triggers have explicit search paths.
- Service-role credentials exist only in Edge Functions.
- Demo data never writes to Supabase.
- Dynamic UI output is escaped before rendering.

## Operational features

Current production runtime includes students, guardian records, batches, bulk/date attendance, fee/payment CRUD, exams, results CRUD, notices CRUD, owner team role management, owner invitations, billing/usage display, audit-log display, offline status handling, demo mode, and password recovery.

## Deployment

Vercel serves the static frontend. Supabase hosts Auth, Postgres and Edge Functions.

For local static development:

```bash
npx serve . --listen 3000
```

## Production verification checklist

Before launch, verify:

- fresh schema migrations complete without an `attendance.date` error
- the onboarding trigger creates an owner profile on sign-up
- the owner can sign in and load `profiles` + `organizations`
- staff cannot edit/delete payments
- staff cannot delete attendance
- teachers cannot delete results
- owner role changes use the Team modal
- invitation preflight and POST requests succeed
- password recovery reaches `app.html?mode=recovery`
- Demo Mode does not call production Postgres
- Vercel production deployment is READY
