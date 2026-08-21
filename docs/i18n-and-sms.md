# Bangla Localization (i18n) & Local SMS

## i18n

**Single module:** `src/i18n.js` → `window.EduFlowI18n`

- Languages: `bn` (default) and `en`
- Persist: `localStorage.eduflow_lang`
- API:
  - `t(key)`, `setLang('bn'|'en')`, `toggleLang()`
  - `applyStatic()` — `[data-i18n]` nodes
  - `applyLanding()` / `applyAuth()` — marketing site + auth form
  - `applyAll()` — static + landing + auth
  - `smsBody(template, params)` — Bangla SMS templates
- Entry points import **only** `./i18n.js` (no `site-language*` modules)
- Toggle: `#lang-toggle`, `#lang-toggle-top` (app); landing header button injected by `applyLanding`
- Static strings: `data-i18n` in `app.html`; dynamic lists use `t()` / bridges

`src/i18n-app-bridge.js` only patches app navigation titles and SMS button handlers — it does not own a second dictionary.

Guardian portal uses the same `EduFlowI18n` keys (`guardian.*`) and `preferred_language` on guardian records.

### Adding a string

1. Add key to both `dict.en` and `dict.bn` in `src/i18n.js`
2. Use `data-i18n="key"` in HTML or `t('key')` in JS

## Local SMS (Bangla)

Edge Function: `supabase/functions/send-local-sms`

### Provider selection

```text
SMS_PROVIDER=sslwireless   # default | mimsms | twilio
```

### SSL Wireless secrets

```text
SSL_SMS_API_URL          # optional; defaults to legacy pushapi
SSL_SMS_API_TOKEN        # modern ismsplus token (preferred)
SSL_SMS_USER             # legacy username
SSL_SMS_PASS             # legacy password
SSL_SMS_SID              # sender / SID
SSL_SMS_CSMS_PREFIX      # optional, default EF
```

### MIM SMS secrets

```text
MIM_SMS_API_URL          # default https://api.mimsms.com
MIM_SMS_USER             # panel login email
MIM_SMS_API_KEY
MIM_SMS_SENDER           # registered Sender ID
```

### Twilio fallback

If `SMS_PROVIDER=sslwireless` fails and Twilio env is present, the function soft-falls back to Twilio.

```text
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_SMS_FROM
```

### Message templates (always Bangla)

**Fee reminder**

```text
প্রিয় অভিভাবক, {studentName} এর {month} ফি ৳{amount} বাকি আছে। অনুগ্রহ করে দ্রুত পরিশোধ করুন। — {orgName}
```

**Exam result**

```text
প্রিয় অভিভাবক, {studentName} এর {examName} পরীক্ষায় নম্বর: {marks}/{totalMarks} ({percent}%)। — {orgName}
```

### UI

- Students table: **Send fee SMS** button when guardian/student phone exists
- Results table: **Send result SMS** button with marks

Calls JWT-protected `send-local-sms` with rate limiting (`_shared/rate-limit.ts`).

### Deploy

```bash
supabase functions deploy send-local-sms
# set secrets in Supabase dashboard or CLI
```

Also keep existing `dispatch-notification` / `process-notification-queue` for queued Twilio/WhatsApp flows; new interactive SMS uses the local-first function.
