# Quick Start Guide

## 1. Set Up Supabase Database

1. **Copy the SQL Script**:

   - Open `scripts/SIMPLIFIED-DATABASE-SETUP.sql` in your editor
   - Copy the entire content

2. **Run in Supabase**:

   - Go to your Supabase dashboard
   - Open SQL Editor
   - Paste the copied SQL script
   - Click "Run" button

3. **Create Auth User**:
   - Go to Authentication → Users in Supabase
   - Click "Add User"
   - Enter:
     - Email: `muhammadtalhabutt20005@gmail.com`
     - Password: `12345678`
     - User ID: `11111111-1111-1111-1111-111111111111`

## 2. Start the Application

1. **Start Development Server**:

   ```bash
   cd "d:\Gen-T Projects\office-mgt-system"
   pnpm dev
   ```

2. **Access the Application**:
   - **WORKING LOGIN PAGE**: http://localhost:3001/login
   - Login with:
     - Email: `muhammadtalhabutt20005@gmail.com`
     - Password: `12345678`

## 3. Troubleshooting

If login doesn't work:

1. Check Supabase auth user ID matches exactly with `11111111-1111-1111-1111-111111111111`
2. Verify database tables were created successfully in Supabase Table Editor
3. Run this SQL in Supabase to check if admin user exists:
   ```sql
   SELECT * FROM employees WHERE email = 'muhammadtalhabutt20005@gmail.com';
   ```
4. If you get API errors in the console, check that your `.env.local` file has the correct Supabase URL and key
