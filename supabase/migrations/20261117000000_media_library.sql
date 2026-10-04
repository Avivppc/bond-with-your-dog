-- Admin → Website → Media library: every image the team uploaded, in one place.
-- Lists the public image buckets (site-media: website and library uploads; course-images: course
-- covers, lesson thumbnails, images imported from Kajabi), newest first, with a name search and a
-- source filter. Reads storage.objects directly (one query instead of walking every folder).
-- plpgsql so databases without Supabase Storage (tests) still accept the migration. Service role only.

create or replace function public.admin_media_library(p_search text, p_source text, p_limit int, p_offset int)
returns table (bucket text, path text, size_bytes bigint, content_type text, created_at timestamptz, total_count bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return query
    select o.bucket_id::text, o.name::text, (o.metadata ->> 'size')::bigint, (o.metadata ->> 'mimetype')::text, o.created_at,
           count(*) over ()
      from storage.objects o
     where o.bucket_id in ('site-media', 'course-images')
       and coalesce(o.metadata ->> 'mimetype', '') like 'image/%'
       and (p_source is null
            or (p_source = 'website' and o.bucket_id = 'site-media')
            or (p_source = 'courses' and o.bucket_id = 'course-images'))
       and (coalesce(p_search, '') = ''
            or o.name ilike '%' || replace(replace(replace(p_search, '\', '\\'), '%', '\%'), '_', '\_') || '%')
     order by o.created_at desc nulls last
     limit least(greatest(coalesce(p_limit, 60), 1), 200)
    offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

revoke all on function public.admin_media_library(text, text, int, int) from public, anon, authenticated;
grant execute on function public.admin_media_library(text, text, int, int) to service_role;
