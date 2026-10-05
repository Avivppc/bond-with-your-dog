-- 1:1 coaching with Roni (Kajabi "Coaching"): members book an open time from Roni's weekly hours,
-- then pay for it. Until online payment for sessions is connected, a booking waits for payment and
-- the team marks it paid in Admin → Coaching → 1:1 sessions.
--   1. coaching_settings     one row: on/off, length, price, Roni's time zone and weekly hours,
--                            notice, how far ahead, meeting link
--   2. coaching_time_off     days Roni isn't available
--   3. coaching_bookings     a time per member; two live bookings can never overlap (exclusion)
--   4. book / cancel / busy  what members may do, checked here; everything else is the server's

-- ── 1. Settings ─────────────────────────────────────────────────────────────
create table if not exists public.coaching_settings (
  id int primary key default 1 check (id = 1),
  enabled boolean not null default false,
  title text not null default '1:1 session with Roni' check (char_length(title) between 1 and 80),
  description text check (char_length(description) <= 1000),
  duration_minutes int not null default 45 check (duration_minutes between 15 and 180),
  buffer_minutes int not null default 15 check (buffer_minutes between 0 and 120),
  price_cents int not null default 15000 check (price_cents > 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  timezone text not null default 'Asia/Jerusalem' check (char_length(timezone) between 3 and 60),
  -- [{ "day": 0-6 (Sunday = 0), "start": "09:00", "end": "13:00" }, …] in Roni's time zone
  weekly jsonb not null default '[]'::jsonb check (jsonb_typeof(weekly) = 'array'),
  min_notice_hours int not null default 24 check (min_notice_hours between 0 and 336),
  max_days_ahead int not null default 30 check (max_days_ahead between 1 and 180),
  cancel_hours int not null default 24 check (cancel_hours between 0 and 336),
  meeting_url text check (meeting_url is null or meeting_url ~ '^https://'),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
insert into public.coaching_settings (id) values (1) on conflict (id) do nothing;
alter table public.coaching_settings enable row level security;
revoke all on public.coaching_settings from anon, authenticated;

-- ── 2. Time off ─────────────────────────────────────────────────────────────
create table if not exists public.coaching_time_off (
  id uuid primary key default gen_random_uuid(),
  starts_on date not null,
  ends_on date not null,
  note text check (char_length(note) <= 120),
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);
alter table public.coaching_time_off enable row level security;
revoke all on public.coaching_time_off from anon, authenticated;

-- ── 3. Bookings ─────────────────────────────────────────────────────────────
create table if not exists public.coaching_bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'awaiting_payment' check (status in ('awaiting_payment', 'confirmed', 'canceled', 'completed')),
  price_cents int not null check (price_cents >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  topic text check (char_length(topic) <= 1000),
  meeting_url text check (meeting_url is null or meeting_url ~ '^https://'),
  paid_at timestamptz,
  canceled_at timestamptz,
  canceled_by text check (canceled_by in ('member', 'team')),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  -- Two live bookings never overlap, however many people click at the same moment.
  constraint coaching_bookings_no_overlap exclude using gist (tstzrange(starts_at, ends_at, '[)') with &&)
    where (status in ('awaiting_payment', 'confirmed'))
);
create index if not exists coaching_bookings_user on public.coaching_bookings (user_id, starts_at desc);
create index if not exists coaching_bookings_upcoming on public.coaching_bookings (starts_at) where status in ('awaiting_payment', 'confirmed');
alter table public.coaching_bookings enable row level security;
revoke all on public.coaching_bookings from anon, authenticated;
grant select on public.coaching_bookings to authenticated;
drop policy if exists coaching_bookings_own on public.coaching_bookings;
create policy coaching_bookings_own on public.coaching_bookings for select to authenticated using (user_id = auth.uid());

-- An unpaid booking holds its time this long; after that the time is free again.
create or replace function private.coaching_hold_expired(p_status text, p_created timestamptz)
returns boolean language sql stable set search_path = '' as $$
  select p_status = 'awaiting_payment' and p_created < now() - interval '48 hours';
$$;

-- ── 4. What members may do ──────────────────────────────────────────────────
-- Booked times (no names) from now on, for the slot picker.
create or replace function public.coaching_busy(p_until timestamptz)
returns table (starts_at timestamptz, ends_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select b.starts_at, b.ends_at
    from public.coaching_bookings b
   where b.status in ('awaiting_payment', 'confirmed')
     and not private.coaching_hold_expired(b.status, b.created_at)
     and b.ends_at > now()
     and b.starts_at < least(p_until, now() + interval '181 days');
$$;

-- Books a time for the signed-in member: it must be one of Roni's open times (weekly hours in her
-- time zone, on the grid of length + buffer, after the notice, within the horizon, not on time off).
create or replace function public.book_coaching_session(p_starts_at timestamptz, p_topic text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  s public.coaching_settings%rowtype;
  v_local timestamp;
  v_day int;
  v_minute int;
  v_ok boolean := false;
  v_window jsonb;
  v_start int;
  v_end int;
  v_step int;
  v_ends timestamptz;
  v_id uuid;
begin
  if v_uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  select * into s from public.coaching_settings where id = 1;
  if not found or not s.enabled then raise exception 'coaching is closed' using errcode = '22023'; end if;
  if p_starts_at < now() + make_interval(hours => s.min_notice_hours) then
    raise exception 'too soon' using errcode = '22023', hint = 'notice';
  end if;
  if p_starts_at > now() + make_interval(days => s.max_days_ahead) then
    raise exception 'too far ahead' using errcode = '22023';
  end if;
  if (select count(*) from public.coaching_bookings
       where user_id = v_uid and status in ('awaiting_payment', 'confirmed') and ends_at > now()
         and not private.coaching_hold_expired(status, created_at)) >= 3 then
    raise exception 'too many upcoming sessions' using errcode = '54000';
  end if;

  v_local := p_starts_at at time zone s.timezone;
  v_day := extract(dow from v_local)::int;
  v_minute := extract(hour from v_local)::int * 60 + extract(minute from v_local)::int;
  if extract(second from v_local) <> 0 then raise exception 'not an open time' using errcode = '22023'; end if;
  if exists (select 1 from public.coaching_time_off t where v_local::date between t.starts_on and t.ends_on) then
    raise exception 'not an open time' using errcode = '22023';
  end if;
  v_step := s.duration_minutes + s.buffer_minutes;
  for v_window in select * from jsonb_array_elements(s.weekly) loop
    if (v_window ->> 'day')::int = v_day then
      v_start := split_part(v_window ->> 'start', ':', 1)::int * 60 + split_part(v_window ->> 'start', ':', 2)::int;
      v_end := split_part(v_window ->> 'end', ':', 1)::int * 60 + split_part(v_window ->> 'end', ':', 2)::int;
      if v_minute >= v_start and v_minute + s.duration_minutes <= v_end and (v_minute - v_start) % v_step = 0 then
        v_ok := true;
      end if;
    end if;
  end loop;
  if not v_ok then raise exception 'not an open time' using errcode = '22023'; end if;

  v_ends := p_starts_at + make_interval(mins => s.duration_minutes);
  -- Unpaid holds older than 48 hours give their time back.
  update public.coaching_bookings
     set status = 'canceled', canceled_at = now(), canceled_by = 'team'
   where status = 'awaiting_payment' and private.coaching_hold_expired(status, created_at)
     and tstzrange(starts_at, ends_at, '[)') && tstzrange(p_starts_at, v_ends, '[)');

  -- No meeting link yet: the team adds it when the session is paid (members can read their own rows).
  insert into public.coaching_bookings (user_id, starts_at, ends_at, price_cents, currency, topic)
  values (v_uid, p_starts_at, v_ends, s.price_cents, s.currency, nullif(left(btrim(p_topic), 1000), ''))
  returning id into v_id;
  return v_id;
exception
  when exclusion_violation then raise exception 'that time was just taken' using errcode = '23P01';
end;
$$;

-- A member cancels their own booking: any time while unpaid, until cancel_hours before once paid.
create or replace function public.cancel_coaching_booking(p_booking_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  b public.coaching_bookings%rowtype;
  v_hours int;
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  select * into b from public.coaching_bookings where id = p_booking_id and user_id = auth.uid() for update;
  if not found or b.status not in ('awaiting_payment', 'confirmed') then
    raise exception 'not a booking you can cancel' using errcode = '42501';
  end if;
  select cancel_hours into v_hours from public.coaching_settings where id = 1;
  if b.status = 'confirmed' and b.starts_at < now() + make_interval(hours => coalesce(v_hours, 24)) then
    raise exception 'too late to cancel' using errcode = '22023';
  end if;
  update public.coaching_bookings set status = 'canceled', canceled_at = now(), canceled_by = 'member' where id = b.id;
end;
$$;

revoke all on function private.coaching_hold_expired(text, timestamptz) from public, anon;
revoke all on function public.coaching_busy(timestamptz) from public, anon;
revoke all on function public.book_coaching_session(timestamptz, text) from public, anon;
revoke all on function public.cancel_coaching_booking(uuid) from public, anon;
grant execute on function public.coaching_busy(timestamptz) to authenticated, service_role;
grant execute on function public.book_coaching_session(timestamptz, text) to authenticated;
grant execute on function public.cancel_coaching_booking(uuid) to authenticated;
