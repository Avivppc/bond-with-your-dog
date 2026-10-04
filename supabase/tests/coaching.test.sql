-- Coaching bookings: only Roni's open times can be booked, never twice, with notice, horizon, time
-- off and a per-member limit; members see and cancel only their own; stale unpaid holds free up.
\set ON_ERROR_STOP 1
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000c0a01', 'coach-a@test.dev'),
  ('00000000-0000-0000-0000-0000000c0a02', 'coach-b@test.dev');

-- Mondays 09:00–12:00 UTC, 45 minutes + 15 buffer: 09:00, 10:00, 11:00.
update public.coaching_settings
   set enabled = true, timezone = 'UTC', duration_minutes = 45, buffer_minutes = 15,
       weekly = '[{"day":1,"start":"09:00","end":"12:00"}]', min_notice_hours = 24, max_days_ahead = 30, price_cents = 15000
 where id = 1;
-- The Monday two weeks from now, always well past the notice and inside the horizon.
create temp table monday as select (date_trunc('week', now() at time zone 'UTC') + interval '14 days') at time zone 'UTC' as day0;
grant select on monday to authenticated;

set role authenticated;
select t.login('00000000-0000-0000-0000-0000000c0a01');
select public.book_coaching_session((select day0 + interval '10 hours' from monday), 'Heelwork');
select t.ok((select status = 'awaiting_payment' and price_cents = 15000 and ends_at - starts_at = interval '45 minutes' and meeting_url is null
               from public.coaching_bookings where user_id = '00000000-0000-0000-0000-0000000c0a01'), 'an open time is booked, waiting for payment, without the link');

select t.fails_with($$select public.book_coaching_session((select day0 + interval '10 hours 30 minutes' from monday), null)$$, '22023', 'off the slot grid');
select t.fails_with($$select public.book_coaching_session((select day0 + interval '12 hours' from monday), null)$$, '22023', 'outside the weekly hours');
select t.fails_with($$select public.book_coaching_session((select day0 + interval '1 day 10 hours' from monday), null)$$, '22023', 'not a coaching day');
select t.fails_with($$select public.book_coaching_session(now() + interval '1 hour', null)$$, '22023', 'too little notice');
select t.fails_with($$select public.book_coaching_session((select day0 + interval '35 days 10 hours' from monday), null)$$, '22023', 'beyond the horizon');

-- Someone else can't take the same time.
select t.login('00000000-0000-0000-0000-0000000c0a02');
select t.fails_with($$select public.book_coaching_session((select day0 + interval '10 hours' from monday), null)$$, '23P01', 'a booked time cannot be booked twice');
select t.ok((select count(*) = 0 from public.coaching_bookings), 'members see only their own bookings');
select t.ok((select count(*) = 1 from public.coaching_busy(now() + interval '60 days')), 'busy times are visible without names');
select t.denied($$select public.cancel_coaching_booking((select id from public.coaching_bookings limit 1))$$, 'cannot cancel someone else''s booking');
select t.denied($$insert into public.coaching_bookings (user_id, starts_at, ends_at, price_cents, currency)
                  values ('00000000-0000-0000-0000-0000000c0a02', now() + interval '3 days', now() + interval '3 days 1 hour', 0, 'USD')$$,
                'members cannot write bookings directly');
reset role;

-- Time off blocks the day.
insert into public.coaching_time_off (starts_on, ends_on) select day0::date, day0::date from monday;
set role authenticated;
select t.login('00000000-0000-0000-0000-0000000c0a02');
select t.fails_with($$select public.book_coaching_session((select day0 + interval '11 hours' from monday), null)$$, '22023', 'a day off cannot be booked');
reset role;
delete from public.coaching_time_off;

-- An unpaid hold older than 48 hours gives its time back.
update public.coaching_bookings set created_at = now() - interval '3 days' where user_id = '00000000-0000-0000-0000-0000000c0a01';
set role authenticated;
select t.login('00000000-0000-0000-0000-0000000c0a02');
select public.book_coaching_session((select day0 + interval '10 hours' from monday), 'My turn');
reset role;
select t.ok((select status = 'canceled' from public.coaching_bookings where user_id = '00000000-0000-0000-0000-0000000c0a01'), 'the stale hold was released');

-- Members cancel their own (a paid one only until cancel_hours before).
set role authenticated;
select t.login('00000000-0000-0000-0000-0000000c0a02');
select public.cancel_coaching_booking((select id from public.coaching_bookings where user_id = '00000000-0000-0000-0000-0000000c0a02'));
select t.ok((select status = 'canceled' and canceled_by = 'member' from public.coaching_bookings where user_id = '00000000-0000-0000-0000-0000000c0a02'), 'a member cancels their own booking');
reset role;

-- Closed: nothing can be booked.
update public.coaching_settings set enabled = false where id = 1;
set role authenticated;
select t.login('00000000-0000-0000-0000-0000000c0a02');
select t.fails_with($$select public.book_coaching_session((select day0 + interval '9 hours' from monday), null)$$, '22023', 'closed coaching takes no bookings');
select t.denied($$select * from public.coaching_settings$$, 'members cannot read the settings table directly');
reset role;

rollback;
