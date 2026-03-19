# Office Management System

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-Backend-green?logo=supabase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-38bdf8?logo=tailwindcss)

A comprehensive office management and note-taking web application built with Next.js, TypeScript, Supabase, and Tailwind CSS. Includes dashboards, employee management, attendance, tasks, performance tracking, and notes.

## Features

- **Authentication** – Admin/employee login via Supabase Auth
- **Employee Management** – Add, edit, and remove employees
- **Task Assignment** – Admins assign tasks to employees; employees mark tasks complete
- **Attendance Tracking** – Employees mark daily attendance; admins view records
- **Performance Ratings** – Admins rate employee performance; charts and analytics
- **Notes System** – Personal notes for each user (CRUD)
- **Dashboards** – Separate admin and employee dashboards
- **Charts & Analytics** – Visualize attendance, performance, and tasks (Recharts)
- **Responsive UI** – Mobile and desktop support
- **Role-based Access** – Admin and employee portals
- **Security** – RLS policies, secure auth, and environment variable management

## Tech Stack

| Layer         | Technology |
|-------------- |-----------|
| Framework     | [Next.js 15](https://nextjs.org/) (App Router) |
| Language      | TypeScript 5 |
| UI Components | [shadcn/ui](https://ui.shadcn.com/), [Radix UI](https://www.radix-ui.com/) |
| Styling       | [Tailwind CSS 3](https://tailwindcss.com/) |
| Icons         | [Lucide React](https://lucide.dev/) |
| Backend/Auth  | [Supabase](https://supabase.com/) (PostgreSQL + Auth) |
| Forms         | [React Hook Form](https://react-hook-form.com/), [Zod](https://zod.dev/) |
| Charts        | [Recharts](https://recharts.org/) |
| Theming       | [next-themes](https://github.com/pacocoursey/next-themes) |

## Database Schema (Summary)

Key tables:

- **employees** – User accounts and profiles
- **tasks** – Task definitions
- **task_assignments** – Employee-task mapping
- **attendance** – Daily attendance records
- **performance_ratings** – Employee performance
- **notes** – Personal notes per user

See [scripts/MASTER-DATABASE-SETUP.sql](scripts/MASTER-DATABASE-SETUP.sql) for full schema and [README-DATABASE-SETUP.md](README-DATABASE-SETUP.md) for setup steps.

## Admin & Test Credentials

Example admin login (see [README-DATABASE-SETUP.md](README-DATABASE-SETUP.md) for more):

- **Email:** `muhammadtalhabutt20005@gmail.com`
- **Password:** `12345678`

## Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

See [SIMPLIFIED-SETUP-GUIDE.md](SIMPLIFIED-SETUP-GUIDE.md) for details.

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (or npm/yarn)
- Supabase project (free at https://supabase.com/)

### 1. Clone the repository

```bash
git clone <repo-url>
cd office-mgt-system
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure environment variables

```bash
cp .env.example .env.local
# Edit .env.local with your Supabase credentials
```

### 4. Set up the database

Run the SQL in [scripts/MASTER-DATABASE-SETUP.sql](scripts/MASTER-DATABASE-SETUP.sql) using the Supabase SQL Editor. See [SIMPLIFIED-SETUP-GUIDE.md](SIMPLIFIED-SETUP-GUIDE.md) for step-by-step instructions.

### 5. Start the development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

| Command         | Description                       |
|-----------------|-----------------------------------|
| `pnpm dev`      | Start the development server      |
| `pnpm build`    | Create an optimized production build |
| `pnpm start`    | Run the production server         |
| `pnpm lint`     | Run ESLint                       |

## Project Structure

```
office-mgt-system/
├── app/                    # Next.js App Router pages
│   ├── dashboard/          # Admin/employee dashboards
│   ├── login/              # Login page
│   └── ...
├── components/             # UI and feature components
│   ├── admin-dashboard.tsx
│   ├── employee-dashboard.tsx
│   ├── notes-panel.tsx
│   ├── tasks-content.tsx
│   ├── ...
│   └── ui/                 # shadcn/ui components
├── contexts/               # React context providers
├── hooks/                  # Custom React hooks
├── lib/                    # Supabase client, utils
├── scripts/                # SQL setup scripts
├── styles/                 # Global styles
├── public/                 # Static assets
└── ...
```

## Deployment

Deploy easily with [Vercel](https://vercel.com):

1. Push the repository to GitHub.
2. Import the project in the Vercel dashboard.
3. Add the environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
4. Update the Supabase **Site URL** and **Redirect URLs** to your production domain.
5. Deploy.

See [SECURITY-GUIDE.md](SECURITY-GUIDE.md) and [SUCCESS-GUIDE.md](SUCCESS-GUIDE.md) for more.

## License

This project is open source and available under the [MIT License](LICENSE).
