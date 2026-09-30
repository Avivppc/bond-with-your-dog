-- ============================================================
-- Video feedback: members start a "send a video to Roni" upload.
--   start_feedback_video: creates the member's feedback_videos row (status 'uploading') after
--   checking the dog, move and lesson belong to / are open to them, with a daily limit.
--   Mux-derived fields (upload/asset/playback ids, duration, status → waiting) are written by the
--   server with the service role once Mux confirms them, never by the member.
-- Tests: supabase/tests/feedback_uploads.test.sql
-- ============================================================

create or replace function public.start_feedback_video(
  p_dog_id uuid,
  p_move_id uuid,
  p_lesson_id uuid,
  p_title text,
  p_note text
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_title text;
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if p_dog_id is not null and not exists (select 1 from public.dogs where id = p_dog_id and owner_id = auth.uid()) then
    raise exception 'that dog is not yours' using errcode = '42501';
  end if;
  if p_move_id is not null and not exists (select 1 from public.moves where id = p_move_id and published) then
    raise exception 'move not found' using errcode = '22023';
  end if;
  if p_lesson_id is not null and not public.can_access_lesson(p_lesson_id) then
    raise exception 'that lesson is not open to you' using errcode = '42501';
  end if;
  if char_length(coalesce(p_note, '')) > 2000 then
    raise exception 'the note is too long' using errcode = '22023';
  end if;
  -- Failed uploads don't use up the day's allowance.
  if (select count(*) from public.feedback_videos
       where user_id = auth.uid() and status <> 'errored' and created_at > now() - interval '1 day') >= 5 then
    raise exception 'you can send up to 5 videos a day' using errcode = '54000';
  end if;

  v_title := left(coalesce(
    nullif(trim(p_title), ''),
    (select name from public.moves where id = p_move_id),
    (select title from public.lessons where id = p_lesson_id),
    'Training video'
  ), 120);

  insert into public.feedback_videos (user_id, dog_id, move_id, lesson_id, title, note, status)
  values (auth.uid(), p_dog_id, p_move_id, p_lesson_id, v_title, nullif(trim(p_note), ''), 'uploading')
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.start_feedback_video(uuid, uuid, uuid, text, text) from public, anon;
grant execute on function public.start_feedback_video(uuid, uuid, uuid, text, text) to authenticated;
