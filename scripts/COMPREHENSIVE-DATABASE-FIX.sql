-- COMPREHENSIVE DATABASE FIX
-- Execute this in Supabase SQL Editor to fix all issues

-- First, add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add hours_worked column to attendance if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'attendance' AND column_name = 'hours_worked') THEN
        ALTER TABLE attendance ADD COLUMN hours_worked DECIMAL(4,2) DEFAULT 0;
    END IF;
END $$;

-- Update attendance status values to lowercase for consistency
UPDATE attendance SET status = LOWER(status);

-- Fix the check constraint for attendance status
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_status_check;
ALTER TABLE attendance ADD CONSTRAINT attendance_status_check 
    CHECK (status IN ('present', 'absent', 'late', 'sick', 'vacation', 'remote'));

-- Disable RLS for development
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE performance_ratings DISABLE ROW LEVEL SECURITY;

-- Grant public access for development (NOT for production!)
GRANT ALL ON employees TO PUBLIC;
GRANT ALL ON notes TO PUBLIC;
GRANT ALL ON tasks TO PUBLIC;
GRANT ALL ON task_assignments TO PUBLIC;
GRANT ALL ON attendance TO PUBLIC;
GRANT ALL ON performance_ratings TO PUBLIC;

-- Allow public access to sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO PUBLIC;

-- Insert some sample data if tables are empty

-- Sample employees (only if no employees exist)
INSERT INTO employees (id, name, email, role, position) 
SELECT 
    gen_random_uuid(),
    'John Admin',
    'admin@company.com',
    'admin',
    'System Administrator'
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE email = 'admin@company.com');

INSERT INTO employees (id, name, email, role, position) 
SELECT 
    gen_random_uuid(),
    'Jane Smith',
    'jane@company.com',
    'employee',
    'Software Developer'
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE email = 'jane@company.com');

INSERT INTO employees (id, name, email, role, position) 
SELECT 
    gen_random_uuid(),
    'Bob Wilson',
    'bob@company.com',
    'employee',
    'Project Manager'
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE email = 'bob@company.com');

-- Sample performance ratings
INSERT INTO performance_ratings (employee_id, rated_by, period, rating, feedback, evaluation_date)
SELECT 
    e1.id,
    e2.id,
    '2024-Q4',
    4,
    'Good performance overall',
    NOW() - INTERVAL '30 days'
FROM employees e1
CROSS JOIN employees e2
WHERE e1.role = 'employee' AND e2.role = 'admin'
AND NOT EXISTS (SELECT 1 FROM performance_ratings WHERE employee_id = e1.id);

-- Sample attendance records
INSERT INTO attendance (employee_id, date, status, hours_worked)
SELECT 
    e.id,
    CURRENT_DATE - INTERVAL '1 day',
    'present',
    8.0
FROM employees e
WHERE e.role = 'employee'
AND NOT EXISTS (SELECT 1 FROM attendance WHERE employee_id = e.id AND date = CURRENT_DATE - INTERVAL '1 day');

-- Sample tasks
INSERT INTO tasks (title, description, assigned_to, assigned_names, status, priority, created_by)
SELECT 
    'Sample Task',
    'This is a sample task for testing',
    ARRAY[e1.id],
    ARRAY[e1.name],
    'Pending',
    'Medium',
    e2.id
FROM employees e1
CROSS JOIN employees e2
WHERE e1.role = 'employee' AND e2.role = 'admin'
AND NOT EXISTS (SELECT 1 FROM tasks WHERE title = 'Sample Task')
LIMIT 1;

-- Create task assignments for existing tasks
INSERT INTO task_assignments (task_id, employee_id, status)
SELECT 
    t.id,
    unnest(t.assigned_to)::uuid,
    'Pending'
FROM tasks t
WHERE NOT EXISTS (
    SELECT 1 FROM task_assignments ta 
    WHERE ta.task_id = t.id AND ta.employee_id = ANY(t.assigned_to)
);

-- Verification queries
SELECT 'Employees count: ' || COUNT(*) FROM employees;
SELECT 'Tasks count: ' || COUNT(*) FROM tasks;
SELECT 'Performance ratings count: ' || COUNT(*) FROM performance_ratings;
SELECT 'Attendance records count: ' || COUNT(*) FROM attendance;
SELECT 'Task assignments count: ' || COUNT(*) FROM task_assignments;
