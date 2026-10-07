-- Wax Cabinet: owner sign-in.
-- Every record belongs to the user who added it. Anyone can browse; only the
-- owner can add, change or delete their records and cover photos.
--
-- Run this in the Supabase SQL editor AFTER creating your user under
-- Authentication → Users, so your existing records can be assigned to you.

-- 1. Owner column. New rows default to whoever is signed in.
alter table public.vinyl_records
  add column if not exists owner_id uuid references auth.users (id) on delete cascade default auth.uid();

-- Existing records predate sign-in: give them to the first (and for now only) user.
update public.vinyl_records
set owner_id = (select id from auth.users order by created_at limit 1)
where owner_id is null;

create index if not exists vinyl_records_owner_id_idx on public.vinyl_records (owner_id);

-- 2. Replace the old open policies on the table (their names aren't known, so drop them all).
alter table public.vinyl_records enable row level security;

do $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'vinyl_records' loop
    execute format('drop policy %I on public.vinyl_records', p.policyname);
  end loop;
end $$;

create policy "Anyone can browse records" on public.vinyl_records
  for select using (true);
create policy "Owners add records" on public.vinyl_records
  for insert to authenticated with check (owner_id = auth.uid());
create policy "Owners update records" on public.vinyl_records
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Owners delete records" on public.vinyl_records
  for delete to authenticated using (owner_id = auth.uid());

-- 3. Cover photos: still public to view, but uploads and deletes are limited
-- to the signed-in user's own folder (album-art/<user id>/...).
do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and coalesce(qual, '') || coalesce(with_check, '') like '%album-art%'
  loop
    execute format('drop policy %I on storage.objects', p.policyname);
  end loop;
end $$;

create policy "Owners upload covers" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'album-art' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Owners delete covers" on storage.objects
  for delete to authenticated
  using (bucket_id = 'album-art' and (storage.foldername(name))[1] = auth.uid()::text);
