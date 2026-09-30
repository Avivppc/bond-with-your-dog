-- Public bucket for course cover images uploaded from the admin (served on marketing pages).
-- Uploads go through server-issued signed upload URLs; no client write policies are added.
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('course-images', 'course-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
    on conflict (id) do update
      set public = true,
          file_size_limit = excluded.file_size_limit,
          allowed_mime_types = excluded.allowed_mime_types;
  end if;
end $$;
