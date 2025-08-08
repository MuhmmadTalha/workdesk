-- =====================================================
-- OFFICE MANAGEMENT SYSTEM - MASTER DATABASE SETUP
-- =====================================================
-- This is the ONLY file you need to run to set up everything!
-- Execute this ONCE in your Supabase SQL Editor
-- =====================================================

-- =====================================================
-- STEP 1: CLEAN SLATE - Drop everything
-- =====================================================

-- Drop all policies first
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
-- STEP 2: CREATE ALL TABLES
-- =====================================================

-- Employees table (this replaces auth.users for our app)
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
    is_verified BOOLEAN DEFAULT false,
    department VARCHAR(100),
    position VARCHAR(100),
    hire_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notes table
CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tasks table
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assigned_to UUID[] DEFAULT '{}',
    assigned_names TEXT[] DEFAULT '{}',
    deadline DATE,
    status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Completed', 'Cancelled')),
    priority VARCHAR(20) DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
    created_by UUID REFERENCES employees(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task assignments table (for many-to-many relationship)
CREATE TABLE task_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(task_id, employee_id)
);

-- Attendance table
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'sick', 'vacation', 'remote')),
    hours_worked DECIMAL(4,2) DEFAULT 8.0,
    check_in_time TIME,
    check_out_time TIME,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(employee_id, date)
);

