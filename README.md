# EduFlow Bangladesh

Bangladesh-first SaaS for coaching center management. Built with vanilla HTML/CSS/JS, Supabase Auth/Postgres, and Vercel.

## What's Fixed

| Issue | Fix |
|-------|-----|
| Hardcoded Supabase credentials | Moved to `config.js` + environment variables |
| No favicon / tab thumbnail | Added SVG favicon, PWA manifest, Apple touch icon |
| No billing layer | Added `organization_usage` table + Billing page with plan tiers |
| No rate limiting | Client-side rate limiter + configurable via env vars |
| No audit logging | Added `audit_logs` table + auto-logging on data changes |
| No offline support | Offline banner + action queue with sync on reconnect |
| Missing RLS policies | Added organizations RLS, invitation insert policy |
| No usage quotas | Database trigger enforces student limits per plan |
| Missing Edge Function | Complete `invite-member` Edge Function with JWT validation |
| No loading states | Loading screen, button disabled states, skeletons |
| XSS vulnerability | All dynamic content uses `escapeHtml()` |
| No SEO/meta tags | Full Open Graph, Twitter Cards, description, theme-color |
| No PWA support | `manifest.json`, service-worker ready structure |
| Monolithic app.js | Modularized: `config.js`, `rbac.js`, `team.js`, `app.js` |
| No session refresh | `onAuthStateChange` handles token refresh & sign-out |

## File Structure

```
├── index.html              # Page shell with favicon, meta tags, PWA links
├── config.js               # Environment config loader (NO hardcoded secrets)
├── app.js                  # Main app: routing, pages, modals, toast, offline
├── rbac.js                 # Role-based access control module
├── team.js                 # Owner-only team management
├── styles.css              # UI styling + loading screen + offline banner
├── manifest.json           # PWA manifest
├── migration.sql           # Complete database hardening migration
└── supabase/
    └── functions/
        └── invite-member/
            └── index.ts    # JWT-protected Edge Function
```

## Deployment

### 1. Supabase Setup

1. Create a new Supabase project
2. Run `migration.sql` in the SQL Editor
3. Set up the Edge Function:
   ```bash
   supabase functions deploy invite-member
   ```
4. Configure Edge Function secrets:
   ```bash
   supabase secrets set SUPABASE_URL=your-url
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

### 2. Vercel Setup

1. Connect your GitHub repo to Vercel
2. Set environment variables in Vercel Project Settings:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
3. Deploy

### 3. Local Development

```bash
# Serve static files
npx serve . --listen 3000

# Or use Vercel CLI
vercel dev
```

For local dev, set credentials via browser console:
```js
localStorage.setItem('ef_supabase_url', 'your-url');
localStorage.setItem('ef_supabase_key', 'your-anon-key');
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Your Supabase anon/public key |
| `APP_ENV` | No | `development` / `staging` / `production` |
| `RATE_LIMIT_MAX` | No | Max requests per window (default: 100) |
| `RATE_LIMIT_WINDOW_MS` | No | Rate limit window in ms (default: 60000) |
| `MAX_STUDENTS_FREE` | No | Free plan student limit (default: 50) |
| `MAX_STUDENTS_PRO` | No | Pro plan student limit (default: 500) |
| `MAX_STUDENTS_ENTERPRISE` | No | Enterprise plan limit (default: 5000) |

## Security Checklist

- [x] No service-role key in browser
- [x] RLS policies on all tables
- [x] Tenant isolation via `private.user_org_id()`
- [x] Role checks in database policies
- [x] Frontend guards + backend enforcement
- [x] Self-role/self-org change prevention
- [x] Audit logging for all sensitive actions
- [x] Input sanitization (XSS prevention)
- [x] Rate limiting
- [x] Quota enforcement at database level

## License

MIT
