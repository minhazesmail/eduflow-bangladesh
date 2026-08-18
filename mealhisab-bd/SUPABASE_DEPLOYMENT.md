# MealHisab BD — Supabase Deployment

Dedicated Supabase project is provisioned for MealHisab BD.

- Project: `mealhisab-bd`
- Project ref: `uabfyijqhroonlhyercn`
- Region: `ap-south-1`
- URL: `https://uabfyijqhroonlhyercn.supabase.co`

## Environment

Set these locally and in Vercel:

```env
NEXT_PUBLIC_SUPABASE_URL=https://uabfyijqhroonlhyercn.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<project-publishable-key>
NEXT_PUBLIC_APP_URL=<deployment-url>
```

Never commit a service-role or secret Supabase key.

## Auth

Enable Phone Auth in Supabase and configure the SMS provider/rate limits/CAPTCHA for production before accepting real users.

## Database

The production schema, RLS policies, private storage buckets, profile trigger, effective-meal calculation, and transactional `close_cycle()` function are already provisioned in the dedicated project.

For reproducible fresh environments, keep the repository's Supabase migrations synchronized with the live project before using `supabase db push` against a new database.

## Vercel

Create a separate Vercel project for MealHisab BD connected to the same GitHub repository and set the project root to `mealhisab-bd/`. Do not reuse the existing `eduflow-bangladesh` Vercel project.
