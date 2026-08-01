# Vantage — Enterprise ITSM Console (prototype)

Incident management, change management with an approval workflow, an
asset/CMDB register, and Teams + email notifications. Runs on Neon
(Postgres) + Vercel — both free, no credit card required, and this whole
setup can be done **entirely from a browser, no local installs**.

## Stack

- **Next.js 16 (App Router)** + TypeScript
- **Neon** — serverless Postgres, free tier, no card required
- **Drizzle ORM** (`@neondatabase/serverless` driver)
- **jose** for session JWTs (Edge-runtime compatible)
- **bcryptjs** for password hashing
- **nodemailer** for email, native `fetch` to an MS Teams Incoming Webhook

## Deploy — no local installation needed

### 1. Create the database (Neon, ~2 minutes)
1. Go to **neon.tech** → sign up (free, no card) → create a project.
2. Open the **SQL Editor** in the Neon dashboard.
3. Paste the entire contents of `lib/db/seed.sql` from this project and click
   **Run**. This creates every table and adds four demo users (one per role)
   plus a few sample assets — all done in the browser.
4. Go to **Connection Details** in Neon and copy the connection string
   (starts with `postgresql://...`). You'll need it in step 3.

### 2. Push the code to GitHub (no git installed needed)
1. Unzip this project locally (just unzipping, no build tools needed).
2. Create a new repository at **github.com/new**.
3. On the new repo's page, use **"uploading an existing file"** and drag the
   project folder's contents in (skip `node_modules` and `.next` — they
   aren't included in this zip anyway). Commit.

   *(If you're comfortable with git, `git init && git add . && git commit -m init && git push` works too — but it's optional.)*

### 3. Deploy on Vercel (~2 minutes)
1. Go to **vercel.com** → sign up free (no card) → **Add New Project**.
2. Import the GitHub repo you just created. Vercel auto-detects Next.js —
   no configuration needed.
3. Before deploying, expand **Environment Variables** and add:
   - `DATABASE_URL` — the Neon connection string from step 1
   - `SESSION_SECRET` — any long random string (e.g. generate one at
     `https://generate-secret.vercel.app/32`)
   - `TEAMS_WEBHOOK_URL` — optional, add now or later (see below)
   - `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` — optional, add now or later
4. Click **Deploy**. You'll get a live `https://your-app.vercel.app` URL.

That's it — no Node.js, no npm, no local database, nothing installed on
your machine.

## Demo accounts

All four use password `Passw0rd!123` (seeded via `lib/db/seed.sql`):

| Role      | Email               | Can do |
|-----------|----------------------|--------|
| admin     | admin@demo.itsm      | everything, incl. audit log |
| agent     | agent@demo.itsm      | work incidents, manage assets, schedule/implement changes |
| approver  | approver@demo.itsm   | approve/reject changes assigned to them |
| requester | requester@demo.itsm  | report incidents, submit change requests |

**Change this password (and rotate `SESSION_SECRET`) before any real use** —
run an `UPDATE users SET password_hash = crypt('newpassword', gen_salt('bf', 12))...`
in Neon's SQL Editor, same browser-only workflow.

## What's implemented

- **Incidents**: new → acknowledged → in progress → resolved → closed, with
  a role-gated state machine (`lib/workflow.ts`).
- **Changes**: every request goes to `pending_approval` — nothing reaches
  `scheduled` without a recorded decision from the assigned approver
  (`change_approvals` table). Admins can break-glass override.
- **Assets / CMDB**: register with a lifecycle status agents/admins can update.
- **Notifications**: one choke point, `notifyUser()` in `lib/notifications.ts`,
  fans out to Teams (Incoming Webhook) and email (SMTP), logs every
  send/fail/skip — visible at **Settings → Notifications** in the app.
- **Security**: bcrypt password hashing, httpOnly + `SameSite=strict` +
  `secure` session cookies, per-IP+email login rate limiting,
  user-enumeration-safe login errors, RBAC on every API route, a full audit
  log (admin-only) of every mutation and login attempt.

## Wiring up real notifications

- **Teams**: in a channel, add an **Incoming Webhook** connector → copy the
  URL into `TEAMS_WEBHOOK_URL` in Vercel's project settings → redeploy.
- **Email**: point `SMTP_HOST`/`SMTP_USER`/`SMTP_PASS` at any SMTP relay
  (Microsoft 365, SendGrid, Amazon SES, etc.) in Vercel's project settings.

Until those are set, notifications log as `skipped` (not silently dropped),
visible in the Notifications settings page.

## Local development (optional)

If you do want to run it locally later:
```bash
npm install
cp .env.example .env.local   # paste your Neon DATABASE_URL and SESSION_SECRET
npm run dev
```

## Project structure

```
app/                 — pages (App Router) + API routes under app/api/
lib/
  db/schema.ts        — Drizzle schema (Postgres)
  db/seed.sql          — full schema + demo data, paste into Neon's SQL Editor
  db/index.ts          — Neon serverless DB client
  auth.ts               — sessions (jose), password hashing, RBAC helpers
  workflow.ts            — incident & change state machines
  notifications.ts        — Teams + email fan-out, with delivery logging
  audit.ts                 — audit log writer
  rateLimit.ts               — login rate limiting
components/           — shared UI (AppShell, Badge, form primitives)
middleware.ts           — route auth guard (Edge-compatible via jose)
```
