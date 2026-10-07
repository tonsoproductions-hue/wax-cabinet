-- Vinyl Crate: open the app to many users.
-- Run in the Supabase SQL editor after 002_owner_sign_in.sql. Safe to re-run.

-- 1. Profiles: one row per user, created automatically at sign-up.
--    collection_public controls whether others can browse your records
--    (share links and the website's featured collection need it on).
create table if not exists public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  collection_public boolean not null default true,
  created_at        timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Profiles are readable" on public.profiles;
create policy "Profiles are readable" on public.profiles
  for select using (true);
drop policy if exists "Users update their own profile" on public.profiles;
create policy "Users update their own profile" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Users who signed up before this migration.
insert into public.profiles (id) select id from auth.users on conflict (id) do nothing;

-- 2. Records: you always see your own; others' only if their collection is public.
drop policy if exists "Anyone can browse records" on public.vinyl_records;
drop policy if exists "Browse own or public collections" on public.vinyl_records;
create policy "Browse own or public collections" on public.vinyl_records
  for select using (
    owner_id = (select auth.uid())
    or exists (select 1 from public.profiles p where p.id = vinyl_records.owner_id and p.collection_public)
  );

-- Each collection loads newest-first by owner.
create index if not exists vinyl_records_owner_created_idx
  on public.vinyl_records (owner_id, created_at desc);

-- 3. Cover-scan log: enforces the daily per-user limit in /api/claude and
--    records which model answered and what each scan cost.
create table if not exists public.identify_events (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  model      text,            -- the model whose answer was used (null if none could read it)
  cost_usd   numeric(10, 6),  -- total across every model tried
  attempts   jsonb            -- [{ model, inputTokens, outputTokens, costUsd } | { model, error }]
);
alter table public.identify_events add column if not exists model text;
alter table public.identify_events add column if not exists cost_usd numeric(10, 6);
alter table public.identify_events add column if not exists attempts jsonb;

create index if not exists identify_events_user_created_idx
  on public.identify_events (user_id, created_at desc);

alter table public.identify_events enable row level security;

drop policy if exists "Users log their own scans" on public.identify_events;
create policy "Users log their own scans" on public.identify_events
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "Users see their own scans" on public.identify_events;
create policy "Users see their own scans" on public.identify_events
  for select to authenticated using (user_id = (select auth.uid()));
