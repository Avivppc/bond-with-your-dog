-- Friend-brings-friend: codes, attribution, conversion, referrer rewards, refunds.
\set ON_ERROR_STOP 1

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000bf01', 'referrer@test.dev'),
  ('00000000-0000-0000-0000-00000000bf02', 'friend@test.dev'),
  ('00000000-0000-0000-0000-00000000bf03', 'customer-already@test.dev'),
  ('00000000-0000-0000-0000-00000000bf04', 'late-friend@test.dev');

insert into public.offers (id, slug, title, payment_type, price_cents, currency, status) values
  ('bf000000-0000-0000-0000-000000000001', 'rf-course', 'Referral course', 'one_time', 10000, 'USD', 'draft');
insert into public.orders (id, user_id, offer_id, status, amount_cents, currency, provider) values
  ('bf100000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-00000000bf03', 'bf000000-0000-0000-0000-000000000001', 'paid', 10000, 'USD', 'test');

update public.referral_settings set enabled = true, friend_discount_percent = 20, reward_percent = 15, attribution_days = 30;

-- ── Codes ──
select t.login('00000000-0000-0000-0000-00000000bf01');
select t.ok(public.get_or_create_referral_code() ~ '^[a-z0-9]{8}$', 'a student gets a referral code');
select t.ok(public.get_or_create_referral_code() = public.get_or_create_referral_code(), 'the code is stable');
select t.ok(public.claim_referral((select code from public.referral_codes where user_id = '00000000-0000-0000-0000-00000000bf01')) = 'self',
            'you cannot refer yourself');

-- ── Attribution rules ──
select t.login('00000000-0000-0000-0000-00000000bf02');
select t.ok(public.claim_referral('nosuchcode') = 'invalid', 'unknown codes are ignored');
select t.ok(public.claim_referral((select code from public.referral_codes where user_id = '00000000-0000-0000-0000-00000000bf01')) = 'ok',
            'a new friend is attributed to the referrer');
select t.ok(public.claim_referral((select code from public.referral_codes where user_id = '00000000-0000-0000-0000-00000000bf01')) = 'already',
            'a friend is attributed only once');

select t.login('00000000-0000-0000-0000-00000000bf03');
select t.ok(public.claim_referral((select code from public.referral_codes where user_id = '00000000-0000-0000-0000-00000000bf01')) = 'existing_customer',
            'people who already paid are not new friends');

-- Clients can't read or write the referral tables directly.
set role authenticated;
select t.denied($$insert into public.referral_rewards (user_id, percent) values ('00000000-0000-0000-0000-00000000bf03', 100)$$, 'no self-issued rewards');
reset role;

-- ── Conversion: the friend's first paid order rewards the referrer ──
insert into public.orders (id, user_id, offer_id, status, amount_cents, currency, provider, discount_kind, discount_percent) values
  ('bf100000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000bf02', 'bf000000-0000-0000-0000-000000000001', 'paid', 8000, 'USD', 'test', 'friend', 20);
select public.referral_order_paid('bf100000-0000-0000-0000-000000000001');
select public.referral_order_paid('bf100000-0000-0000-0000-000000000001');  -- replay

select t.ok((select status from public.referrals where friend_id = '00000000-0000-0000-0000-00000000bf02') = 'converted', 'the referral converts');
select t.ok((select count(*) from public.referral_rewards where user_id = '00000000-0000-0000-0000-00000000bf01') = 1, 'one reward per converted friend (replays too)');
select t.ok((select percent from public.referral_rewards where user_id = '00000000-0000-0000-0000-00000000bf01') = 15, 'reward uses the configured percent');

select t.login('00000000-0000-0000-0000-00000000bf01');
select t.ok((select friends_converted from public.my_referral_summary()) = 1, 'the referrer sees the conversion');
select t.ok((select rewards_available from public.my_referral_summary()) = 1, 'and an unused reward');
reset role;

-- ── Using the reward on the referrer's own purchase ──
insert into public.orders (id, user_id, offer_id, status, amount_cents, currency, provider, discount_kind, discount_percent, referral_reward_id) values
  ('bf100000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000bf01', 'bf000000-0000-0000-0000-000000000001', 'paid', 8500, 'USD', 'test', 'reward', 15,
   (select id from public.referral_rewards where user_id = '00000000-0000-0000-0000-00000000bf01'));
select public.referral_order_paid('bf100000-0000-0000-0000-000000000002');
select t.ok((select status from public.referral_rewards where user_id = '00000000-0000-0000-0000-00000000bf01') = 'used', 'the reward is used by the purchase');

-- Refunding that purchase gives the reward back.
select public.referral_order_refunded('bf100000-0000-0000-0000-000000000002');
select t.ok((select status from public.referral_rewards where user_id = '00000000-0000-0000-0000-00000000bf01') = 'available', 'refund returns the reward');

-- Refunding the friend's purchase reverses the referral and takes back the unused reward.
select public.referral_order_refunded('bf100000-0000-0000-0000-000000000001');
select t.ok((select status from public.referrals where friend_id = '00000000-0000-0000-0000-00000000bf02') = 'reversed', 'refund reverses the referral');
select t.ok((select status from public.referral_rewards where user_id = '00000000-0000-0000-0000-00000000bf01') = 'revoked', 'and revokes the unused reward');

-- ── The attribution window ──
select t.login('00000000-0000-0000-0000-00000000bf04');
select public.claim_referral((select code from public.referral_codes where user_id = '00000000-0000-0000-0000-00000000bf01'));
reset role;
update public.referrals set created_at = now() - interval '31 days' where friend_id = '00000000-0000-0000-0000-00000000bf04';
insert into public.orders (id, user_id, offer_id, status, amount_cents, currency, provider) values
  ('bf100000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-00000000bf04', 'bf000000-0000-0000-0000-000000000001', 'paid', 10000, 'USD', 'test');
select public.referral_order_paid('bf100000-0000-0000-0000-000000000004');
select t.ok((select status from public.referrals where friend_id = '00000000-0000-0000-0000-00000000bf04') = 'signed_up', 'purchases after the window earn nothing');

select t.ok(not has_function_privilege('authenticated', 'public.referral_order_paid(uuid)', 'execute'), 'only the server settles referrals');
