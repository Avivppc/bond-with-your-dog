-- The media library lists images from the website and course buckets, newest first, with search
-- and a source filter; other buckets and non-images stay out; only the server can read it.
\set ON_ERROR_STOP 1
begin;
grant usage on schema t to service_role;
grant execute on all functions in schema t to service_role;

-- A stand-in for Supabase Storage's table (the test database has no Storage).
create schema if not exists storage;
create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text,
  name text,
  metadata jsonb,
  created_at timestamptz default now()
);
grant usage on schema storage to service_role;

insert into storage.objects (bucket_id, name, metadata, created_at) values
  ('site-media', '2026/hero-dog.jpg', '{"size": 1200, "mimetype": "image/jpeg"}', now() - interval '1 day'),
  ('course-images', 'bonded-foundations/cover.png', '{"size": 900, "mimetype": "image/png"}', now()),
  ('course-images', 'lessons/x/notes.pdf', '{"size": 50, "mimetype": "application/pdf"}', now()),
  ('lesson-files', 'secret/plan.png', '{"size": 10, "mimetype": "image/png"}', now()),
  ('site-media', '2026/rhythm_100%.webp', '{"size": 300, "mimetype": "image/webp"}', now() - interval '2 days');

set role service_role;
create temp table everything as select * from public.admin_media_library(null, null, 50, 0);
select t.ok((select count(*) = 3 from everything), 'images from the two public buckets only');
select t.ok((select path = 'bonded-foundations/cover.png' and total_count = 3 from everything limit 1), 'newest first, with the total');
select t.ok((select count(*) = 2 from public.admin_media_library(null, 'website', 50, 0)), 'website filter');
select t.ok((select count(*) = 1 from public.admin_media_library('cover', null, 50, 0)), 'name search');
select t.ok((select count(*) = 1 from public.admin_media_library('%', null, 50, 0)), 'a % in a search matches only a real %');
select t.ok((select count(*) = 1 from public.admin_media_library('rhythm_100', null, 50, 0)), 'an underscore matches itself');
reset role;

set role authenticated;
select t.denied($$select * from public.admin_media_library(null, null, 10, 0)$$, 'members cannot list the library');
reset role;

rollback;
