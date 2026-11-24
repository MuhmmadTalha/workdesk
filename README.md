# Workdesk

Next.js 15 + Supabase app with admin and employee dashboards: employees, tasks, attendance (check-in/out), performance ratings and private notes.

## Features

- Role-based workspaces for admins and employees.
- Employee directory with account creation, profile edits, password resets, activation/deactivation and deletion.
- Multi-assignee task management with per-assignee progress, priorities, deadlines and cancellation.
- Attendance records with employee check-in/out and admin-managed statuses.
- Performance ratings and feedback, including an employee-facing rating history.
- Private personal notes, dark mode, responsive sidebar navigation and clear loading, empty and error states.
- Live data refresh and in-app notifications for assignments, task changes, completion, ratings and attendance updates.

## Tech stack

- Next.js 15, React 19 and TypeScript
- Supabase Auth, Postgres, Row Level Security and Realtime
- Tailwind CSS, Radix UI and Lucide icons

## How security works

- **Login** uses Supabase Auth (email + password). Sessions live in cookies, and `middleware.ts` keeps signed-out visitors away from `/dashboard`.
- **Row Level Security** is on for every table (`supabase/schema.sql`). The public anon key can't read anything by itself. Employees only see their own tasks, attendance, ratings and notes. Admins see everything.
- **Account management** (create, reset password, deactivate, delete) runs in `app/api/admin/employees/route.ts` on the server. It uses the service role key, but only after checking that the caller is an admin.
- **Check-in/out** goes through the `check_in()` / `check_out()` database functions. They use the server clock and calculate `hours_worked`.

## Prerequisites

- Node.js 20 or newer
- pnpm
- A Supabase project

## Setup (new Supabase project)

1. **Create a project** at <https://supabase.com/dashboard>.
2. **Run the schema.** Open SQL Editor → New query, paste all of `supabase/schema.sql`, and click Run.
   Then run `supabase/002-notifications-realtime.sql` and `supabase/003-task-updated-notifications.sql` the same way, in that order. They add the notification bell, live updates and task-edit notifications (Supabase Realtime is included on the free plan). All files are safe to re-run.
3. **Turn off public sign-ups.** Go to Authentication → Sign In / Providers → Email and switch off **"Allow new users to sign up"**. Only admins should create accounts.
4. **Create your admin account.**
   - Go to Authentication → Users → **Add user → Create new user**. Enter your email and a strong password, and tick **Auto Confirm User**.
   - In the SQL Editor, run:
     ```sql
     update public.employees set role = 'admin', name = 'Your Name'
     where email = 'you@example.com';
     ```
5. **Set the environment variables.** Copy `.env.example` to `.env.local` and fill it in from Project Settings → API Keys:
   - `NEXT_PUBLIC_SUPABASE_URL` is the project URL.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` is the anon / publishable key. It's fine for this one to be public.
   - `SUPABASE_SERVICE_ROLE_KEY` is the service_role / secret key. It's server-only, so never commit it or prefix it with `NEXT_PUBLIC_`.
6. **Run the app:**
   ```bash
   pnpm install
   pnpm dev
   ```
   Open <http://localhost:3000>, sign in as the admin, then add employees from the **Employees** page. You give each one a temporary password, and they can change it with the key icon in the top bar.

When you deploy (e.g. Vercel), add the same three environment variables in the hosting dashboard.

## Project layout

| Path | Purpose |
| ---- | ------- |
| `app/` | Pages, authentication flow and the protected admin API route |
| `components/` | Dashboards, feature components and shared UI |
| `contexts/auth-context.tsx` | Auth session and employee profile state |
| `lib/` | Supabase clients, shared helpers and live-refresh hook |
| `supabase/schema.sql` | Core tables, RLS policies, auth triggers and attendance functions |
| `supabase/002-notifications-realtime.sql` | Notifications, notification triggers and Realtime publication |
| `supabase/003-task-updated-notifications.sql` | Assignee notifications for task edits |
| `middleware.ts` | Supabase cookie refresh and `/dashboard` access guard |

## Scripts

| Command          | What it does                     |
| ---------------- | -------------------------------- |
| `pnpm dev`       | Start the dev server             |
| `pnpm build`     | Production build (type-checked)  |
| `pnpm typecheck` | Run TypeScript without building  |

## Notes

- Pages update live (Supabase Realtime) and also refresh when you switch back to the tab. Notifications appear in the bell in the top bar and are deleted automatically after 7 days.
- Forgot password: an admin resets it from the Employees page (key icon on the employee's row).
- Deactivating an employee blocks their login but keeps their history. Deleting removes the account and its records.
- Check-in/out shows in the top bar for employees between 9:00 and 18:00 local time.
