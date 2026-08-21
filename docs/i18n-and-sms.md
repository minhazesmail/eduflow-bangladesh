# Bangla Localization (i18n) & Local SMS

## i18n

Lightweight zero-dependency module: `src/i18n.js`.

- Languages: `bn` (default) and `en`
- Persist: `localStorage.eduflow_lang`
- API: `window.EduFlowI18n.t(key)`, `.setLang('bn'|'en')`, `.toggleLang()`, `.applyStatic()`
- Toggle buttons: sidebar + topbar (`#lang-toggle`, `#lang-toggle-top`)
- Static strings: `data-i18n` attributes in `app.html`
- Dynamic lists: `t()` inside `app-core.js` for Students / Results and shared labels

Guardian portal already stores `preferred_language` on guardians; UI chrome uses the same dictionary when wired.

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
