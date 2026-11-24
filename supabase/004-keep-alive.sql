-- Keep-alive ping for the free tier.
-- Supabase pauses free projects after 7 days without database activity. The GitHub
-- Actions workflow (.github/workflows/supabase-keepalive.yml) calls this function every
-- 3 days with the public key. It reads no table data, so exposing it to anon leaks nothing.
-- Run once in Supabase → SQL Editor.

create or replace function public.keep_alive()
returns timestamptz
language sql
stable
security invoker
set search_path = ''
as $$
  select now();
$$;

revoke execute on function public.keep_alive() from public;
grant execute on function public.keep_alive() to anon, authenticated;
