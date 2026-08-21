# EduFlow Bangladesh

Bangladesh-first SaaS for coaching-center management. The production app uses Vanilla HTML/CSS/JS, Supabase Auth/Postgres, Supabase Edge Functions, and Vercel.

## Runtime architecture

```text
index.html → landing site
app.html
  ├─ config.js
  ├─ Supabase JS client
  ├─ branch-context.js
  ├─ mock-data.js
  ├─ mock-data-normalize.js
  ├─ demo-mode.js
  ├─ app-core.js
  ├─ operations-ui-v2.js
  ├─ growth-features.js
  ├─ production-gaps-fix.js
  └─ auth-recovery.js

guardian.html → mobile-first guardian portal
api/notification-worker.js → Vercel Cron → Supabase notification queue worker
```

## Growth features

The product layer includes guardian portal, automated notifications, admissions CRM, multi-branch context, Attention Center, routine/conflict detection, expenses/profit, operational documents, notification history, EduFlow AI, and payment integration boundaries.

## Database migrations

For new environments, run the canonical base/security migrations and growth migrations in order, including:

1. `supabase/migrations/0001_base_schema.sql`
2. `migration.sql`
3. `supabase/migrations/0002_stabilization.sql`
4. `supabase/migrations/0003_functionality_hardening.sql`
5. `supabase/migrations/0004_onboarding_trigger.sql`
6. `supabase/migrations/20260821141000_growth_features.sql`
7. `supabase/migrations/20260821142000_guardian_portal.sql`
8. `supabase/migrations/20260821143000_automation_triggers.sql`
9. `supabase/migrations/20260821143500_production_gap_hardening.sql`
10. `supabase/migrations/20260821144000_branch_context.sql`

## Edge Functions

```text
invite-member
invite-guardian
dispatch-notification
process-notification-queue
edu-assistant
payment-gateway
```

## Environment variables / Supabase secrets

### Browser

Only the public Supabase URL and publishable key belong in browser configuration. Never expose the service-role key or payment/provider secrets in `config.js`.

### Vercel notification worker

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

Vercel Cron calls `/api/notification-worker` every minute. The worker invokes the protected `process-notification-queue` Edge Function with the service-role credential.

### invite-member / invite-guardian

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SITE_URL
```

### EduFlow AI

```text
SUPABASE_URL
SUPABASE_ANON_KEY
OPENAI_API_KEY
OPENAI_MODEL=gpt-5.6
```

`OPENAI_MODEL` is optional. The Edge Function defaults to `gpt-5.6` and returns the model used in its response.

### SMS / WhatsApp

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_SMS_FROM
TWILIO_WHATSAPP_FROM
```

Twilio credentials are read only by Edge Functions. Without them, notifications remain queued/skipped rather than being falsely marked as sent.

### bKash / Nagad

The application and `payment-gateway` Edge Function now provide a secure server-side integration boundary. Live checkout/verification still requires the merchant credentials and exact provider API contract for the center's account; those secrets must remain server-side.

## Branch context

The active branch is stored in `localStorage` as `eduflow.activeBranch`. `branch-context.js` applies the selected branch automatically to branch-scoped Supabase reads, updates, deletes, inserts and upserts, while database triggers default new records to the signed-in user's profile branch when one is configured.

Selecting **All branches** clears the branch filter.

## Attention Center

Attendance is calculated from real `attendance` records over the last 90 days. Students with no attendance history are shown separately and are not falsely treated as low-attendance.

## Documents

Document actions now produce type-specific output: report cards/marksheets use results, batch rosters use batch data, attendance reports use attendance records, fee statements use payment history, and salary statements use teacher compensation data.

## Guardian portal

Open `/guardian.html`. Guardians are invited internally and receive guardian-scoped read access through `guardian_accounts` and `student_guardians`.

## Demo mode

Open `/app.html?demo=true`. Demo mode uses in-memory Bangladesh sample data, never reads/writes production Postgres, disables mutations, and shows persistent Demo Mode state.

## Security model

- RLS is enabled on application and growth tables.
- Tenant isolation uses `private.user_org_id()`.
- Guardian access is read-only and scoped through guardian account links.
- Security-definer functions use explicit search paths.
- Service-role credentials and provider secrets exist only in server-side functions.
- Dynamic UI output is escaped.
- Branch context is enforced at both the browser query boundary and database insert default layer.

## Deployment

Vercel serves the frontend and cron worker. Supabase hosts Auth, Postgres and Edge Functions.
