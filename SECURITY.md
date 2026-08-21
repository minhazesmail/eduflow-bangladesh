# EduFlow Security Configuration

## Browser-visible Supabase configuration

EduFlow uses the Supabase project URL and publishable/anon key in the browser. These are not service credentials. They must be protected by strict Postgres RLS and database-level authorization.

Never expose the Supabase service-role key, database password, or other administrative secrets in client-side files.

## Required server secrets

The `invite-member` Supabase Edge Function requires:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SITE_URL
```

`SUPABASE_SERVICE_ROLE_KEY` must exist only in Supabase Edge Function secrets.

## Authorization boundaries

The primary security boundary is Postgres RLS, not client-side JavaScript checks.

Every multi-tenant table must constrain access through the authenticated user's organization. Role checks are also enforced in database policies.

The browser additionally uses role guards to hide pages/actions, but those guards are only UX controls.

## Authentication

- Supabase Auth manages sessions and refresh tokens.
- New owners are provisioned by the auth-user trigger.
- Invited members are provisioned from `organization_invitations` metadata.
- Invitation creation is restricted to owners through a JWT-protected Edge Function.

## Demo mode

`?demo=true` activates a browser-only in-memory data adapter. Demo mode does not query production application tables and all mutation operations are blocked.

## XSS

Dynamic values rendered into HTML must pass through the runtime escaping helper before interpolation. Prefer `textContent` for user-controlled text whenever possible.

## Audit logging

The application records sensitive actions to `audit_logs`. Client-side audit calls are useful for product history, but database/server-side logging should remain the authoritative security trail for future high-risk operations.

## Rate limiting

Client-side rate limiting protects against accidental repeated requests. It is not a security boundary. High-risk endpoints such as invitations, bulk imports, messaging, exports, and future public APIs must also enforce server-side limits.

## Database hardening checklist

- [x] RLS enabled on tenant tables
- [x] Tenant isolation helper
- [x] Role-based policies
- [x] Self-profile read policy
- [x] Self-role/self-organization protection
- [x] Invitation table policies
- [x] Quota enforcement
- [x] Audit log storage
- [x] No service-role key in browser

Before production launch, run explicit positive/negative RLS tests for owner, admin, teacher, staff, and unauthenticated users across every table.
