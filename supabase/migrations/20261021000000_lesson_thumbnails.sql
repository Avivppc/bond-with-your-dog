-- ============================================================
-- Custom lesson thumbnails (Kajabi: "Lesson thumbnail", 1280×720).
--   * lessons.thumbnail_upload_url: an image the team uploaded (public course-images bucket).
--   * lessons.thumbnail_url stays the one column members read; it is the upload when there is
--     one, otherwise the Vimeo thumbnail. A trigger enforces that, so a video save/import that
--     writes the Vimeo thumbnail can never overwrite an uploaded image, and removing the upload
--     falls back to the video's thumbnail.
-- Tests: supabase/tests/lesson_thumbnails.test.sql (npm run test:db)
-- ============================================================

alter table public.lessons
  add column if not exists thumbnail_upload_url text
    check (thumbnail_upload_url is null or thumbnail_upload_url ~ '^https?://');

-- Not secret (a public bucket URL); lessons columns need an explicit grant (see review_hardening).
grant select (thumbnail_upload_url) on public.lessons to anon, authenticated;

create or replace function private.resolve_lesson_thumbnail()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.thumbnail_upload_url is not null then
    new.thumbnail_url := new.thumbnail_upload_url;
  elsif tg_op = 'UPDATE' and old.thumbnail_upload_url is not null then
    -- The upload was removed: show the video's own thumbnail again (or none).
    new.thumbnail_url := (select v.thumbnail_url from public.lesson_videos v where v.lesson_id = new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_resolve_lesson_thumbnail on public.lessons;
create trigger trg_resolve_lesson_thumbnail
  before insert or update of thumbnail_url, thumbnail_upload_url on public.lessons
  for each row execute function private.resolve_lesson_thumbnail();
