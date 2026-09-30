-- "1 note", not "1 notes", in the reply notification.
create or replace function private.feedback_replied()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_notes int;
begin
  if new.status = 'replied' and old.status is distinct from 'replied' then
    select count(*) into v_notes from public.feedback_notes where video_id = new.id;
    perform private.notify(new.user_id, 'feedback', 'Roni replied to your ' || new.title || ' video',
                           case when v_notes = 0 then 'A summary from Roni'
                                when v_notes = 1 then '1 note and a summary'
                                else v_notes || ' notes and a summary' end,
                           '/feedback/' || new.id);
    perform private.award_achievement(new.user_id, 'first_feedback');
  end if;
  return new;
end;
$$;
