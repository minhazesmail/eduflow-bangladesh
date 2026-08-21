# EduFlow Bangladesh

Bangladesh-first SaaS for coaching-center management using Vanilla HTML/CSS/JS, Supabase Auth/Postgres, Supabase Edge Functions, and Vercel.

## Runtime architecture

```text
index.html → landing site
app.html
  ├─ config.js
  ├─ Supabase JS client
  ├─ dev-access.js
  ├─ branch-context.js
  ├─ runtime-stability.js
  ├─ mock-data.js + mock-data-normalize.js
  ├─ demo-mode.js
  ├─ core-runtime.js        ← shared Supabase client + route cancellation
  ├─ route-controller.js    ← aborts superseded route requests
  ├─ pagination-controller.js ← server-side range pagination for core lists
  ├─ offline-attendance.js  ← IndexedDB attendance queue + sync
  ├─ auth-recovery.js       ← single password recovery implementation
  ├─ app-core.js             ← primary application runtime
  ├─ operations-ui.js        ← canonical operations runtime
  ├─ payment-checkout.js     ← online payment action
  ├─ growth-features.js
  ├─ production-gaps-fix.js
  └─ runtime-feature-fixes.js

guardian.html → guardian-scoped portal
```

There is one active operations implementation and one active password-recovery implementation. Legacy `operations-ui-v2.js` and `password-recovery.js` are retired.

## Key reliability features

- One shared Supabase client per page.
- Route changes cancel superseded Supabase requests through `AbortController`.
- Core list pages use server-side `range()` pagination; payments/results/notices/team use feature-specific pagination.
- Attendance supports IndexedDB offline writes and automatic retry/sync when connectivity returns.
- Demo/dev modes remain read-only and never write real customer data.
- AI/OpenAI has been removed from the application.

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

Only the public Supabase URL and publishable key belong in browser configuration.

### Team / guardian invitations

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SITE_URL
```

### Notifications

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_SMS_FROM
TWILIO_WHATSAPP_FROM
```

### bKash

```text
BKASH_BASE_URL
BKASH_USERNAME
BKASH_PASSWORD
BKASH_APP_KEY
BKASH_APP_SECRET
```

Use the correct merchant/sandbox base URL for the account. Secrets stay in Supabase Edge Functions.

### Nagad

The adapter is contract-driven because merchant onboarding determines the exact endpoint/authentication/signing contract. Configure the exact endpoints and credentials supplied by the merchant account:

```text
NAGAD_CREATE_URL
NAGAD_VERIFY_URL
NAGAD_API_VERSION
NAGAD_CLIENT_TYPE
NAGAD_API_KEY                 # if your contract uses bearer/API-key auth
NAGAD_MERCHANT_ID
NAGAD_MERCHANT_NUMBER
```

Do not place these values in browser `config.js`.

## Guardian security

Guardian access is restricted by `guardian_accounts` + `student_guardians` links. RLS prevents a guardian from reading unrelated students, attendance, payments, results, batches, exams, or organization notices outside their linked organization. A repeatable penetration harness is in `supabase/tests/guardian_rls_penetration.sql`; run it in a disposable Supabase branch with two guardian fixtures.

## Online payments

The Fees & Payments page exposes **Create online payment**. The browser calls the JWT-protected `payment-gateway` Edge Function, which talks to the provider server-side and never exposes merchant secrets.

The bKash adapter supports Tokenized Checkout create/execute/status. Nagad support uses configurable merchant-contract endpoints; live activation still requires the exact merchant API contract and credentials.

## E2E tests

Playwright smoke tests live in `tests/e2e/site.spec.js` and run through `.github/workflows/e2e.yml`.

```bash
npm install
npx playwright install --with-deps chromium
npm run test:e2e
```

Set `BASE_URL` to run against another deployment.

## Demo and development

```text
/app.html?demo=true
/app.html?dev=true
```

Both modes use sample/read-only data and never create a real authenticated session.

## Deployment

Vercel serves the frontend and serverless API routes. The project does not use a sub-daily Vercel Cron schedule because the current Hobby plan rejects that pattern. Use Supabase-native scheduling or an external scheduler for notification queue processing.
