# EduFlow backend rate limiting

EduFlow treats the browser as untrusted. Client-side throttling is not a security control and is no longer configured in `config.js`.

## Enforcement

Supabase Edge Functions use an atomic Postgres fixed-window limiter backed by `private.rate_limit_buckets` and `public.check_edge_rate_limit(...)`. The table is not exposed through the Data API. Only the `service_role` can execute the check function.

Each protected function applies both:

- an IP-based bucket, which limits an abusive network/client population;
- an authenticated-user bucket, which prevents one account from bypassing the IP limit by switching networks.

Responses that exceed either bucket return HTTP `429` plus `Retry-After` and `X-RateLimit-*` headers.

## Current limits

| Edge Function | IP / minute | User / minute |
|---|---:|---:|
| `invite-member` | 20 | 10 |
| `invite-guardian` | 30 | 15 |
| `payment-gateway` | 60 | 20 |
| `dispatch-notification` | 60 | 30 |

The internal `process-notification-queue` endpoint remains protected by the service-role bearer token rather than public user traffic.

## Authentication endpoints

Supabase Auth already provides its own IP-based rate limiting for signup, recovery, OTP and other Auth endpoints. Keep the project Auth rate limits enabled; the Edge Function limiter is for EduFlow's application/business APIs. citeturn821436search6

## Adding a new protected function

Import:

```ts
import { enforceRateLimit } from '../_shared/rate-limit.ts';
```

Create a service-role client and enforce a scope after authenticating the user:

```ts
const blocked = await enforceRateLimit(req, admin, user.id, {
  scope: 'my-function',
  ipLimit: 30,
  userLimit: 15,
  windowSeconds: 60,
});
if (blocked) return blocked;
```

Do not put secrets or the service-role key in the browser. Supabase recommends server-side Edge Functions for custom API security and documents the same private-schema pattern for rate-limit state. citeturn821436search8turn821436search1
