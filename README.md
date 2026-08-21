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
  ├─ growth-features.js
  └─ auth-recovery.js

guardian.html → mobile-first guardian portal
```

`app-core.js` is the primary runtime. `growth-features.js` adds the product-growth layer without introducing a framework.

## Growth features

The current product layer includes:

- **Guardian Portal:** linked students, attendance, payments, results, notices and mobile-first guardian access.
- **Guardian notifications:** automatic notification jobs for absences and payments plus queued fee reminders; SMS/WhatsApp dispatch through an Edge Function when Twilio is configured.
- **Admissions CRM:** enquiry source, interested course, counselling stage and follow-up tracking.
- **Multi-branch:** branch records and branch-aware fields across students, batches, teachers, payments, exams and notices.
- **Smart Attention Center:** low-attendance and outstanding-fee signals with direct follow-up actions.
- **Routine Builder:** weekly schedule with teacher/room/batch overlap detection.
- **Expenses & Profit:** expense tracking plus revenue, expense and estimated-net views.
- **Operational documents:** printable report cards, marksheets, receipts, ID cards, fee statements and other center documents.
- **Notification center:** queued/sent/failed communication history.
- **EduFlow AI:** owner/admin operational assistant backed by the OpenAI Responses API and tenant-scoped Supabase data.
- **Payment integration layer:** bKash/Nagad configuration surface and server-side integration boundary without exposing merchant secrets to the browser.

## Database migrations

For new environments, run the canonical base/security migrations and then the growth migrations:

1. `supabase/migrations/0001_base_schema.sql`
2. `migration.sql`
3. `supabase/migrations/0002_stabilization.sql`
4. `supabase/migrations/0003_functionality_hardening.sql`
5. `supabase/migrations/0004_onboarding_trigger.sql`
6. `supabase/migrations/20260821141000_growth_features.sql`
7. `supabase/migrations/20260821142000_guardian_portal.sql`
8. `supabase/migrations/20260821143000_automation_triggers.sql`

Existing installations should apply the same growth migrations after the current security/functionality migrations.

## Edge Functions

Current feature functions:

```text
invite-member
invite-guardian
auto notification dispatcher: dispatch-notification
AI assistant: edu-assistant
```

All feature functions require JWT verification.

## Environment variables / Supabase secrets

### Browser / Vercel

Only the public Supabase URL and publishable key belong in browser configuration. Do not place service-role or provider secrets in `config.js`.

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
OPENAI_MODEL=gpt-5.6-luna
```

The OpenAI API key is only read by the Edge Function. The Responses API is used for the assistant. citeturn518664search2

### SMS / WhatsApp notification dispatcher

```text
SUPABASE_URL
SUPABASE_ANON_KEY
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_SMS_FROM
TWILIO_WHATSAPP_FROM
```

`TWILIO_SMS_FROM` is the sender number for SMS. `TWILIO_WHATSAPP_FROM` should be the approved WhatsApp sender when WhatsApp delivery is enabled.

### bKash / Nagad

The application now contains the payment-integration data model and UI boundary, but merchant credentials and provider-specific API contracts must be supplied before real checkout/verification can be enabled. Provider secrets should remain in Supabase Edge Function secrets, never in browser JavaScript. Nagad provides merchant-payment services through its official merchant offering. citeturn518664search0

## Guardian portal

Open:

```text
/guardian.html
```

Guardians are invited from the internal Guardian page. The invitation flow uses Supabase Auth and the `guardian_invitation_id` metadata path. The onboarding trigger creates the `guardian_accounts` mapping and enforces guardian-scoped RLS for students, attendance, payments, results, notices and routines.

## Demo mode

Open `/app.html?demo=true`.

Demo mode uses in-memory sample Bangladesh data, never reads or writes production Postgres, disables mutations, and shows a persistent Demo Mode state.

## Security model

- RLS is enabled on application and growth tables.
- Tenant isolation uses `private.user_org_id()`.
- Guardian access is based on `guardian_accounts` + `student_guardians` and is read-only.
- Database write policies match the application role matrix.
- Security-definer functions use explicit search paths.
- Provider/API secrets exist only in Edge Functions.
- Demo data never writes to Supabase.
- Dynamic UI output is escaped before rendering.

## Deployment

Vercel serves the static frontend. Supabase hosts Auth, Postgres and Edge Functions.

For local static development:

```bash
npx serve . --listen 3000
```

## Production verification checklist

Before launch, verify:

- all database migrations succeed in order
- owner/admin/teacher/staff RLS matrix is tested
- guardian invitation reaches `guardian.html`
- Twilio secrets are configured before enabling SMS/WhatsApp dispatch
- `OPENAI_API_KEY` is configured before enabling EduFlow AI
- real bKash/Nagad merchant credentials and provider contracts are configured before enabling online checkout
- Demo Mode does not call production Postgres
- Vercel production deployment is READY
