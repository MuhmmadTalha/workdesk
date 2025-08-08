-- =====================================================
-- OFFICE MANAGEMENT SYSTEM - SIMPLIFIED DATABASE SETUP
-- =====================================================
-- This script creates a minimal setup with just one admin user
-- Execute this ONCE in your Supabase SQL Editor
-- =====================================================

-- Drop everything to start completely fresh
DROP POLICY IF EXISTS "Users can view own data" ON employees;
DROP POLICY IF EXISTS "Admins can view all data" ON employees;
DROP POLICY IF EXISTS "Users can update own data" ON employees;
DROP POLICY IF EXISTS "Admins can manage all data" ON employees;
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON employees;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON employees;

DROP POLICY IF EXISTS "Users can view own notes" ON notes;
DROP POLICY IF EXISTS "Users can create own notes" ON notes;
DROP POLICY IF EXISTS "Users can update own notes" ON notes;
DROP POLICY IF EXISTS "Users can delete own notes" ON notes;

DROP POLICY IF EXISTS "Users can view own tasks" ON tasks;
DROP POLICY IF EXISTS "Admins can manage all tasks" ON tasks;
DROP POLICY IF EXISTS "Users can view assigned tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update assigned tasks" ON tasks;

DROP POLICY IF EXISTS "Users can view own task assignments" ON task_assignments;
DROP POLICY IF EXISTS "Admins can manage all task assignments" ON task_assignments;

DROP POLICY IF EXISTS "Users can view own attendance" ON attendance;
DROP POLICY IF EXISTS "Admins can view all attendance" ON attendance;
DROP POLICY IF EXISTS "Users can create own attendance" ON attendance;
DROP POLICY IF EXISTS "Users can update own attendance" ON attendance;

DROP POLICY IF EXISTS "Users can view own performance ratings" ON performance_ratings;
DROP POLICY IF EXISTS "Admins can manage all performance ratings" ON performance_ratings;

-- Drop existing tables
DROP TABLE IF EXISTS performance_ratings CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS task_assignments CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS notes CASCADE;
DROP TABLE IF EXISTS employees CASCADE;

-- =====================================================
-- CREATE TABLES
-- =====================================================

-- Employees table (this replaces auth.users for our app)
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'employee')),
    is_verified BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    phone VARCHAR(20),
    department VARCHAR(100),
    position VARCHAR(100),
    hire_date DATE,
    password_hash TEXT -- For demo purposes, normally handled by auth
);

-- Notes table
CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    note_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tasks table
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assigned_to UUID[] NOT NULL DEFAULT '{}',
    assigned_names TEXT[] NOT NULL DEFAULT '{}',
    deadline DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Completed')),
    priority VARCHAR(20) NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High')),
    created_by UUID NOT NULL REFERENCES employees(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task assignments table (for individual task tracking)
CREATE TABLE task_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Completed')),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(task_id, employee_id)
);

-- Attendance table
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    check_in TIME,
    check_out TIME,
    hours_worked DECIMAL(4,2) DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'sick', 'vacation', 'remote')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(employee_id, date)
);

-- Performance ratings table
CREATE TABLE performance_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    rated_by UUID NOT NULL REFERENCES employees(id),
    period VARCHAR(50) NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_employees_role ON employees(role);
CREATE INDEX idx_employees_email ON employees(email);
CREATE INDEX idx_notes_user_id ON notes(user_id);
CREATE INDEX idx_tasks_assigned_to ON tasks USING GIN(assigned_to);
CREATE INDEX idx_tasks_created_by ON tasks(created_by);
CREATE INDEX idx_task_assignments_employee_id ON task_assignments(employee_id);
CREATE INDEX idx_task_assignments_task_id ON task_assignments(task_id);
CREATE INDEX idx_attendance_employee_id ON attendance(employee_id);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_performance_ratings_employee_id ON performance_ratings(employee_id);

-- =====================================================
-- CREATE TRIGGERS AND FUNCTIONS
-- =====================================================

-- Function to automatically create task assignments
CREATE OR REPLACE FUNCTION create_task_assignments()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert task assignments for each assigned employee
    INSERT INTO task_assignments (task_id, employee_id)
    SELECT NEW.id, unnest(NEW.assigned_to);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic task assignment creation
CREATE TRIGGER task_assignments_trigger
    AFTER INSERT ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION create_task_assignments();

-- Function to update task status based on task assignments
CREATE OR REPLACE FUNCTION update_task_status()
RETURNS TRIGGER AS $$
DECLARE
    total_assignments INTEGER;
    completed_assignments INTEGER;
    in_progress_assignments INTEGER;
BEGIN
    -- Count total assignments for this task
    SELECT COUNT(*) INTO total_assignments
    FROM task_assignments
    WHERE task_id = NEW.task_id;
    
    -- Count completed assignments
    SELECT COUNT(*) INTO completed_assignments
    FROM task_assignments
    WHERE task_id = NEW.task_id AND status = 'Completed';
    
    -- Count in progress assignments
    SELECT COUNT(*) INTO in_progress_assignments
    FROM task_assignments
    WHERE task_id = NEW.task_id AND status = 'In Progress';
    
    -- Update task status based on assignment statuses
    IF completed_assignments = total_assignments THEN
        UPDATE tasks SET status = 'Completed', updated_at = NOW()
        WHERE id = NEW.task_id;
    ELSIF in_progress_assignments > 0 OR completed_assignments > 0 THEN
        UPDATE tasks SET status = 'In Progress', updated_at = NOW()
        WHERE id = NEW.task_id;
    ELSE
        UPDATE tasks SET status = 'Pending', updated_at = NOW()
        WHERE id = NEW.task_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic task status updates
