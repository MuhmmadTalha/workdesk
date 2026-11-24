-- =====================================================================
-- 002 — NOTIFICATIONS + LIVE UPDATES (Supabase Realtime)
-- =====================================================================
-- Run this ONCE in the Supabase SQL Editor, after schema.sql.
-- Safe to re-run: nothing is dropped except this file's own triggers/policies,
-- which are recreated.
--
-- What it adds
--   * notifications table — only database triggers create rows; each user
--     can read / mark read / dismiss their own. Rows older than 7 days are
--     hidden and automatically deleted.
--   * triggers that notify people when tasks, ratings and attendance change.
--   * turns on Realtime for the tables the app watches, so pages update
--     without a refresh. Realtime respects RLS: users only receive changes
--     to rows they are allowed to read.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. TABLE
-- ---------------------------------------------------------------------
create table if not exists public.notifications (
  id           uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.employees(id) on delete cascade,
  type         text not null,          -- task_assigned | task_cancelled | task_completed | rating_added | attendance_updated
  title        text not null,
  body         text,
  link_tab     text,                   -- dashboard tab to open when clicked
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists idx_notifications_recipient
  on public.notifications (recipient_id, created_at desc);
create index if not exists idx_notifications_created
  on public.notifications (created_at);

-- ---------------------------------------------------------------------
-- 2. PERMISSIONS + ROW LEVEL SECURITY
-- ---------------------------------------------------------------------
revoke all on public.notifications from anon, authenticated;
grant select, delete on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;   -- only read_at can change

alter table public.notifications enable row level security;

drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications for select to authenticated
  using (recipient_id = auth.uid() and created_at > now() - interval '7 days');

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications for update to authenticated
  using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

drop policy if exists notifications_delete_own on public.notifications;
create policy notifications_delete_own on public.notifications for delete to authenticated
  using (recipient_id = auth.uid());

-- ---------------------------------------------------------------------
-- 3. NOTIFY HELPER (also purges anything older than 7 days)
-- ---------------------------------------------------------------------
create or replace function public.notify(
  p_recipient uuid, p_type text, p_title text, p_body text, p_tab text
)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if p_recipient is null then
    return;
  end if;

  delete from public.notifications where created_at < now() - interval '7 days';

  insert into public.notifications (recipient_id, type, title, body, link_tab)
  values (p_recipient, p_type, left(p_title, 200), left(p_body, 500), p_tab);
end;
$$;

-- Only triggers (running as the table owner) may call it.
revoke execute on function public.notify(uuid, text, text, text, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 4. TRIGGERS
-- ---------------------------------------------------------------------

-- New assignment → tell the employee.
create or replace function public.trg_notify_task_assigned()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  v_task public.tasks;
begin
  select * into v_task from public.tasks where id = new.task_id;
  perform public.notify(
    new.employee_id,
    'task_assigned',
    'New task: ' || coalesce(v_task.title, 'Untitled'),
    case when v_task.deadline is not null
         then v_task.priority || ' priority · due ' || to_char(v_task.deadline, 'Mon DD')
         else v_task.priority || ' priority' end,
    'tasks'
  );
  return new;
end;
$$;

drop trigger if exists notify_task_assigned on public.task_assignments;
create trigger notify_task_assigned
  after insert on public.task_assignments
  for each row execute function public.trg_notify_task_assigned();

-- Assignee marks their part Completed → tell active admins.
create or replace function public.trg_notify_task_completed()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  v_title text;
  v_name  text;
  v_admin uuid;
begin
  if new.status = 'Completed' and old.status is distinct from 'Completed' then
    select title into v_title from public.tasks where id = new.task_id;
    select name  into v_name  from public.employees where id = new.employee_id;
    for v_admin in
      select id from public.employees where role = 'admin' and is_verified
    loop
      perform public.notify(
        v_admin,
        'task_completed',
        coalesce(v_name, 'An employee') || ' completed a task',
        coalesce(v_title, 'Untitled task'),
        'tasks'
      );
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists notify_task_completed on public.task_assignments;
create trigger notify_task_completed
  after update of status on public.task_assignments
  for each row execute function public.trg_notify_task_completed();

-- Task cancelled → tell every assignee.
create or replace function public.trg_notify_task_cancelled()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  v_employee uuid;
begin
  if new.status = 'Cancelled' and old.status is distinct from 'Cancelled' then
    for v_employee in
      select employee_id from public.task_assignments where task_id = new.id
    loop
      perform public.notify(v_employee, 'task_cancelled', 'Task cancelled: ' || new.title,
                            'You no longer need to work on this task.', 'tasks');
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists notify_task_cancelled on public.tasks;
create trigger notify_task_cancelled
  after update of status on public.tasks
  for each row execute function public.trg_notify_task_cancelled();

-- New rating → tell the employee.
create or replace function public.trg_notify_rating_added()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  perform public.notify(
    new.employee_id,
    'rating_added',
    'New performance rating: ' || new.rating || '/5',
    coalesce(new.period, '') ||
      case when new.feedback is not null and new.feedback <> ''
           then ' · "' || left(new.feedback, 80) || case when length(new.feedback) > 80 then '…"' else '"' end
           else '' end,
    'performance'
  );
  return new;
end;
$$;

drop trigger if exists notify_rating_added on public.performance_ratings;
create trigger notify_rating_added
  after insert on public.performance_ratings
  for each row execute function public.trg_notify_rating_added();

-- Admin records/edits an employee's attendance → tell the employee.
-- (Employees' own check-in/out is not announced: is_admin() is false for them.)
create or replace function public.trg_notify_attendance_updated()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if public.is_admin() and new.employee_id <> auth.uid() then
    perform public.notify(
      new.employee_id,
      'attendance_updated',
      'Attendance updated for ' || to_char(new.date, 'Mon DD'),
      'Marked as ' || replace(new.status, '_', ' ') || ' · ' || new.hours_worked || ' h',
      'attendance'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists notify_attendance_updated on public.attendance;
create trigger notify_attendance_updated
  after insert or update on public.attendance
  for each row execute function public.trg_notify_attendance_updated();

-- ---------------------------------------------------------------------
-- 5. REALTIME — publish changes for the tables the app watches
-- ---------------------------------------------------------------------
do $$
declare
  t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;

  foreach t in array array['notifications', 'tasks', 'task_assignments',
                           'performance_ratings', 'attendance', 'employees']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end;
$$;
