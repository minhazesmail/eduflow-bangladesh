# EduFlow Bangladesh

Bangladesh-first SaaS for coaching-center management. The production app uses Vanilla HTML/CSS/JS, Supabase Auth/Postgres, Supabase Edge Functions, and Vercel.

## Runtime architecture

The active browser runtime is intentionally small and single-path:

```text
index.html → landing site
app.html
  ├─ config.js
  ├─ Supabase JS client
  ├─ mock-data.js
  ├─ mock-data-normalize.js
  ├─ demo-mode.js
  ├─ app-core.js
  └─ operations-ui-v2.js
```

`app-core.js` is the main application runtime. The old `app.js`, `rbac.js`, `team.js`, `auth-ux.js`, `communication.js`, and `communication-access.js` implementations have been retired to avoid duplicate runtimes.

## Fresh Supabase setup

1. Create a Supabase project.
2. Run `supabase/migrations/0001_base_schema.sql`.
3. Run `migration.sql`.
4. Run `supabase/migrations/0002_stabilization.sql`.
5. Deploy the invite function:

```bash
supabase functions deploy invite-member
```

## Existing-project upgrade

For an existing EduFlow database, run:

```text
migration.sql
supabase/migrations/0002_stabilization.sql
```

`0002_stabilization.sql` is idempotent for the policies/indexes it manages.

## Environment variables

### Vercel / browser configuration

The browser uses a Supabase project URL and publishable/anon key. These values are safe to expose to the browser when RLS is correctly configured.

Recommended deployment settings:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
APP_ENV
RATE_LIMIT_MAX
RATE_LIMIT_WINDOW_MS
MAX_STUDENTS_FREE
MAX_STUDENTS_PRO
MAX_STUDENTS_ENTERPRISE
```

The current static Vercel build resolves the public browser values through `config.js`.

### Supabase Edge Function secrets

For `invite-member`:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SITE_URL
```

Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser.

## Demo mode

Open:

```text
/app.html?demo=true
```

Demo mode:

- uses in-memory sample Bangladesh data
- does not read or write production Postgres
- disables mutations
- shows a persistent Demo Mode state
- provides an `Exit Demo` action

## Invite flow

The owner uses the Team page to call the JWT-protected `invite-member` Edge Function.

The function:

1. validates the caller JWT
2. verifies the caller is the organization owner
3. creates an `organization_invitations` row
4. sends the Supabase Auth invitation email
5. includes the invitation ID in user metadata
6. marks the invitation as sent

The database onboarding trigger consumes the invitation metadata and creates the invited profile with the assigned role.

## Security model

- RLS is enabled on application tables.
- Tenant isolation uses `private.user_org_id()`.
- Role authorization is enforced in database policies.
- The signed-in user has an explicit self-view policy on `profiles` so first login can load the profile.
- Service-role credentials exist only in Edge Functions.
- Demo data never writes to Supabase.
- Dynamic UI output is escaped before rendering.

## Operational features

Current production runtime includes:

- students and guardian records
- batches
- bulk/date-based attendance
- fee/payment CRUD
- exams and results CRUD
- notices CRUD
- owner team role management
- owner team invitations
- billing/usage display
- audit-log display
- offline status handling
- read-only Try Demo sandbox

## Deployment

Vercel serves the static frontend. Supabase hosts Auth, Postgres, and Edge Functions.

For local static development:

```bash
npx serve . --listen 3000
```

## Production checklist

Before launch, verify:

- `0001_base_schema.sql` succeeds on a fresh database
- `migration.sql` succeeds immediately after it
- `0002_stabilization.sql` succeeds
- owner/admin/teacher/staff RLS matrix is tested
- invite function secrets are configured
- Demo Mode never touches production data
- Vercel production deployment is READY
