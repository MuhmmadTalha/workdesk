# Supabase Setup Guide for Office Management System

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: Office Management System
   - **Database Password**: Create a strong password
   - **Region**: Choose closest to your location
5. Click "Create new project"

## 2. Get Your Project Credentials

1. After project creation, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (e.g., `https://your-project.supabase.co`)
   - **Anon/Public Key** (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

## 3. Configure Environment Variables

1. Create a `.env.local` file in your project root:

```bash
cp .env.example .env.local
```

2. Add your Supabase credentials to `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## 4. Set Up Database Schema

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `scripts/setup-supabase-schema.sql`
4. Paste it into the SQL Editor
5. Click "Run" to execute the SQL

This will create:

- `employees` table with your admin account
- `verification_requests` table for managing employee verification
- Proper Row Level Security (RLS) policies
- Necessary indexes for performance

## 5. Enable Authentication (Optional)

If you want to use Supabase Auth instead of custom authentication:

1. Go to **Authentication** → **Settings**
2. Configure email settings
3. Enable email confirmations if desired
4. Update the auth context to use Supabase Auth

## 6. Test the Setup

1. Restart your development server:

```bash
pnpm dev
```

2. Login with your admin credentials:

   - **Email**: muhammadtalhabutt20005@gmail.com
   - **Password**: 12345678

3. Navigate to the Employees section
4. You should see the employee verification interface

## 7. Database Structure

### Employees Table

- `id`: UUID (Primary Key)
- `email`: Unique email address
- `name`: Full name
- `role`: 'admin' or 'employee'
- `is_verified`: Boolean verification status
- `phone`, `department`, `position`, `hire_date`: Additional info
- `created_at`, `updated_at`: Timestamps

### Verification Requests Table

- `id`: UUID (Primary Key)
- `employee_id`: References employees table
- `requested_by`: Admin who made the request
- `status`: 'pending', 'approved', or 'rejected'
- `notes`: Optional notes
- `created_at`, `updated_at`: Timestamps

## 8. Next Steps

1. Update the `EmployeeManagement` component to use real Supabase data
2. Replace mock data with actual database calls
3. Implement real-time updates using Supabase subscriptions
4. Add email notifications for verification status changes

## Security Notes

- Row Level Security (RLS) is enabled
- Only admins can manage employees
- Employees can only view their own data
- All sensitive operations require admin role verification
