-- Vinyl Crate: favorites and a wish list.
-- Run in the Supabase SQL editor after 003_multi_user.sql. Safe to re-run.
--
-- A wish-list record is an ordinary row with wanted = true; "Got It" in the
-- app flips it to false, which moves it into the collection. The existing
-- owner-only update policy covers both columns.
alter table public.vinyl_records add column if not exists favorite boolean not null default false;
alter table public.vinyl_records add column if not exists wanted boolean not null default false;
