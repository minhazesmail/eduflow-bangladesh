# EduFlow

Bangladesh-first coaching-center management SaaS built with vanilla HTML/CSS/JavaScript, Supabase Auth/Postgres, and Vercel.

## Core modules

- Dashboard
- Students
- Batches
- Attendance
- Fees & payments
- Exams & results
- Teachers
- Notices
- Settings
- Team management
- Authentication

## Roles

EduFlow supports four workspace roles:

- **Owner** — full access, including team management
- **Admin** — operational management access
- **Teacher** — student/batch read access, attendance read access, exams read access, result management
- **Staff** — student/batch/teacher/notice read access, attendance and payment management, result read access

Permissions are enforced in Supabase Row Level Security. The frontend also hides actions that the current role cannot use, but the database is the actual security boundary.

## Supabase security

The database uses organization-level tenant isolation through `private.user_org_id()` and role checks through `private.user_role()`.

New standalone signups create a new organization and owner profile automatically. Owner invitations are handled by the `invite-member` Supabase Edge Function, which creates an invitation record and sends an Auth invitation email. When the invited user accepts, the Auth trigger attaches the new profile to the inviting organization with the assigned role.

Do not expose a Supabase service-role key in the browser. The `invite-member` Edge Function is JWT-protected and performs the privileged Auth operation server-side.

## Files

- `index.html` — page shell and script loading
- `app.js` — application logic and UI
- `rbac.js` — frontend role guard
- `team.js` — owner-only team management UI
- `styles.css` — UI styling
- `migration.sql` — tenant isolation, onboarding, RBAC, invitation schema, and profile protection

## Deployment

The project is designed for Vercel. Configure the Supabase project and deploy the static files.
