# Database Setup Instructions

## To Complete the Database Setup

Since `psql` is not available in the current environment, please follow these steps to set up the complete database schema:

### 1. Access Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Login to your account
3. Select your project (yxtedbqbpkbmhjxcbrxs)

### 2. Execute the Database Setup Script

1. Navigate to the SQL Editor in your Supabase dashboard
2. Copy the contents of `scripts/complete-database-setup.sql`
3. Paste and execute the script in the SQL Editor

### 3. What the Script Will Create

The script will create the following tables with sample data:

- **employees** (already exists + 4 sample employees)
- **verification_requests** (for employee verification workflow)
- **attendance** (for real-time attendance tracking)
- **tasks** (for task management with multiple assignees)
- **task_assignments** (many-to-many relationship for tasks)
- **performance_ratings** (for employee performance tracking)

### 4. Features Enabled

- ✅ Real-time attendance tracking
- ✅ Task management with multiple employee assignments
- ✅ Performance rating system
- ✅ Row Level Security (RLS) policies
- ✅ Proper indexes for performance
- ✅ Auto-updating timestamps
- ✅ Sample data for testing

### 5. Test the Application

After running the script, all features should work including:

- Live time display in navigation
- Employee availability button (for employees)
- Real database integration (no more dummy data)
- Attendance tracking
- Task management
- Performance ratings

The application is already running at http://localhost:3001 and will automatically connect to the new database schema once you execute the script.