CREATE TRIGGER update_task_status_trigger
    AFTER UPDATE ON task_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_task_status();

-- =====================================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_ratings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- CREATE SIMPLIFIED RLS POLICIES (For Development)
-- =====================================================

-- Employees table policies (Allow all authenticated users to read/write for development)
CREATE POLICY "Allow read access for authenticated users" ON employees
    FOR SELECT USING (true);

CREATE POLICY "Allow all operations for authenticated users" ON employees
    FOR ALL USING (true);

-- Notes table policies
CREATE POLICY "Users can view own notes" ON notes
    FOR SELECT USING (auth.uid()::TEXT = user_id::TEXT);

CREATE POLICY "Users can create own notes" ON notes
    FOR INSERT WITH CHECK (auth.uid()::TEXT = user_id::TEXT);

CREATE POLICY "Users can update own notes" ON notes
    FOR UPDATE USING (auth.uid()::TEXT = user_id::TEXT);

CREATE POLICY "Users can delete own notes" ON notes
    FOR DELETE USING (auth.uid()::TEXT = user_id::TEXT);

-- Tasks table policies
CREATE POLICY "Users can view assigned tasks" ON tasks
    FOR SELECT USING (
        auth.uid()::TEXT = created_by::TEXT OR 
        auth.uid()::TEXT = ANY(assigned_to::TEXT[])
    );

CREATE POLICY "Admins can manage all tasks" ON tasks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE id::TEXT = auth.uid()::TEXT AND role = 'admin'
        )
    );

CREATE POLICY "Users can update assigned tasks" ON tasks
    FOR UPDATE USING (
        auth.uid()::TEXT = ANY(assigned_to::TEXT[]) OR
        EXISTS (
            SELECT 1 FROM employees 
            WHERE id::TEXT = auth.uid()::TEXT AND role = 'admin'
        )
    );

-- Task assignments table policies
CREATE POLICY "Users can view own task assignments" ON task_assignments
    FOR SELECT USING (auth.uid()::TEXT = employee_id::TEXT);

CREATE POLICY "Users can update own task assignments" ON task_assignments
    FOR UPDATE USING (auth.uid()::TEXT = employee_id::TEXT);

CREATE POLICY "Admins can manage all task assignments" ON task_assignments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE id::TEXT = auth.uid()::TEXT AND role = 'admin'
        )
    );

-- Attendance table policies
CREATE POLICY "Users can view own attendance" ON attendance
    FOR SELECT USING (auth.uid()::TEXT = employee_id::TEXT);

CREATE POLICY "Users can create own attendance" ON attendance
    FOR INSERT WITH CHECK (auth.uid()::TEXT = employee_id::TEXT);

CREATE POLICY "Users can update own attendance" ON attendance
    FOR UPDATE USING (auth.uid()::TEXT = employee_id::TEXT);

CREATE POLICY "Admins can view all attendance" ON attendance
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE id::TEXT = auth.uid()::TEXT AND role = 'admin'
        )
    );

-- Performance ratings table policies
CREATE POLICY "Users can view own performance ratings" ON performance_ratings
    FOR SELECT USING (auth.uid()::TEXT = employee_id::TEXT);

CREATE POLICY "Admins can manage all performance ratings" ON performance_ratings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE id::TEXT = auth.uid()::TEXT AND role = 'admin'
        )
    );

-- =====================================================
-- INSERT ADMIN USER ONLY
-- =====================================================

-- Insert only the admin user (ID will match with auth.users)
INSERT INTO employees (id, email, name, role, is_verified, department, position, hire_date) VALUES
    ('11111111-1111-1111-1111-111111111111', 'muhammadtalhabutt20005@gmail.com', 'Muhammad Talha Butt', 'admin', true, 'IT', 'System Admin', '2024-01-01');

-- =====================================================
-- CREATE AUTH USER (IMPORTANT FOR LOGIN)
-- =====================================================
-- After running this script, you MUST create a matching auth user in Supabase Auth:
-- 1. Go to Authentication > Users in Supabase dashboard
-- 2. Create a user with this exact email and ID:

-- ADMIN USER:
-- Email: muhammadtalhabutt20005@gmail.com
-- Password: 12345678
-- User ID: 11111111-1111-1111-1111-111111111111

-- =====================================================
-- FINAL VERIFICATION
-- =====================================================

-- Add table comments for documentation
COMMENT ON TABLE employees IS 'Employee information and user accounts';
COMMENT ON TABLE notes IS 'Personal notes for each user';
COMMENT ON TABLE tasks IS 'Tasks assigned to employees by admins';
COMMENT ON TABLE task_assignments IS 'Individual task assignments for better tracking';
COMMENT ON TABLE attendance IS 'Daily attendance records for employees';
COMMENT ON TABLE performance_ratings IS 'Performance ratings given to employees by admins';

-- Show success message
DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'DATABASE SETUP COMPLETED SUCCESSFULLY!';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Create auth user in Supabase dashboard';
    RAISE NOTICE '2. Match the user ID with the employee ID';
    RAISE NOTICE '3. Test login with: muhammadtalhabutt20005@gmail.com / 12345678';
    RAISE NOTICE '============================================';
END $$;
