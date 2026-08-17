# EduFlow — Bangladesh Coaching Center SaaS

EduFlow is a beginner-friendly MVP for managing Bangladeshi coaching centers.

## Included

- Dashboard
- Students
- Batches
- Attendance
- Fees & payments
- Exams & results
- Teachers
- Notices
- Responsive mobile layout
- Bangladeshi Taka formatting
- Demo data
- Browser persistence with localStorage

## Important

This first release is a **front-end MVP**. Data is stored in the browser, so it is useful for demos and validation but is **not yet a production multi-user SaaS**.

The production upgrade should add:

1. Supabase Auth
2. PostgreSQL database
3. Row Level Security / multi-tenancy
4. SMS provider
5. WhatsApp Business
6. bKash/Nagad merchant/payment gateway
7. Real guardian/student portals
8. Automated backups
9. Audit logs

## Deploy on Vercel

This is a static app, so it can be deployed directly to Vercel.

1. Create a GitHub repository named `eduflow-bangladesh`.
2. Upload these files.
3. In Vercel, choose **Add New Project**.
4. Import the GitHub repository.
5. Leave the framework/build settings empty/default for a static site.
6. Deploy.

## Local test

Open `index.html` directly in a browser, or run a simple static server:

```bash
python -m http.server 3000
```

Then open `http://localhost:3000`.

## Product direction

The intended positioning is:

> The easiest operating system for coaching centers in Bangladesh.

Start with coaching centers before expanding to private schools and training institutes.
