-- =====================================================
-- PRODUCTION SECURITY SETUP (Optional)
-- =====================================================
-- Run this ONLY when you want to enable proper security
-- This is for production deployment, not for development
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_ratings ENABLE ROW LEVEL SECURITY;

-- Revoke public access
REVOKE ALL ON employees FROM PUBLIC;
REVOKE ALL ON notes FROM PUBLIC;
REVOKE ALL ON tasks FROM PUBLIC;
REVOKE ALL ON task_assignments FROM PUBLIC;
REVOKE ALL ON attendance FROM PUBLIC;
REVOKE ALL ON performance_ratings FROM PUBLIC;

-- Create proper RLS policies

-- Employees: Users can view own data, admins can view all
CREATE POLICY "Users can view own data" ON employees
    FOR SELECT USING (auth.uid()::text = id::text OR 
                     EXISTS (SELECT 1 FROM employees WHERE id::text = auth.uid()::text AND role = 'admin'));

CREATE POLICY "Admins can manage all data" ON employees
    FOR ALL USING (EXISTS (SELECT 1 FROM employees WHERE id::text = auth.uid()::text AND role = 'admin'));

-- Notes: Users can manage own notes
CREATE POLICY "Users can manage own notes" ON notes
    FOR ALL USING (auth.uid()::text = employee_id::text OR 
                   EXISTS (SELECT 1 FROM employees WHERE id::text = auth.uid()::text AND role = 'admin'));

-- Tasks: Users can view assigned tasks, admins can manage all
CREATE POLICY "Users can view assigned tasks" ON tasks
    FOR SELECT USING (auth.uid()::text = ANY(assigned_to::text[]) OR 
                     EXISTS (SELECT 1 FROM employees WHERE id::text = auth.uid()::text AND role = 'admin'));

CREATE POLICY "Admins can manage all tasks" ON tasks
    FOR ALL USING (EXISTS (SELECT 1 FROM employees WHERE id::text = auth.uid()::text AND role = 'admin'));

-- Task assignments: Users can view own assignments, admins can manage all
CREATE POLICY "Users can view own assignments" ON task_assignments
    FOR SELECT USING (auth.uid()::text = employee_id::text OR 
                     EXISTS (SELECT 1 FROM employees WHERE id::text = auth.uid()::text AND role = 'admin'));

CREATE POLICY "Admins can manage all assignments" ON task_assignments
    FOR ALL USING (EXISTS (SELECT 1 FROM employees WHERE id::text = auth.uid()::text AND role = 'admin'));

-- Attendance: Users can manage own attendance, admins can view all
CREATE POLICY "Users can manage own attendance" ON attendance
    FOR ALL USING (auth.uid()::text = employee_id::text OR 
                   EXISTS (SELECT 1 FROM employees WHERE id::text = auth.uid()::text AND role = 'admin'));

-- Performance ratings: Users can view own ratings, admins can manage all
CREATE POLICY "Users can view own ratings" ON performance_ratings
    FOR SELECT USING (auth.uid()::text = employee_id::text OR 
                     EXISTS (SELECT 1 FROM employees WHERE id::text = auth.uid()::text AND role = 'admin'));

CREATE POLICY "Admins can manage all ratings" ON performance_ratings
    FOR ALL USING (EXISTS (SELECT 1 FROM employees WHERE id::text = auth.uid()::text AND role = 'admin'));

SELECT 'Production security policies enabled successfully!' as message;
