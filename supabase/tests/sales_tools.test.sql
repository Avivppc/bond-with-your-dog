-- Selling tools: coupon rules in the table, one coupon and one upsell per buyer/order, the
-- redemption count, and nothing readable or writable by members.
\set ON_ERROR_STOP 1
begin;
grant usage on schema t to service_role;
grant execute on all functions in schema t to service_role;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000005a1e01', 'buyer1@test.dev'),
  ('00000000-0000-0000-0000-0000005a1e02', 'buyer2@test.dev');
insert into public.offers (id, slug, title, payment_type, price_cents, status) values
  ('5a1e0000-0000-0000-0000-000000000001', 'sales-main', 'Main', 'one_time', 9900, 'published');

-- Coupon rules.
select t.fails_with($$insert into public.coupons (code, percent_off, amount_off_cents) values ('BOTH10', 10, 500)$$, '23514', 'a coupon is a % or an amount, not both');
select t.fails_with($$insert into public.coupons (code, percent_off) values ('lower', 10)$$, '23514', 'codes are upper case');
insert into public.coupons (id, code, percent_off) values ('5a1e0000-0000-0000-0000-0000000000c1', 'SPRING20', 20);
select t.fails_with($$insert into public.coupons (code, amount_off_cents) values ('SPRING20', 500)$$, '23505', 'codes are unique');

-- One coupon per buyer; canceled attempts free it again; pending + paid count as redemptions.
insert into public.orders (user_id, offer_id, status, amount_cents, currency, provider, coupon_id, discount_kind) values
  ('00000000-0000-0000-0000-0000005a1e01', '5a1e0000-0000-0000-0000-000000000001', 'canceled', 7920, 'USD', 'test', '5a1e0000-0000-0000-0000-0000000000c1', 'coupon'),
  ('00000000-0000-0000-0000-0000005a1e01', '5a1e0000-0000-0000-0000-000000000001', 'paid', 7920, 'USD', 'test', '5a1e0000-0000-0000-0000-0000000000c1', 'coupon'),
  ('00000000-0000-0000-0000-0000005a1e02', '5a1e0000-0000-0000-0000-000000000001', 'pending', 7920, 'USD', 'test', '5a1e0000-0000-0000-0000-0000000000c1', 'coupon');
select t.fails_with($$insert into public.orders (user_id, offer_id, status, amount_cents, currency, provider, coupon_id, discount_kind)
                      values ('00000000-0000-0000-0000-0000005a1e01', '5a1e0000-0000-0000-0000-000000000001', 'pending', 7920, 'USD', 'test', '5a1e0000-0000-0000-0000-0000000000c1', 'coupon')$$,
                    '23505', 'a buyer uses a coupon once');
set role service_role;
select t.ok(public.coupon_redemptions('5a1e0000-0000-0000-0000-0000000000c1') = 2, 'paid and fresh pending orders count, canceled ones do not');
select t.ok(public.coupon_redemptions('5a1e0000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000005a1e02') = 1,
            'a buyer''s own unpaid attempt does not count against them');
reset role;

-- The limit holds at insert time: a 2-use coupon with one paid and one fresh pending order is full.
update public.coupons set max_redemptions = 2 where id = '5a1e0000-0000-0000-0000-0000000000c1';
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000005a1e03', 'buyer3@test.dev');
select t.fails_with($$insert into public.orders (user_id, offer_id, status, amount_cents, currency, provider, coupon_id, discount_kind)
                      values ('00000000-0000-0000-0000-0000005a1e03', '5a1e0000-0000-0000-0000-000000000001', 'pending', 7920, 'USD', 'test', '5a1e0000-0000-0000-0000-0000000000c1', 'coupon')$$,
                    '54000', 'a used-up coupon cannot start another order');
update public.coupons set max_redemptions = null where id = '5a1e0000-0000-0000-0000-0000000000c1';

-- One after-purchase upsell per first purchase.
insert into public.orders (id, user_id, offer_id, status, amount_cents, currency, provider) values
  ('5a1e0000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000005a1e02', '5a1e0000-0000-0000-0000-000000000001', 'paid', 9900, 'USD', 'test');
insert into public.orders (user_id, offer_id, status, amount_cents, currency, provider, upsell_of_order_id, discount_kind) values
  ('00000000-0000-0000-0000-0000005a1e02', '5a1e0000-0000-0000-0000-000000000001', 'pending', 4900, 'USD', 'test', '5a1e0000-0000-0000-0000-0000000000a1', 'post_purchase');
select t.fails_with($$insert into public.orders (user_id, offer_id, status, amount_cents, currency, provider, upsell_of_order_id, discount_kind)
                      values ('00000000-0000-0000-0000-0000005a1e02', '5a1e0000-0000-0000-0000-000000000001', 'pending', 4900, 'USD', 'test', '5a1e0000-0000-0000-0000-0000000000a1', 'post_purchase')$$,
                    '23505', 'one upsell per purchase');

-- Members can't see or change coupons, or count redemptions.
set role authenticated;
select t.login('00000000-0000-0000-0000-0000005a1e01');
select t.denied($$select * from public.coupons$$, 'members cannot read coupons');
select t.denied($$select public.coupon_redemptions('5a1e0000-0000-0000-0000-0000000000c1')$$, 'members cannot count redemptions');
reset role;

rollback;
