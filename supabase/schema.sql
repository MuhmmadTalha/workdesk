-- =====================================================================
-- WORKDESK — DATABASE SCHEMA (Supabase)
-- =====================================================================
-- Run this ONCE in a NEW Supabase project: Dashboard → SQL Editor → paste → Run.
-- It is safe to re-run: nothing is dropped, existing data is kept.
--
-- Security model
--   * Login is Supabase Auth (email + password). employees.id = auth.users.id.
--   * Row Level Security is ON for every table. The public anon key cannot
--     read or write anything; signed-in users only see what policies allow.
--   * Admins are employees with role = 'admin'. Role can only be set by an
--     admin (through the app's server API) or by you in the SQL editor.
--   * Employees check in/out through the check_in()/check_out() functions,
--     which use the server clock, so attendance times can't be faked.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. TABLES
-- ---------------------------------------------------------------------

create table if not exists public.employees (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text unique not null,
  name        text not null,
  role        text not null default 'employee' check (role in ('admin', 'employee')),
  is_verified boolean not null default true,   -- false = deactivated (cannot sign in)
  department  text,
  position    text,
  hire_date   date not null default current_date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.notes (
  id          uuid primary key default gen_random_uuid(),
  employee_id uuid not null default auth.uid() references public.employees(id) on delete cascade,
  content     text not null check (length(content) between 1 and 10000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.tasks (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (length(title) between 1 and 255),
  description text,
  deadline    date,
  status      text not null default 'Pending'
              check (status in ('Pending', 'In Progress', 'Completed', 'Cancelled')),
  priority    text not null default 'Medium'
              check (priority in ('Low', 'Medium', 'High', 'Critical')),
  created_by  uuid default auth.uid() references public.employees(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- One row per (task, employee). Each assignee has their own status.
create table if not exists public.task_assignments (
  id           uuid primary key default gen_random_uuid(),
  task_id      uuid not null references public.tasks(id) on delete cascade,
  employee_id  uuid not null references public.employees(id) on delete cascade,
  status       text not null default 'Pending'
               check (status in ('Pending', 'In Progress', 'Completed')),
  assigned_at  timestamptz not null default now(),
  completed_at timestamptz,
  unique (task_id, employee_id)
);

create table if not exists public.attendance (
  id             uuid primary key default gen_random_uuid(),
  employee_id    uuid not null references public.employees(id) on delete cascade,
  date           date not null,
  status         text not null default 'present'
                 check (status in ('present', 'absent', 'late', 'half_day', 'sick', 'vacation', 'remote')),
  hours_worked   numeric(4,2) not null default 0 check (hours_worked between 0 and 24),
  check_in_time  time,
  check_out_time time,
  notes          text,
  created_at     timestamptz not null default now(),
  unique (employee_id, date)
);

create table if not exists public.performance_ratings (
  id          uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  rating      integer not null check (rating between 1 and 5),
  period      text not null default ('Q' || extract(quarter from now())::int || ' ' || extract(year from now())::int),
  feedback    text,
  rated_by    uuid default auth.uid() references public.employees(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_notes_employee        on public.notes(employee_id);
create index if not exists idx_assignments_employee  on public.task_assignments(employee_id);
create index if not exists idx_assignments_task      on public.task_assignments(task_id);
create index if not exists idx_attendance_date       on public.attendance(date desc);
create index if not exists idx_ratings_employee      on public.performance_ratings(employee_id);

-- ---------------------------------------------------------------------
-- 2. HELPERS + TRIGGERS
-- ---------------------------------------------------------------------

-- Is the signed-in user an active admin?  (SECURITY DEFINER so it can read
-- employees without recursing through employees' own RLS policies.)
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.employees
    where id = auth.uid() and role = 'admin' and is_verified
  );
$$;

-- Is the signed-in user an active (not deactivated) employee or admin?
create or replace function public.is_active()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.employees
    where id = auth.uid() and is_verified
  );
$$;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_employees_updated on public.employees;
create trigger trg_employees_updated before update on public.employees
  for each row execute function public.set_updated_at();

drop trigger if exists trg_notes_updated on public.notes;
create trigger trg_notes_updated before update on public.notes
  for each row execute function public.set_updated_at();

drop trigger if exists trg_tasks_updated on public.tasks;
create trigger trg_tasks_updated before update on public.tasks
  for each row execute function public.set_updated_at();

-- Create the employees row automatically when an auth user is created.
-- Role comes from app_metadata (only the service role can set it), never
-- from user_metadata (which users can edit themselves).
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.employees (id, email, name, role, department, position)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data->>'name', ''), split_part(new.email, '@', 1)),
    case when new.raw_app_meta_data->>'role' = 'admin' then 'admin' else 'employee' end,
    nullif(new.raw_user_meta_data->>'department', ''),
    nullif(new.raw_user_meta_data->>'position', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- Keep employees.email in sync when the auth email changes.
create or replace function public.handle_auth_email_change()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    update public.employees set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function public.handle_auth_email_change();

-- ---------------------------------------------------------------------
-- 3. CHECK-IN / CHECK-OUT (server clock, per user's time zone)
-- ---------------------------------------------------------------------
-- p_tz is an IANA time zone like 'Asia/Karachi' (sent by the browser).

create or replace function public.check_in(p_tz text default 'UTC')
returns public.attendance
language plpgsql security definer set search_path = public
as $$
declare
  v_local timestamp := now() at time zone p_tz;
  v_row   public.attendance;
begin
  if not public.is_active() then
    raise exception 'Not allowed';
  end if;

  insert into public.attendance (employee_id, date, status, check_in_time, hours_worked)
  values (auth.uid(), v_local::date, 'present', v_local::time(0), 0)
  on conflict (employee_id, date) do update
    set check_out_time = null,                                   -- back at work again today
        check_in_time  = coalesce(public.attendance.check_in_time, excluded.check_in_time),
        status         = case when public.attendance.status in ('absent') then 'present'
                              else public.attendance.status end
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.check_out(p_tz text default 'UTC')
returns public.attendance
language plpgsql security definer set search_path = public
as $$
declare
  v_local timestamp := now() at time zone p_tz;
  v_row   public.attendance;
begin
  if not public.is_active() then
    raise exception 'Not allowed';
  end if;

  update public.attendance
     set check_out_time = v_local::time(0),
         hours_worked   = least(24, greatest(0,
                            round((extract(epoch from (v_local::time(0) - check_in_time)) / 3600.0)::numeric, 2)))
   where employee_id = auth.uid()
     and date = v_local::date
     and check_in_time is not null
  returning * into v_row;

  if v_row.id is null then
    raise exception 'You have not checked in today';
  end if;

  return v_row;
end;
$$;

-- ---------------------------------------------------------------------
-- 4. PERMISSIONS
-- ---------------------------------------------------------------------
-- Nothing for anonymous visitors.
revoke all on public.employees, public.notes, public.tasks, public.task_assignments,
              public.attendance, public.performance_ratings from anon;
revoke execute on function public.check_in(text), public.check_out(text),
                           public.is_admin(), public.is_active() from anon, public;

grant select, insert, update, delete on public.employees, public.notes, public.tasks,
      public.attendance, public.performance_ratings to authenticated;

-- task_assignments: employees may only change status/completed_at columns.
revoke update on public.task_assignments from authenticated;
grant select, insert, delete on public.task_assignments to authenticated;
grant update (status, completed_at) on public.task_assignments to authenticated;

grant execute on function public.check_in(text), public.check_out(text),
                          public.is_admin(), public.is_active() to authenticated;

-- ---------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------
alter table public.employees           enable row level security;
alter table public.notes               enable row level security;
alter table public.tasks               enable row level security;
alter table public.task_assignments    enable row level security;
alter table public.attendance          enable row level security;
alter table public.performance_ratings enable row level security;

-- employees: read yourself; admins read & manage everyone.
-- (Creating/deleting accounts goes through the app's server API.)
drop policy if exists employees_select on public.employees;
create policy employees_select on public.employees for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists employees_admin_update on public.employees;
create policy employees_admin_update on public.employees for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists employees_admin_delete on public.employees;
create policy employees_admin_delete on public.employees for delete to authenticated
  using (public.is_admin() and id <> auth.uid());

-- notes: private to their owner.
drop policy if exists notes_owner_all on public.notes;
create policy notes_owner_all on public.notes for all to authenticated
  using (employee_id = auth.uid() and public.is_active())
  with check (employee_id = auth.uid() and public.is_active());

-- tasks: admins manage; employees read tasks assigned to them.
drop policy if exists tasks_select on public.tasks;
create policy tasks_select on public.tasks for select to authenticated
  using (
    public.is_admin()
    or (public.is_active() and exists (
          select 1 from public.task_assignments ta
          where ta.task_id = tasks.id and ta.employee_id = auth.uid()))
  );

drop policy if exists tasks_admin_write on public.tasks;
create policy tasks_admin_write on public.tasks for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- task_assignments: admins manage; employees read & update their own status.
drop policy if exists assignments_select on public.task_assignments;
create policy assignments_select on public.task_assignments for select to authenticated
  using (public.is_admin() or (employee_id = auth.uid() and public.is_active()));

drop policy if exists assignments_admin_insert on public.task_assignments;
create policy assignments_admin_insert on public.task_assignments for insert to authenticated
  with check (public.is_admin());

drop policy if exists assignments_admin_delete on public.task_assignments;
create policy assignments_admin_delete on public.task_assignments for delete to authenticated
  using (public.is_admin());

drop policy if exists assignments_update on public.task_assignments;
create policy assignments_update on public.task_assignments for update to authenticated
  using (public.is_admin() or (employee_id = auth.uid() and public.is_active()))
  with check (public.is_admin() or (employee_id = auth.uid() and public.is_active()));

-- attendance: employees read their own (writes go through check_in/check_out);
-- admins manage everything.
drop policy if exists attendance_select on public.attendance;
create policy attendance_select on public.attendance for select to authenticated
  using (public.is_admin() or (employee_id = auth.uid() and public.is_active()));

drop policy if exists attendance_admin_write on public.attendance;
create policy attendance_admin_write on public.attendance for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- performance_ratings: employees read their own; admins manage.
drop policy if exists ratings_select on public.performance_ratings;
create policy ratings_select on public.performance_ratings for select to authenticated
  using (public.is_admin() or (employee_id = auth.uid() and public.is_active()));

drop policy if exists ratings_admin_write on public.performance_ratings;
create policy ratings_admin_write on public.performance_ratings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- =====================================================================
-- 6. FIRST ADMIN  (do this after running the script above)
-- =====================================================================
-- a) Dashboard → Authentication → Users → "Add user" → "Create new user"
--    Enter your email + a strong password, tick "Auto Confirm User".
--    (The trigger above creates your employees row automatically.)
-- b) Then run this, with your email:
--
--    update public.employees set role = 'admin', name = 'Your Name'
--    where email = 'you@example.com';
--
-- After that, add every other employee from the app's Employees page.
-- =====================================================================
