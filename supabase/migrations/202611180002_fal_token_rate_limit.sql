-- Server-only quota counter for issuing short-lived fal realtime tokens.
-- The Edge Function calls this RPC with the authenticated user's UUID.
create table if not exists public.fal_token_quotas (
  user_id uuid primary key references auth.users(id) on delete cascade,
  minute_window_started_at timestamptz not null default now(),
  minute_count integer not null default 0 check (minute_count >= 0),
  day_started_on date not null default (now() at time zone 'utc')::date,
  day_count integer not null default 0 check (day_count >= 0),
  updated_at timestamptz not null default now()
);

alter table public.fal_token_quotas enable row level security;
revoke all on public.fal_token_quotas from anon, authenticated;
grant all on public.fal_token_quotas to service_role;

create or replace function public.consume_fal_token_quota(p_user_id uuid)
returns table (allowed boolean, minute_remaining integer, day_remaining integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := now();
  v_minute_count integer;
  v_day_count integer;
  v_minute_started timestamptz;
  v_day_started date;
begin
  insert into public.fal_token_quotas (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select minute_count, day_count, minute_window_started_at, day_started_on
    into v_minute_count, v_day_count, v_minute_started, v_day_started
  from public.fal_token_quotas
  where user_id = p_user_id
  for update;

  if v_now - v_minute_started >= interval '1 minute' then
    v_minute_count := 0;
    v_minute_started := v_now;
  end if;

  if v_day_started <> (v_now at time zone 'utc')::date then
    v_day_count := 0;
    v_day_started := (v_now at time zone 'utc')::date;
  end if;

  if v_minute_count >= 10 or v_day_count >= 1000 then
    update public.fal_token_quotas
      set minute_count = v_minute_count,
          minute_window_started_at = v_minute_started,
          day_count = v_day_count,
          day_started_on = v_day_started,
          updated_at = v_now
    where user_id = p_user_id;
    return query select false, greatest(0, 10 - v_minute_count), greatest(0, 1000 - v_day_count);
    return;
  end if;

  v_minute_count := v_minute_count + 1;
  v_day_count := v_day_count + 1;

  update public.fal_token_quotas
    set minute_count = v_minute_count,
        minute_window_started_at = v_minute_started,
        day_count = v_day_count,
        day_started_on = v_day_started,
        updated_at = v_now
  where user_id = p_user_id;

  return query select true, greatest(0, 10 - v_minute_count), greatest(0, 1000 - v_day_count);
end;
$$;

revoke all on function public.consume_fal_token_quota(uuid) from public, anon, authenticated;
grant execute on function public.consume_fal_token_quota(uuid) to service_role;
