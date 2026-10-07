-- Wax Cabinet database setup. Paste into the Supabase SQL editor for a fresh project.

create table if not exists public.vinyl_records (
  id            bigint generated always as identity primary key,
  created_at    timestamptz not null default now(),
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

-- The app talks to Supabase with the public anon key and has no sign-in yet,
-- so these policies let anyone with the URL read and edit the collection.
alter table public.vinyl_records enable row level security;

create policy "anon read"   on public.vinyl_records for select to anon using (true);
create policy "anon insert" on public.vinyl_records for insert to anon with check (true);
create policy "anon delete" on public.vinyl_records for delete to anon using (true);

-- Public bucket for uploaded cover photos.
insert into storage.buckets (id, name, public)
values ('album-art', 'album-art', true)
on conflict (id) do nothing;

create policy "anon upload covers" on storage.objects
  for insert to anon with check (bucket_id = 'album-art');