-- Performance ratings table
CREATE TABLE performance_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    period VARCHAR(50),
    feedback TEXT,
    rated_by UUID REFERENCES employees(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- STEP 3: DISABLE SECURITY FOR DEVELOPMENT
-- =====================================================

-- Disable RLS for development (makes everything work easily)
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE performance_ratings DISABLE ROW LEVEL SECURITY;

-- Grant public access for development
GRANT ALL ON employees TO PUBLIC;
GRANT ALL ON notes TO PUBLIC;
GRANT ALL ON tasks TO PUBLIC;
GRANT ALL ON task_assignments TO PUBLIC;
GRANT ALL ON attendance TO PUBLIC;
GRANT ALL ON performance_ratings TO PUBLIC;

-- Allow public access to sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO PUBLIC;

-- =====================================================
-- STEP 4: ADD SAMPLE DATA
-- =====================================================

-- Sample admin user
INSERT INTO employees (id, email, name, role, is_verified, department, position) VALUES
    ('11111111-1111-1111-1111-111111111111', 'admin@company.com', 'System Admin', 'admin', true, 'IT', 'Administrator');

-- Sample employees
INSERT INTO employees (id, email, name, role, is_verified, department, position, hire_date) VALUES
    ('22222222-2222-2222-2222-222222222222', 'john.doe@company.com', 'John Doe', 'employee', true, 'Development', 'Software Engineer', '2024-01-15'),
    ('33333333-3333-3333-3333-333333333333', 'jane.smith@company.com', 'Jane Smith', 'employee', true, 'Marketing', 'Marketing Manager', '2024-01-20'),
    ('44444444-4444-4444-4444-444444444444', 'mike.johnson@company.com', 'Mike Johnson', 'employee', true, 'HR', 'HR Specialist', '2024-02-01'),
    ('55555555-5555-5555-5555-555555555555', 'sarah.wilson@company.com', 'Sarah Wilson', 'employee', true, 'Development', 'Frontend Developer', '2024-02-15'),
    ('66666666-6666-6666-6666-666666666666', 'alex.brown@company.com', 'Alex Brown', 'employee', true, 'Sales', 'Sales Representative', '2024-03-01');

-- Sample tasks
INSERT INTO tasks (id, title, description, assigned_to, assigned_names, deadline, status, priority, created_by) VALUES
    ('77777777-7777-7777-7777-777777777777', 'Website Redesign Project', 'Complete the company website redesign with new branding', 
     ARRAY['22222222-2222-2222-2222-222222222222'::uuid, '55555555-5555-5555-5555-555555555555'::uuid], 
     ARRAY['John Doe', 'Sarah Wilson'], 
     '2025-09-15', 'In Progress', 'High', '11111111-1111-1111-1111-111111111111'),
     
    ('88888888-8888-8888-8888-888888888888', 'Q3 Marketing Campaign', 'Launch the third quarter marketing campaign', 
     ARRAY['33333333-3333-3333-3333-333333333333'::uuid], 
     ARRAY['Jane Smith'], 
     '2025-08-30', 'Pending', 'High', '11111111-1111-1111-1111-111111111111'),
     
    ('99999999-9999-9999-9999-999999999999', 'Employee Onboarding System', 'Develop new employee onboarding process', 
     ARRAY['44444444-4444-4444-4444-444444444444'::uuid], 
     ARRAY['Mike Johnson'], 
     '2025-09-01', 'Pending', 'Medium', '11111111-1111-1111-1111-111111111111');

-- Sample task assignments
INSERT INTO task_assignments (task_id, employee_id) VALUES
    ('77777777-7777-7777-7777-777777777777', '22222222-2222-2222-2222-222222222222'),
    ('77777777-7777-7777-7777-777777777777', '55555555-5555-5555-5555-555555555555'),
    ('88888888-8888-8888-8888-888888888888', '33333333-3333-3333-3333-333333333333'),
    ('99999999-9999-9999-9999-999999999999', '44444444-4444-4444-4444-444444444444');

-- Sample attendance records
INSERT INTO attendance (employee_id, date, status, hours_worked, check_in_time, check_out_time) VALUES
    ('22222222-2222-2222-2222-222222222222', '2025-08-05', 'present', 8.5, '09:00', '17:30'),
    ('22222222-2222-2222-2222-222222222222', '2025-08-06', 'present', 8.0, '09:15', '17:15'),
    ('33333333-3333-3333-3333-333333333333', '2025-08-05', 'present', 7.5, '09:30', '17:00'),
    ('33333333-3333-3333-3333-333333333333', '2025-08-06', 'remote', 8.0, '08:00', '16:00'),
    ('44444444-4444-4444-4444-444444444444', '2025-08-05', 'present', 8.0, '09:00', '17:00'),
    ('44444444-4444-4444-4444-444444444444', '2025-08-06', 'sick', 0.0, NULL, NULL),
    ('55555555-5555-5555-5555-555555555555', '2025-08-05', 'late', 7.5, '09:45', '17:15'),
    ('55555555-5555-5555-5555-555555555555', '2025-08-06', 'present', 8.0, '09:00', '17:00');

-- Sample performance ratings
INSERT INTO performance_ratings (employee_id, rating, period, feedback, rated_by) VALUES
    ('22222222-2222-2222-2222-222222222222', 4, 'Q2 2025', 'Excellent technical skills and teamwork', '11111111-1111-1111-1111-111111111111'),
    ('33333333-3333-3333-3333-333333333333', 5, 'Q2 2025', 'Outstanding marketing campaigns and leadership', '11111111-1111-1111-1111-111111111111'),
    ('44444444-4444-4444-4444-444444444444', 4, 'Q2 2025', 'Great HR processes and employee relations', '11111111-1111-1111-1111-111111111111'),
    ('55555555-5555-5555-5555-555555555555', 3, 'Q2 2025', 'Good progress, needs improvement in time management', '11111111-1111-1111-1111-111111111111'),
    ('66666666-6666-6666-6666-666666666666', 4, 'Q2 2025', 'Consistent sales performance and client relationships', '11111111-1111-1111-1111-111111111111');

-- Sample notes
INSERT INTO notes (employee_id, content) VALUES
    ('22222222-2222-2222-2222-222222222222', 'Working on the new user authentication module. Making good progress.'),
    ('33333333-3333-3333-3333-333333333333', 'Planning the Q3 social media strategy. Need to finalize budget allocation.'),
    ('44444444-4444-4444-4444-444444444444', 'Reviewing employee handbook updates. Several policies need revision.'),
    ('55555555-5555-5555-5555-555555555555', 'Implementing responsive design for mobile devices. Almost complete.');

-- =====================================================
-- SUCCESS! Database setup complete
-- =====================================================

SELECT 
    'Database setup complete! You now have:' as message,
    (SELECT COUNT(*) FROM employees) as total_employees,
    (SELECT COUNT(*) FROM tasks) as total_tasks,
    (SELECT COUNT(*) FROM attendance) as attendance_records,
    (SELECT COUNT(*) FROM performance_ratings) as performance_ratings,
    (SELECT COUNT(*) FROM notes) as notes;
