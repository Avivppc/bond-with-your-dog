-- Member notifications, managed in Admin → Settings → Member notifications: each type can be turned
-- off, kept off the phone (push) or email, reworded with {{tags}}, and (for reminders) timed.
--   1. notification_settings  one row of settings (defaults seeded here; src/lib/notification-settings
--                             holds the same defaults and a test keeps them in step)
--   2. notifications.topic    which type a notification is, so the push sender can honour its switch
--   3. private.notify_topic   the database's notifications (feedback, answers, inbox, achievements)
--                             now read their switch and wording from the settings
--   4. deliver_reminder       records the topic of the reminders the server sends
--   5. claim_push_notifications skips topics whose phone switch is off
--   6. every hour: the reminders job, so each member is reminded at the chosen local hour
-- Settings are read and written by the server (service role); members get no access.

-- ── 1. Settings ─────────────────────────────────────────────────────────────
create table if not exists public.notification_settings (
  id int primary key default 1 check (id = 1),
  settings jsonb not null,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.notification_settings enable row level security;
revoke all on public.notification_settings from anon, authenticated;

insert into public.notification_settings (id, settings)
values (1,
-- seed:start
'{"topics":{"feedback_reply":{"enabled":true,"push":true,"email":true,"title":"Roni replied to your {{video_title}} video","body":"{{notes}}"},"staff_reply":{"enabled":true,"push":true,"email":true,"title":"Roni answered you about {{video_title}}","body":"{{reply}}"},"question_answered":{"enabled":true,"push":true,"email":false,"title":"Roni answered your question","body":"{{question}}"},"support_answered":{"enabled":true,"push":true,"email":true,"title":"Roni''s team replied","body":"{{subject}}"},"achievement":{"enabled":true,"push":false,"email":false,"title":"New achievement: {{achievement}}","body":"{{description}}"},"practice":{"enabled":true,"push":true,"email":true,"title":"{{day}} is a practice day","body":"{{minutes}} minutes with your dog is all it takes. Your plan is ready."},"lesson_unlocked":{"enabled":true,"push":true,"email":false,"title":"A new lesson is open: {{lesson_title}}","body":"{{course_title}}"},"live_session":{"enabled":true,"push":true,"email":true,"title":"{{session}} {{when}}","body":"{{topic}}"},"feedback_overdue":{"enabled":true,"push":true,"email":true,"title":"A feedback video has waited {{days}} days","body":"Open Roni''s Studio to reply."}},"practice":{"when":"day_of","hour":9},"lessonUnlocked":{"hour":9},"liveSession":{"dayBefore":true,"dayBeforeHour":18,"dayOf":true,"hoursBefore":2},"feedbackOverdue":{"days":5}}'::jsonb
-- seed:end
)
on conflict (id) do nothing;

-- ── 2. Topic on each notification ───────────────────────────────────────────
alter table public.notifications add column if not exists topic text check (topic is null or topic ~ '^[a-z_]{1,40}$');

-- ── 3. Wording from the settings ────────────────────────────────────────────
-- Same rules as fillTemplate in TypeScript: {{tag}} → value, leftover tags removed, spacing tidied.
create or replace function private.fill_template(p_text text, p_vars jsonb)
returns text language plpgsql immutable set search_path = '' as $$
declare
  v_key text;
  v_value text;
  v_out text := coalesce(p_text, '');
begin
  for v_key, v_value in select key, value from jsonb_each_text(coalesce(p_vars, '{}'::jsonb)) loop
    v_out := replace(v_out, '{{' || v_key || '}}', coalesce(v_value, ''));
  end loop;
  v_out := regexp_replace(v_out, '\{\{\s*[a-z0-9_]*\s*\}\}', '', 'gi');
  return regexp_replace(regexp_replace(v_out, '\s{2,}', ' ', 'g'), '^\s+|\s+$', '', 'g');
end;
$$;

-- Writes a notification of this topic unless the team switched it off; the member's first name is
-- always available as {{first_name}}.
create or replace function private.notify_topic(p_topic text, p_user uuid, p_kind text, p_vars jsonb, p_href text, p_fallback_title text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_setting jsonb;
  v_vars jsonb;
  v_title text;
  v_body text;
begin
  select settings -> 'topics' -> p_topic into v_setting from public.notification_settings where id = 1;
  if v_setting is not null and coalesce((v_setting ->> 'enabled')::boolean, true) = false then
    return;
  end if;
  v_vars := jsonb_build_object('first_name', coalesce((select split_part(btrim(full_name), ' ', 1) from public.profiles where id = p_user), ''))
            || coalesce(p_vars, '{}'::jsonb);
  v_title := nullif(private.fill_template(v_setting ->> 'title', v_vars), '');
  v_body := nullif(private.fill_template(v_setting ->> 'body', v_vars), '');
  insert into public.notifications (user_id, kind, title, body, href, topic)
  values (p_user, p_kind, left(coalesce(v_title, p_fallback_title), 160), left(v_body, 400), p_href, p_topic);
end;
$$;
revoke all on function private.fill_template(text, jsonb) from public, anon, authenticated;
revoke all on function private.notify_topic(text, uuid, text, jsonb, text, text) from public, anon, authenticated;

create or replace function private.feedback_replied()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_notes int;
begin
  if new.status = 'replied' and old.status is distinct from 'replied' then
    select count(*) into v_notes from public.feedback_notes where video_id = new.id;
    perform private.notify_topic('feedback_reply', new.user_id, 'feedback',
      jsonb_build_object('video_title', new.title,
                         'notes', case when v_notes = 0 then 'A summary from Roni'
                                       when v_notes = 1 then '1 note and a summary'
                                       else v_notes || ' notes and a summary' end),
      '/feedback/' || new.id, 'Roni replied to your video');
    perform private.award_achievement(new.user_id, 'first_feedback');
  end if;
  return new;
end;
$$;

create or replace function private.question_answered()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.answer is not null and old.answer is null then
    perform private.notify_topic('question_answered', new.user_id, 'answer',
      jsonb_build_object('question', left(new.body, 120), 'lesson_title', (select title from public.lessons where id = new.lesson_id)),
      '/learn/' || (select course_id from public.lessons where id = new.lesson_id) || '/' || new.lesson_id || '?tab=questions',
      'Roni answered your question');
  end if;
  return new;
end;
$$;

create or replace function private.support_answered()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.answer is not null and old.answer is null and new.user_id is not null then
    perform private.notify_topic('support_answered', new.user_id, 'support',
      jsonb_build_object('subject', left(coalesce(new.subject, new.body), 120)), '/help', 'Roni''s team replied');
  end if;
  return new;
end;
$$;

create or replace function private.award_achievement(p_user uuid, p_code text)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.achievements (user_id, code) values (p_user, p_code) on conflict do nothing;
  if found then
    perform private.notify_topic('achievement', p_user, 'achievement',
      (select jsonb_build_object('achievement', title, 'description', description) from public.achievement_defs where code = p_code),
      '/progress', 'New achievement');
  end if;
end;
$$;

-- ── 4. Reminders record their topic ─────────────────────────────────────────
drop function if exists public.deliver_reminder(uuid, text, text, text, text, text, text);
create or replace function public.deliver_reminder(
  p_user uuid,
  p_kind text,
  p_ref text,
  p_notice_kind text,
  p_title text,
  p_body text,
  p_href text,
  p_topic text default null
)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  insert into public.reminder_deliveries (user_id, kind, ref)
  values (p_user, p_kind, p_ref)
  on conflict on constraint reminder_deliveries_once do nothing
  returning id into v_id;
  if v_id is null then return false; end if;
  if p_user is not null and p_title is not null then
    insert into public.notifications (user_id, kind, title, body, href, topic)
    values (p_user, p_notice_kind, left(p_title, 160), left(p_body, 400), p_href, p_topic);
  end if;
  return true;
end;
$$;
revoke all on function public.deliver_reminder(uuid, text, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.deliver_reminder(uuid, text, text, text, text, text, text, text) to service_role;

-- ── 5. The phone switch per topic ───────────────────────────────────────────
-- Notifications without a topic (older rows) keep the old rule: everything but achievements.
create or replace function public.claim_push_notifications(p_user uuid, p_window_minutes int, p_limit int)
returns table (id uuid, user_id uuid, kind text, title text, body text, href text)
language sql security definer set search_path = '' as $$
  with settings as (
    select coalesce((select s.settings -> 'topics' from public.notification_settings s where s.id = 1), '{}'::jsonb) as topics
  )
  update public.notifications n
     set pushed_at = now()
   where n.id in (
           select c.id
             from public.notifications c, settings
            where c.pushed_at is null
              and case when c.topic is not null and settings.topics ? c.topic
                       then coalesce((settings.topics -> c.topic ->> 'push')::boolean, true)
                       else c.kind <> 'achievement' end
              and c.created_at > now() - make_interval(mins => greatest(p_window_minutes, 1))
              and (p_user is null or c.user_id = p_user)
            order by c.created_at
            limit greatest(least(p_limit, 1000), 1)
            for update of c skip locked
         )
     and n.pushed_at is null
  returning n.id, n.user_id, n.kind, n.title, n.body, n.href;
$$;
revoke all on function public.claim_push_notifications(uuid, int, int) from public, anon, authenticated;
grant execute on function public.claim_push_notifications(uuid, int, int) to service_role;

-- ── 6. Every hour: the reminders job ────────────────────────────────────────
-- Reuses the Vault secrets the email flows already use; the reminders address sits next to the
-- flows one. Without them (local databases) nothing is called.
create or replace function private.ping_reminders()
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_url text;
  v_secret text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'flows_cron_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'cron_secret';
  if v_url is null or v_secret is null or v_url !~ '/api/cron/flows' then
    raise warning 'member reminders: Vault secrets flows_cron_url / cron_secret are missing or unexpected; reminders only run from the daily Vercel cron';
    return;
  end if;
  perform net.http_get(url := replace(v_url, '/api/cron/flows', '/api/cron/reminders'),
                       headers := jsonb_build_object('Authorization', 'Bearer ' || v_secret),
                       timeout_milliseconds := 60000);
end;
$$;
revoke execute on function private.ping_reminders() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') and exists (select 1 from pg_extension where extname = 'pg_net') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'member-reminders-hourly';
    perform cron.schedule('member-reminders-hourly', '7 * * * *', 'select private.ping_reminders()');
  end if;
end $$;
