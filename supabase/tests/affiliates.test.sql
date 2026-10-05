-- Affiliates: codes are unique lower-case slugs, visits count per day for live codes only, one
-- commission per order, stats add up, and members can't touch any of it.
\set ON_ERROR_STOP 1
begin;
grant usage on schema t to service_role;
grant execute on all functions in schema t to service_role;

insert into public.affiliates (id, name, email, code, commission_percent) values
  ('af000000-0000-0000-0000-000000000001', 'Dana', 'dana@partner.test', 'dana', 20);
insert into public.affiliates (name, email, code, commission_percent, active) values
  ('Off', 'off@partner.test', 'off-partner', 10, false);
select t.fails_with($$insert into public.affiliates (name, email, code, commission_percent) values ('X', 'x@partner.test', 'Bad Code', 10)$$, '23514', 'codes are lower-case slugs');
select t.fails_with($$insert into public.affiliates (name, email, code, commission_percent) values ('Y', 'DANA@partner.test', 'dana2', 10)$$, '23505', 'one affiliate per email');

set role service_role;
select t.ok(public.record_affiliate_visit(' DANA ') = 'af000000-0000-0000-0000-000000000001', 'a live code is found, whatever the case');
select public.record_affiliate_visit('dana');
select t.ok(public.record_affiliate_visit('off-partner') is null, 'a switched-off code counts nothing');
select t.ok(public.record_affiliate_visit('nobody') is null, 'an unknown code counts nothing');
reset role;
select t.ok((select visits = 2 from public.affiliate_visits where affiliate_id = 'af000000-0000-0000-0000-000000000001'), 'visits add up per day');

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000af001', 'aff-buyer@test.dev');
insert into public.offers (id, slug, title, payment_type, price_cents, status) values
  ('af000000-0000-0000-0000-0000000000f1', 'aff-offer', 'Aff offer', 'one_time', 10000, 'published');
insert into public.orders (id, user_id, offer_id, status, amount_cents, currency, provider, affiliate_id) values
  ('af000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000af001', 'af000000-0000-0000-0000-0000000000f1', 'paid', 10000, 'USD', 'test', 'af000000-0000-0000-0000-000000000001'),
  ('af000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000af001', 'af000000-0000-0000-0000-0000000000f1', 'paid', 5000, 'USD', 'test', 'af000000-0000-0000-0000-000000000001');
insert into public.affiliate_commissions (affiliate_id, order_id, base_cents, percent, amount_cents, currency, status) values
  ('af000000-0000-0000-0000-000000000001', 'af000000-0000-0000-0000-0000000000a1', 10000, 20, 2000, 'USD', 'pending'),
  ('af000000-0000-0000-0000-000000000001', 'af000000-0000-0000-0000-0000000000a2', 5000, 20, 1000, 'USD', 'void');
select t.fails_with($$insert into public.affiliate_commissions (affiliate_id, order_id, base_cents, percent, amount_cents, currency)
                      values ('af000000-0000-0000-0000-000000000001', 'af000000-0000-0000-0000-0000000000a1', 10000, 20, 2000, 'USD')$$,
                    '23505', 'one commission per order');

set role service_role;
select t.ok((select visits = 2 and sales = 1 and pending_cents = 2000 and paid_cents = 0 and void_cents = 1000
               from public.affiliate_stats('af000000-0000-0000-0000-000000000001')), 'stats add up (a voided sale is not a sale)');
reset role;

set role authenticated;
select t.login('00000000-0000-0000-0000-0000000af001');
select t.denied($$select * from public.affiliates$$, 'members cannot read affiliates');
select t.denied($$select * from public.affiliate_commissions$$, 'members cannot read commissions');
select t.denied($$select public.record_affiliate_visit('dana')$$, 'members cannot count visits directly');
reset role;

-- Affiliate codes: an ordinary coupon tied to one affiliate, one each, gone with the affiliate.
select t.fails_with($$update public.affiliates set coupon_percent = 95 where code = 'dana'$$, '23514', 'a code takes off at most 90%');
update public.affiliates set coupon_percent = 10 where code = 'dana';
insert into public.coupons (code, percent_off, affiliate_id) values ('DANA10', 10, 'af000000-0000-0000-0000-000000000001');
select t.fails_with($$insert into public.coupons (code, percent_off, affiliate_id) values ('DANA20', 20, 'af000000-0000-0000-0000-000000000001')$$, '23505', 'one code per affiliate');
insert into public.coupons (code, percent_off) values ('SPRING20', 20), ('SUMMER20', 20);
select t.ok((select count(*) = 3 from public.coupons where code in ('DANA10', 'SPRING20', 'SUMMER20')), 'team coupons are not limited to one');
delete from public.affiliate_commissions where affiliate_id = 'af000000-0000-0000-0000-000000000001';
delete from public.affiliates where id = 'af000000-0000-0000-0000-000000000001';
select t.ok((select count(*) = 0 from public.coupons where code = 'DANA10'), 'a removed affiliate''s code goes too');

rollback;
