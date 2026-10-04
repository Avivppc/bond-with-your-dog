-- Admin → Course → Settings → "Duplicate course": a draft copy with everything inside it.
-- One transaction copies the course, its modules and submodules (and the paywall line), lessons,
-- video references and quiz questions. Stored objects (downloads, uploaded lesson thumbnails) are
-- copied by the server afterwards, from the lesson pairs this returns. Students, progress, offers
-- and import references are never copied. Service role only.

create or replace function public.admin_duplicate_course(p_course_id text, p_new_id text, p_new_title text)
returns table (source_lesson_id uuid, copy_lesson_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_source public.courses%rowtype;
  v_module record;
  v_lesson record;
  v_new uuid;
begin
  select * into v_source from public.courses where id = p_course_id;
  if not found then
    raise exception 'course % not found', p_course_id using errcode = 'P0002';
  end if;
  if p_new_id !~ '^[a-z0-9][a-z0-9-]{0,79}$' then
    raise exception 'invalid course id' using errcode = '22023';
  end if;

  insert into public.courses (id, title, description, level, category, price, badge, image, image_alt, published,
                              chapter_number, requires_course_id, what_you_need, before_you_start, trailer_url)
  values (p_new_id, left(p_new_title, 200), v_source.description, v_source.level, v_source.category, v_source.price,
          v_source.badge, v_source.image, v_source.image_alt, false,
          null, v_source.requires_course_id, v_source.what_you_need, v_source.before_you_start, v_source.trailer_url);

  create temp table if not exists dup_modules (old_id uuid primary key, new_id uuid not null) on commit drop;
  create temp table if not exists dup_lessons (old_id uuid primary key, new_id uuid not null) on commit drop;
  truncate dup_modules, dup_lessons;

  for v_module in select * from public.modules where course_id = p_course_id loop
    insert into public.modules (course_id, title, description, position, published)
    values (p_new_id, v_module.title, v_module.description, v_module.position, v_module.published)
    returning id into v_new;
    insert into dup_modules values (v_module.id, v_new);
  end loop;
  -- Submodules point at the copies of their parents.
  update public.modules m
     set parent_id = pm.new_id
    from dup_modules dm
    join public.modules src on src.id = dm.old_id
    join dup_modules pm on pm.old_id = src.parent_id
   where m.id = dm.new_id;

  for v_lesson in select * from public.lessons where course_id = p_course_id loop
    insert into public.lessons (course_id, module_id, position, title, description, duration_seconds, free_preview, kind,
                                available_after_days, pass_threshold, published, body_html, thumbnail_url, key_takeaways,
                                cues, practice_steps, practice_minutes)
    values (p_new_id, (select new_id from dup_modules where old_id = v_lesson.module_id), v_lesson.position, v_lesson.title,
            v_lesson.description, v_lesson.duration_seconds, v_lesson.free_preview, v_lesson.kind, v_lesson.available_after_days,
            v_lesson.pass_threshold, v_lesson.published, v_lesson.body_html,
            -- An uploaded thumbnail is the original's file: the server gives the copy its own one.
            case when v_lesson.thumbnail_upload_url is null then v_lesson.thumbnail_url end, v_lesson.key_takeaways,
            v_lesson.cues, v_lesson.practice_steps, v_lesson.practice_minutes)
    returning id into v_new;
    insert into dup_lessons values (v_lesson.id, v_new);
  end loop;

  insert into public.lesson_videos (lesson_id, provider, external_id, external_hash, playback_policy, duration_seconds, thumbnail_url, source_url)
  select dl.new_id, v.provider, v.external_id, v.external_hash, v.playback_policy, v.duration_seconds, v.thumbnail_url, v.source_url
    from public.lesson_videos v join dup_lessons dl on dl.old_id = v.lesson_id;

  insert into public.quiz_questions (lesson_id, position, prompt, kind, options, correct, explanation)
  select dl.new_id, q.position, q.prompt, q.kind, q.options, q.correct, q.explanation
    from public.quiz_questions q join dup_lessons dl on dl.old_id = q.lesson_id;

  update public.courses
     set paywall_after_module_id = (select new_id from dup_modules where old_id = v_source.paywall_after_module_id)
   where id = p_new_id and v_source.paywall_after_module_id is not null;

  return query select old_id, new_id from dup_lessons;
end;
$$;

revoke all on function public.admin_duplicate_course(text, text, text) from public, anon, authenticated;
grant execute on function public.admin_duplicate_course(text, text, text) to service_role;
