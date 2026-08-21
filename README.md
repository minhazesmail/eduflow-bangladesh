# EduFlow Bangladesh

Bangladesh-first SaaS for coaching-center management using Vanilla HTML/CSS/JS, Supabase Auth/Postgres, Supabase Edge Functions, and Vercel.

## Runtime architecture

```text
index.html → landing site
app.html
  ├─ config.js
  ├─ src/supabase-global.js
  ├─ src/security-sanitize.js
  ├─ src/i18n.js
  ├─ core-runtime.js       ← shared client + route cancellation + safe toast
  ├─ route-controller.js
  ├─ pagination-controller.js
  ├─ offline-attendance.js
  ├─ auth-recovery.js
  ├─ app-core.js            ← primary application runtime
  ├─ operations-ui.js       ← canonical operations runtime
  ├─ payment-checkout.js
  ├─ growth-features.js
  ├─ runtime-feature-fixes.js
  ├─ production-gaps-fix.js
  └─ feature-specific UI modules

guardian.html → guardian-scoped portal
```

The runtime is intentionally consolidating toward one owning module per concern. Removed compatibility/monkey-patch layers are not reintroduced as new `*-fix.js`, `*-bridge.js`, or global runtime shims unless they represent a genuinely separate service.

## Key reliability features

- One shared Supabase client per page.
- Route changes cancel superseded Supabase requests through `AbortController`.
- Core list pages use server-side `range()` pagination; payments/results/notices/team use feature-specific pagination.
- Attendance supports IndexedDB offline writes and automatic retry/sync when connectivity returns.
- Demo/dev modes remain read-only and never write real customer data.
- AI/OpenAI has been removed from the application.
- Sensitive Edge Functions enforce backend rate limits; browser-side throttling is not a security control.
- The Vercel notification worker requires `Authorization: Bearer $CRON_SECRET` before it can forward to the notification queue processor.

## Database migrations

The canonical migration source is `supabase/migrations/`. Do not recreate the old root SQL snapshot.

Important migrations include:

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
14. `20260821161000_guardian_rls_penetration_hardening.sql`
15. `20260821161100_notice_status_compat.sql`
16. `20260821170000_backend_rate_limiting.sql`
17. `20260821180000_payment_reconciliation.sql`
18. `20260822033000_owner_role_management_rpc.sql`
19. `20260822033100_lock_down_owner_role_rpc_execute.sql`

## Edge Functions

```text
invite-member
invite-guardian
dispatch-notification
process-notification-queue
payment-gateway
payment-ipn
```

`payment-gateway` is JWT-protected and creates server-owned payment intents. `payment-ipn` is the provider callback endpoint; it is intentionally public at the Edge Function gateway but immediately rate-limited and never trusts client-reported payment success.

## Vercel notification worker

`/api/notification-worker.js` is a Vercel serverless endpoint that forwards to `process-notification-queue` using the Supabase service-role key. The worker itself is protected by a separate `CRON_SECRET` and requires:

```http
Authorization: Bearer <CRON_SECRET>
```

Required Vercel server-side environment variables:

```text
CRON_SECRET
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

Set `CRON_SECRET` as a long, random value in the Vercel project for the environments that can invoke the worker. Never put it in frontend code, Git, or `VITE_*` variables. After changing an environment variable, redeploy so the function receives the new value. Vercel's current cron guidance uses the `Authorization: Bearer <CRON_SECRET>` pattern. https://vercel.com/docs/cron-jobs
