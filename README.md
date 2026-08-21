# EduFlow Bangladesh

Bangladesh-first SaaS for coaching-center management. The production app uses Vanilla HTML/CSS/JS, Supabase Auth/Postgres, Supabase Edge Functions, and Vercel.

## Runtime architecture

```text
index.html → landing site
app.html
  ├─ config.js
  ├─ Supabase JS client
  ├─ dev-access.js
  ├─ branch-context.js
  ├─ runtime-stability.js
  ├─ mock-data.js
  ├─ mock-data-normalize.js
  ├─ demo-mode.js
  ├─ core-runtime.js        ← one shared Supabase client
  ├─ auth-recovery.js
  ├─ app-core.js             ← primary application runtime
  ├─ operations-ui-v2.js
  ├─ growth-features.js
  ├─ production-gaps-fix.js
  └─ runtime-feature-fixes.js

guardian.html → independent guardian portal client
```

There is one active dashboard runtime and one shared Supabase client per page. Compatibility/AI-removal shims are no longer part of the dashboard boot chain.

## Product features

Guardian portal, automated notifications, admissions CRM, multi-branch context, Attention Center, routine/conflict detection, expenses/profit, operational documents, notification history, and payment integration boundaries.

EduFlow does not include an AI assistant or OpenAI integration.

## Database migrations

The canonical migration source is `supabase/migrations/`. Do not use a root `migration.sql` snapshot or the old root `migrations/` directory.

Run the migrations in repository order, including:

1. `0001_base_schema.sql`
2. `0002_stabilization.sql`
3. `0003_functionality_hardening.sql`
4. `0004_onboarding_trigger.sql`
5. `0005_monthly_fee_ledger.sql`
6. `20260821141000_growth_features.sql`
7. `20260821142000_guardian_portal.sql`
8. `20260821143000_automation_triggers.sql`
9. `20260821143500_production_gap_hardening.sql`
10. `20260821144000_branch_context.sql`
11. `20260821145000_attention_metrics_rpc.sql`
12. `20260821150000_remove_ai.sql`
13. `20260821160000_branch_rls_hardening.sql`

## Edge Functions

```text
invite-member
invite-guardian
dispatch-notification
process-notification-queue
payment-gateway
```

## Environment variables / Supabase secrets

### Browser

Only the public Supabase URL and publishable key belong in browser configuration. Never expose the service-role key or payment/provider secrets in `config.js`.

### invite-member / invite-guardian

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SITE_URL
```

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

The application and `payment-gateway` Edge Function provide a secure server-side integration boundary. Live checkout/verification still requires the merchant credentials and exact provider API contract for the center's account; those secrets must remain server-side.

## Branch context

The active branch is stored in `localStorage` as `eduflow.activeBranch`. `branch-context.js` applies the selected branch to branch-scoped Supabase reads/writes, and Postgres RLS now enforces branch visibility for teacher/staff while owners/admins can oversee the full organization.

Selecting **All branches** clears the branch filter.

## Attention Center

Attendance is calculated from real `attendance` records through `get_attention_metrics()` over the last 90 days. Students with no attendance history are shown separately and are not falsely treated as low-attendance. There is only one active Attention Center implementation.

## Documents

Document actions produce type-specific output: report cards/marksheets use results, batch rosters use batch data, attendance reports use attendance records, fee statements use payment history, and salary statements use teacher compensation data.

## Guardian portal

Open `/guardian.html`. Guardians are invited internally and receive guardian-scoped read access through `guardian_accounts` and `student_guardians`.

## Demo mode

Open `/app.html?demo=true`. Demo mode uses in-memory Bangladesh sample data, never reads/writes production Postgres, disables mutations, and shows persistent Demo Mode state.

## Development access

Open `/app.html?dev=true` for an explicit read-only sample workspace during development. It sets Demo Mode and never creates a real authenticated session. Do not use this mode for customer accounts.

## Security model

- RLS is enabled on application and growth tables.
- Tenant isolation uses `private.user_org_id()`.
- Branch isolation is enforced in Postgres for scoped resources.
- Guardian access is scoped through guardian account links.
- Security-definer functions use explicit search paths.
- Service-role credentials and provider secrets exist only in server-side functions.
- Dynamic UI output is escaped.
- The browser is not a notification queue worker; queued notifications require server-side scheduling/dispatch.

## Deployment

Vercel serves the frontend and serverless notification-worker endpoint. The project does not use a sub-daily Vercel Cron schedule because the current Hobby plan rejects that pattern. Use Supabase-native scheduling or an external scheduler to invoke the notification queue worker.
