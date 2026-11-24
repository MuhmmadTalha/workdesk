-- =====================================================================
-- 003 — NOTIFY ASSIGNEES WHEN AN ADMIN EDITS A TASK
-- =====================================================================
-- Run once in the Supabase SQL Editor, after 002-notifications-realtime.sql.
-- Safe to re-run.
-- =====================================================================

create or replace function public.trg_notify_task_updated()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  v_employee uuid;
  v_changes  text[] := '{}';
begin
  if new.status = 'Cancelled' then
    return new;
  end if;

  if new.title       is distinct from old.title       then v_changes := array_append(v_changes, 'title'); end if;
  if new.description is distinct from old.description then v_changes := array_append(v_changes, 'description'); end if;
  if new.deadline    is distinct from old.deadline    then
    v_changes := array_append(v_changes, coalesce('due ' || to_char(new.deadline, 'Mon DD'), 'deadline removed'));
  end if;
  if new.priority    is distinct from old.priority    then v_changes := array_append(v_changes, new.priority || ' priority'); end if;

  if array_length(v_changes, 1) is null then
    return new;
  end if;

  for v_employee in
    select employee_id from public.task_assignments where task_id = new.id
  loop
    perform public.notify(
      v_employee,
      'task_updated',
      'Task updated: ' || new.title,
      'Changed: ' || array_to_string(v_changes, ', '),
      'tasks'
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists notify_task_updated on public.tasks;
create trigger notify_task_updated
  after update of title, description, deadline, priority on public.tasks
  for each row execute function public.trg_notify_task_updated();
