-- =====================================================================
-- 005 — TASK ORDERING, ARCHIVING, COMPLETION TIME AND 30-DAY PURGE
-- =====================================================================
-- Run once in the Supabase SQL Editor, after 004-keep-alive.sql.
-- Safe to re-run.
--
-- If "create extension pg_cron" fails, enable pg_cron under
-- Database -> Extensions in the Supabase dashboard, then re-run this file.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. tasks: completion time + the admin's own order and archive flag
-- ---------------------------------------------------------------------
alter table public.tasks add column if not exists completed_at      timestamptz;
alter table public.tasks add column if not exists admin_sort_order  double precision;
alter table public.tasks add column if not exists admin_archived_at timestamptz;

-- Lower sort value = higher in the list. Newest first, like before.
update public.tasks set admin_sort_order = -extract(epoch from created_at)
  where admin_sort_order is null;
update public.tasks set completed_at = updated_at
  where status = 'Completed' and completed_at is null;

alter table public.tasks alter column admin_sort_order set default -extract(epoch from now());
alter table public.tasks alter column admin_sort_order set not null;

create or replace function public.trg_task_completed_at()
returns trigger language plpgsql set search_path = public
as $$
begin
  if new.status = 'Completed' and old.status is distinct from 'Completed' then
    new.completed_at := now();
  elsif new.status <> 'Completed' then
    new.completed_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists task_completed_at on public.tasks;
create trigger task_completed_at
  before update of status on public.tasks
  for each row execute function public.trg_task_completed_at();

-- ---------------------------------------------------------------------
-- 2. task_assignments: each employee's own order and archive flag
-- ---------------------------------------------------------------------
alter table public.task_assignments add column if not exists sort_order  double precision;
alter table public.task_assignments add column if not exists archived_at timestamptz;

update public.task_assignments set sort_order = -extract(epoch from assigned_at)
  where sort_order is null;

alter table public.task_assignments alter column sort_order set default -extract(epoch from now());
alter table public.task_assignments alter column sort_order set not null;

-- Employees may change only these columns (row access is still limited
-- to their own rows by the assignments_update policy).
revoke update on public.task_assignments from authenticated;
grant update (status, completed_at, sort_order, archived_at)
  on public.task_assignments to authenticated;

-- ---------------------------------------------------------------------
-- 3. Delete tasks completed more than 30 days ago (assignments cascade)
-- ---------------------------------------------------------------------
create or replace function public.purge_completed_tasks()
returns integer language plpgsql security definer set search_path = public
as $$
declare
  v_count integer;
begin
  delete from public.tasks
   where status = 'Completed'
     and completed_at < now() - interval '30 days';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function public.purge_completed_tasks() from anon, authenticated, public;

create extension if not exists pg_cron;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'purge-completed-tasks') then
    perform cron.unschedule('purge-completed-tasks');
  end if;
end;
$$;

select cron.schedule(
  'purge-completed-tasks',
  '0 3 * * *',                      -- every day at 03:00 UTC
  'select public.purge_completed_tasks()'
);
