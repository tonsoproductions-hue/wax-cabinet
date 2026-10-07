-- Wax Cabinet database setup for a fresh Supabase project. Paste into the SQL editor.
-- (An existing project from before sign-in should run migrations/002_owner_sign_in.sql instead.)

create table if not exists public.vinyl_records (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  owner_id      uuid references auth.users (id) on delete cascade default auth.uid(),
  artist        text not null default '',
  title         text not null default '',
  year          integer,
  genre         text,
  label         text,
  condition     text,
  discogs_id    bigint,
  market_value  numeric(10, 2),
  image_url     text,
  tracklist     jsonb not null default '[]'::jsonb
);

create index if not exists vinyl_records_owner_id_idx on public.vinyl_records (owner_id);

-- Anyone can browse; only a record's owner can add, change or delete it.
alter table public.vinyl_records enable row level security;

create policy "Anyone can browse records" on public.vinyl_records
  for select using (true);
create policy "Owners add records" on public.vinyl_records
  for insert to authenticated with check (owner_id = auth.uid());
create policy "Owners update records" on public.vinyl_records
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Owners delete records" on public.vinyl_records
  for delete to authenticated using (owner_id = auth.uid());

-- Public bucket for cover photos; each user writes only to album-art/<their user id>/.
insert into storage.buckets (id, name, public)
values ('album-art', 'album-art', true)
on conflict (id) do nothing;

create policy "Owners upload covers" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'album-art' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Owners delete covers" on storage.objects
  for delete to authenticated
  using (bucket_id = 'album-art' and (storage.foldername(name))[1] = auth.uid()::text);
