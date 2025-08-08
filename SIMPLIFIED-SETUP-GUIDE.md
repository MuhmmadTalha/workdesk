# Office Management System - Simplified Setup Guide

## 1. Database Setup Instructions

### Step 1: Run the SQL Script

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Copy and paste **ALL content** from `scripts/SIMPLIFIED-DATABASE-SETUP.sql`
3. Click **RUN** (this will take a few seconds)

### Step 2: Create Auth User (CRITICAL FOR LOGIN)

After running the script, you MUST create a matching auth user:

1. Go to **Authentication** → **Users** in Supabase
2. Click **Add user** and create this EXACT user:

**Admin User:**

- **Email**: `muhammadtalhabutt20005@gmail.com`
- **Password**: `12345678`
- **User UID**: `11111111-1111-1111-1111-111111111111`

> ⚠️ **IMPORTANT**: The User UID must match exactly with what's in the database!

### Step 3: Test Login

1. Start your application with `pnpm dev`
2. Navigate to the login page
3. Log in with:
   - **Email**: `muhammadtalhabutt20005@gmail.com`
   - **Password**: `12345678`

## 2. Troubleshooting

If login still doesn't work, try these steps:

### Verify Setup:

1. **Check Database**: Run this query in Supabase SQL Editor:

   ```sql
   SELECT id, email, name, role FROM employees WHERE email = 'muhammadtalhabutt20005@gmail.com';
   ```

2. **Check Auth User**: Go to **Authentication** → **Users** and verify user exists with correct UID

3. **Check Supabase Connection**: Use the System Test in the admin dashboard

4. **Clear Browser Cache**: Hard refresh (Ctrl+F5)

### If Still Not Working:

1. **Check Console**: Open browser DevTools → Console for any errors
2. **Verify Environment Variables**: Check `.env.local` has correct Supabase URL and keys
3. **Temporarily Disable RLS**: In SQL Editor run: `ALTER TABLE employees DISABLE ROW LEVEL SECURITY;`

## 3. Adding Employees Later

As an admin, you can add employees through the application once you're logged in. The system will handle the necessary database operations.
