-- TopLiveCam initial private data schema
-- Run once in Supabase SQL Editor. All user-owned rows are protected by RLS.

create extension if not exists pgcrypto;

create table if not exists public.characters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  description text not null default '' check (char_length(description) <= 500),
  image_path text not null,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists characters_user_created_idx
  on public.characters (user_id, created_at desc);

alter table public.characters enable row level security;

drop policy if exists "Users can view their own characters" on public.characters;
create policy "Users can view their own characters"
  on public.characters for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can add their own characters" on public.characters;
create policy "Users can add their own characters"
  on public.characters for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own characters" on public.characters;
create policy "Users can update their own characters"
  on public.characters for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own characters" on public.characters;
create policy "Users can delete their own characters"
  on public.characters for delete to authenticated
  using (auth.uid() = user_id);

-- Session records are written by trusted server code only.
create table if not exists public.realtime_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  model text not null default 'decart/lucy-2-6/realtime',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  status text not null default 'started' check (status in ('started', 'ended', 'failed')),
  created_at timestamptz not null default now()
);

create index if not exists realtime_sessions_user_created_idx
  on public.realtime_sessions (user_id, created_at desc);

alter table public.realtime_sessions enable row level security;

drop policy if exists "Users can view their own session history" on public.realtime_sessions;
create policy "Users can view their own session history"
  on public.realtime_sessions for select to authenticated
  using (auth.uid() = user_id);

-- Private character-image bucket. No public read access.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('character-images', 'character-images', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "Users can read their own character images" on storage.objects;
create policy "Users can read their own character images"
  on storage.objects for select to authenticated
  using (bucket_id = 'character-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can upload their own character images" on storage.objects;
create policy "Users can upload their own character images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'character-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can update their own character images" on storage.objects;
create policy "Users can update their own character images"
  on storage.objects for update to authenticated
  using (bucket_id = 'character-images' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'character-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can delete their own character images" on storage.objects;
create policy "Users can delete their own character images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'character-images' and (storage.foldername(name))[1] = auth.uid()::text);

-- Authenticated users can inspect only their own rows; session writes are reserved
-- for trusted Edge Function code using the server-side secret key.
revoke insert, update, delete on public.realtime_sessions from anon, authenticated;
grant select on public.realtime_sessions to authenticated;
grant select, insert, update, delete on public.characters to authenticated;
