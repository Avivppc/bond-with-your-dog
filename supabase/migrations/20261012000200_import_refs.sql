-- Where imported content came from (e.g. 'kajabi:2160391204'), so an import never creates duplicates.
alter table public.courses add column if not exists import_ref text;
alter table public.modules add column if not exists import_ref text;
alter table public.lessons add column if not exists import_ref text;
create unique index if not exists courses_import_ref on public.courses (import_ref) where import_ref is not null;
create unique index if not exists modules_import_ref on public.modules (import_ref) where import_ref is not null;
create unique index if not exists lessons_import_ref on public.lessons (import_ref) where import_ref is not null;
-- Not needed by members (lessons columns are granted one by one).
