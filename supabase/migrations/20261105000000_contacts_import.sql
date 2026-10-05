-- Contacts import and export. Imported people without an account (e.g. a Kajabi newsletter list) are
-- "email-only contacts": they can be tagged, campaigns reach them only with their consent (whatever
-- the campaign's own choice), and once they sign up their account's own choices take over.
-- An import never changes an existing member's newsletter choice; an "unsubscribed" in the file is
-- recorded as an unsubscribe, which every email respects.

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  email text not null check (char_length(email) between 3 and 320 and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  full_name text check (char_length(full_name) <= 120),
  marketing_opt_in boolean not null default false,
  -- When and where the newsletter choice above came from (null = no choice recorded).
  consent_at timestamptz,
  consent_source text check (consent_source in ('import')),
  source text not null default 'import' check (source in ('import')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists contacts_email_once on public.contacts (lower(email));
alter table public.contacts enable row level security;
revoke all on public.contacts from anon, authenticated;
-- No policies: only the service role (admin server code) reads and writes it.

-- ── Consent without an account: the newest choice wins (quiz form or import) ────────────────
create or replace function public.can_market(p_user_id uuid, p_email text)
returns boolean language sql stable security definer set search_path = '' as $$
  with who as (
    select coalesce(p_user_id,
                    (select u.id from auth.users u where lower(u.email::text) = lower(p_email) limit 1)) as uid
  )
  select not public.is_unsubscribed(p_user_id, p_email)
     and not public.is_unsubscribed((select uid from who), null)
     and case
       when (select uid from who) is not null then
         coalesce((select p.marketing_opt_in from public.profiles p where p.id = (select uid from who)), false)
       else
         coalesce((select x.opt_in from (
                     select l.marketing_opt_in as opt_in, l.created_at as at
                       from public.quiz_leads l where lower(l.email) = lower(p_email)
                     union all
                     select c.marketing_opt_in, c.consent_at
                       from public.contacts c where lower(c.email) = lower(p_email) and c.consent_at is not null
                   ) x order by x.at desc limit 1), false)
     end;
$$;

-- ── Campaign audiences: "leads" = quiz leads and email-only contacts ─────────────────────────
-- Imported addresses that never gave the site their email are only reached with consent, even
-- when the campaign chose "everyone".
create or replace function public.campaign_audience(p_audience jsonb)
returns table (user_id uuid, email text)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_kind text := coalesce(p_audience->>'kind', 'all_members');
  v_course text := p_audience->>'courseId';
  v_days int := coalesce((p_audience->>'days')::int, 7);
  v_tag text := lower(btrim(coalesce(p_audience->>'tag', '')));
  v_consent boolean := coalesce(p_audience->>'consent', 'marketing') <> 'all';
begin
  return query
  with members as (
    select u.id as user_id, u.email::text as email from auth.users u where u.email is not null
  ), owners as (
    select distinct e.user_id from public.enrollments e
    where e.course_id = v_course and e.access_level = 'full' and (e.expires_at is null or e.expires_at > now())
  ), leads as (
    select q.email, not exists (select 1 from public.quiz_leads l where lower(l.email) = lower(q.email)) as imported_only
      from (
        select distinct on (lower(x.email)) x.email
          from (select l.email, l.created_at from public.quiz_leads l
                union all
                select c.email, c.created_at from public.contacts c) x
         order by lower(x.email), x.created_at desc
      ) q
     where not exists (select 1 from members m where lower(m.email) = lower(q.email))
  ), picked as (
    select m.user_id, m.email, false as imported_only from members m where v_kind in ('all_members', 'everyone')
    union
    select m.user_id, m.email, false from members m where v_kind = 'owns_chapter' and m.user_id in (select o.user_id from owners o)
    union
    select m.user_id, m.email, false from members m where v_kind = 'not_owns_chapter' and m.user_id not in (select o.user_id from owners o)
    union
    select m.user_id, m.email, false from members m where v_kind = 'completed_chapter' and exists (
      select 1 from public.certificates c where c.user_id = m.user_id and c.course_id = v_course)
    union
    select m.user_id, m.email, false from members m where v_kind = 'inactive_practice'
      and exists (select 1 from public.enrollments e where e.user_id = m.user_id and (e.expires_at is null or e.expires_at > now()))
      and not exists (select 1 from public.practice_sessions s where s.user_id = m.user_id and s.practiced_on > current_date - v_days)
    union
    select null::uuid, l.email, l.imported_only from leads l where v_kind in ('quiz_leads', 'everyone')
    union
    select m.user_id, m.email, false from members m where v_kind = 'has_tag'
      and exists (select 1 from public.contact_tags t where t.tag = v_tag and lower(t.email) = lower(m.email))
    union
    select null::uuid, l.email, l.imported_only from leads l where v_kind = 'has_tag'
      and exists (select 1 from public.contact_tags t where t.tag = v_tag and lower(t.email) = lower(l.email))
  )
  select p.user_id, p.email from picked p where public.can_email(p.user_id, p.email, v_consent or p.imported_only);
end;
$$;

-- ── Import one batch ─────────────────────────────────────────────────────────────────────────
-- p_rows: [{email, name?, subscribed?: boolean|null, unsubscribed?: boolean, tags?: [text]}].
--  * subscribed true/false: the newsletter choice for an email-only contact (with today as its date).
--  * unsubscribed true: the person opted out in the source system; recorded as an unsubscribe.
--  * Members keep their own newsletter choice; only a missing name is filled in.
-- Tags arrive normalized; anything that doesn't fit the tag rule is dropped.
create or replace function public.admin_import_contacts(p_rows jsonb, p_staff uuid)
returns table (contacts_created int, contacts_updated int, members_matched int, tags_added int, unsubscribes_added int)
language plpgsql security definer set search_path = '' as $$
declare
  v_created int := 0;
  v_updated int := 0;
  v_members int := 0;
  v_tags int := 0;
  v_unsubs int := 0;
begin
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 500 then
    raise exception 'between 0 and 500 rows per batch' using errcode = '22023';
  end if;

  with rows as (
    -- The first row wins when an email appears twice.
    select distinct on (lower(btrim(r->>'email'))) lower(btrim(r->>'email')) as email,
           left(nullif(btrim(r->>'name'), ''), 120) as full_name,
           case when (r->>'unsubscribed') = 'true' then false
                when jsonb_typeof(r->'subscribed') = 'boolean' then (r->>'subscribed')::boolean end as subscribed
      from jsonb_array_elements(p_rows) with ordinality as x(r, ord)
     where btrim(r->>'email') ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' and char_length(btrim(r->>'email')) <= 320
     order by lower(btrim(r->>'email')), ord
  ), matched as (
    select r.*, (select u.id from auth.users u where lower(u.email::text) = r.email limit 1) as user_id
      from rows r
  ), named as (
    update public.profiles p
       set full_name = m.full_name
      from matched m
     where m.user_id = p.id and m.full_name is not null and coalesce(btrim(p.full_name), '') = ''
    returning p.id
  ), upserted as (
    insert into public.contacts as c (email, full_name, marketing_opt_in, consent_at, consent_source, created_by)
    select m.email, m.full_name, coalesce(m.subscribed, false),
           case when m.subscribed is not null then now() end,
           case when m.subscribed is not null then 'import' end,
           p_staff
      from matched m where m.user_id is null
    on conflict ((lower(email))) do update
       set full_name = coalesce(excluded.full_name, c.full_name),
           marketing_opt_in = case when excluded.consent_at is null then c.marketing_opt_in else excluded.marketing_opt_in end,
           consent_at = coalesce(excluded.consent_at, c.consent_at),
           consent_source = coalesce(excluded.consent_source, c.consent_source),
           updated_at = now()
    returning (xmax = 0) as inserted
  )
  select count(*) filter (where inserted), count(*) filter (where not inserted),
         (select count(*) from matched where user_id is not null)
    into v_created, v_updated, v_members
    from upserted;

  insert into public.email_unsubscribes (user_id, email, source)
  select distinct on (lower(btrim(r->>'email')))
         (select u.id from auth.users u where lower(u.email::text) = lower(btrim(r->>'email')) limit 1),
         lower(btrim(r->>'email')), 'import'
    from jsonb_array_elements(p_rows) r
   where (r->>'unsubscribed') = 'true'
     and btrim(r->>'email') ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  on conflict do nothing;
  get diagnostics v_unsubs = row_count;

  insert into public.contact_tags (email, user_id, tag, source)
  select distinct on (lower(btrim(r->>'email')), t.tag)
         lower(btrim(r->>'email')), u.id, t.tag, 'import'
    from jsonb_array_elements(p_rows) r
    cross join lateral jsonb_array_elements_text(case when jsonb_typeof(r->'tags') = 'array' then r->'tags' else '[]'::jsonb end) as t(tag)
    left join lateral (select u.id from auth.users u where lower(u.email::text) = lower(btrim(r->>'email')) limit 1) u on true
   where btrim(r->>'email') ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
     and t.tag ~ '^[a-z0-9][a-z0-9 -]{0,39}$'
  on conflict do nothing;
  get diagnostics v_tags = row_count;

  return query select v_created, v_updated, v_members, v_tags, v_unsubs;
end;
$$;

-- ── Email-only contacts for the Leads page (people who signed up since are left out) ──────────
create or replace function public.admin_list_email_contacts(p_search text, p_limit int, p_offset int)
returns table (id uuid, email text, full_name text, marketing_opt_in boolean, created_at timestamptz, tags text[], total bigint)
language sql stable security definer set search_path = '' as $$
  with list as (
    select c.* from public.contacts c
     where not exists (select 1 from auth.users u where lower(u.email::text) = lower(c.email))
       and (coalesce(p_search, '') = ''
            or c.email ilike '%' || replace(replace(replace(p_search, '\', '\\'), '%', '\%'), '_', '\_') || '%'
            or c.full_name ilike '%' || replace(replace(replace(p_search, '\', '\\'), '%', '\%'), '_', '\_') || '%')
  )
  select l.id, l.email, l.full_name, l.marketing_opt_in and not public.is_unsubscribed(null, l.email), l.created_at,
         array(select t.tag from public.contact_tags t where lower(t.email) = lower(l.email) order by t.tag),
         count(*) over ()
    from list l
   order by l.created_at desc, l.email
   limit least(greatest(coalesce(p_limit, 50), 1), 200) offset greatest(coalesce(p_offset, 0), 0);
$$;

-- ── Export: every account and every email-only contact, a page at a time ────────────────────
create or replace function public.admin_export_contacts(p_limit int, p_offset int)
returns table (
  kind text, email text, full_name text, subscribed boolean, unsubscribed boolean,
  created_at timestamptz, last_sign_in_at timestamptz, tags text, chapters text
)
language sql stable security definer set search_path = '' as $$
  select * from (
    select 'member'::text as kind, u.email::text as email, p.full_name, coalesce(p.marketing_opt_in, false) as subscribed,
           public.is_unsubscribed(u.id, u.email::text) as unsubscribed,
           u.created_at, u.last_sign_in_at,
           (select string_agg(t.tag, '; ' order by t.tag) from public.contact_tags t where lower(t.email) = lower(u.email::text)) as tags,
           (select string_agg(co.title, '; ' order by co.chapter_number nulls last, co.title)
              from public.enrollments e join public.courses co on co.id = e.course_id
             where e.user_id = u.id and e.access_level = 'full' and (e.expires_at is null or e.expires_at > now())) as chapters
      from auth.users u left join public.profiles p on p.id = u.id
     where u.email is not null
    union all
    select 'email only', c.email, c.full_name, c.marketing_opt_in, public.is_unsubscribed(null, c.email),
           c.created_at, null,
           (select string_agg(t.tag, '; ' order by t.tag) from public.contact_tags t where lower(t.email) = lower(c.email)),
           null
      from public.contacts c
     where not exists (select 1 from auth.users u where lower(u.email::text) = lower(c.email))
  ) everyone
  order by everyone.created_at desc, lower(everyone.email)
  limit least(greatest(coalesce(p_limit, 1000), 1), 1000) offset greatest(coalesce(p_offset, 0), 0);
$$;

revoke all on function public.admin_import_contacts(jsonb, uuid) from public, anon, authenticated;
revoke all on function public.admin_list_email_contacts(text, int, int) from public, anon, authenticated;
revoke all on function public.admin_export_contacts(int, int) from public, anon, authenticated;
grant execute on function public.admin_import_contacts(jsonb, uuid) to service_role;
grant execute on function public.admin_list_email_contacts(text, int, int) to service_role;
grant execute on function public.admin_export_contacts(int, int) to service_role;
