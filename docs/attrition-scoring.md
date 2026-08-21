# At-Risk / Attrition Scoring

## Model (transparent weights)

| Component | Weight | Signal |
|-----------|--------|--------|
| Missed attendance | 40 | Absence rate over last 14–180 days (default 60) |
| Unpaid fees | 35 | Open/partial `fee_invoices` balance; falls back to missing current-month `payments` |
| Academic drop | 25 | Drop in **cohort percentile** (recent exam vs average of prior 2–4) |

**Attrition score** = sum, clamped to 0–100.

| Score | Level |
|-------|--------|
| ≥ 80 | critical |
| ≥ 55 | high |
| < 55 | watch |

**High-value student**: `monthly_fee` ≥ org median of active students.

## Database

Migration: `supabase/migrations/20260821190000_attrition_score.sql`

- `get_attrition_scores(org_id, branch_id?, days?, min_score?)`
- `evaluate_attrition_alerts(org_id, threshold default 55, high_value_only default true)` — inserts into `attrition_alerts` with 7-day open-alert dedupe
- Table `attrition_alerts` + RLS

Apply with your usual Supabase migration flow.

## UI

- Sidebar **At-Risk** → `#at-risk`
- Attention Center → **At-Risk scores** button
- **Run owner alerts** creates alerts for high-value high-risk students

## Suggested ops cadence

Owners: open At-Risk weekly and click **Run owner alerts**, or call `evaluate_attrition_alerts` from a scheduled job / Edge Function later.
