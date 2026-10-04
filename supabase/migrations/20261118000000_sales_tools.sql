-- Selling tools (Kajabi parity), all on our side of the checkout; the payment provider charges the
-- order's amount (PayPlus, connected later; the local test provider today).
--   1. coupons                      public codes (e.g. SPRING20): % or amount off, chosen offers,
--                                   dates and a redemption limit (Marketing → Coupons)
--   2. offers: selling tools        order bump, after-purchase upsell, gift, offer to stay
--   3. orders                       which coupon / bump / upsell / gift an order carries
--   4. subscriptions                the offer to stay, once accepted
-- Only the server writes any of it (service role); offers stay readable as before.

-- ── 1. Coupons ──────────────────────────────────────────────────────────────
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null check (code ~ '^[A-Z0-9][A-Z0-9_-]{2,39}$'),
  percent_off int check (percent_off between 1 and 100),
  amount_off_cents int check (amount_off_cents > 0),
  offer_ids uuid[] not null default '{}',
  max_redemptions int check (max_redemptions > 0),
  starts_at timestamptz,
  expires_at timestamptz,
  active boolean not null default true,
  note text check (char_length(note) <= 200),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  -- Exactly one kind of discount.
  check ((percent_off is null) <> (amount_off_cents is null)),
  check (expires_at is null or starts_at is null or expires_at > starts_at)
);
create unique index if not exists coupons_code_key on public.coupons (code);
alter table public.coupons enable row level security;
revoke all on public.coupons from anon, authenticated;

-- ── 2. Offers ───────────────────────────────────────────────────────────────
alter table public.offers
  add column if not exists bump_offer_id uuid references public.offers(id) on delete set null,
  add column if not exists bump_price_cents int check (bump_price_cents > 0),
  add column if not exists bump_headline text check (char_length(bump_headline) <= 120),
  add column if not exists bump_text text check (char_length(bump_text) <= 400),
  add column if not exists upsell_offer_id uuid references public.offers(id) on delete set null,
  add column if not exists upsell_price_cents int check (upsell_price_cents > 0),
  add column if not exists upsell_headline text check (char_length(upsell_headline) <= 120),
  add column if not exists upsell_text text check (char_length(upsell_text) <= 600),
  add column if not exists giftable boolean not null default false,
  add column if not exists retention_percent int check (retention_percent between 1 and 100),
  add column if not exists retention_cycles int check (retention_cycles between 1 and 12);

-- ── 3. Orders ───────────────────────────────────────────────────────────────
alter table public.orders
  add column if not exists coupon_id uuid references public.coupons(id) on delete set null,
  -- No foreign key on purpose: a second orders→offers link would make every "orders with their
  -- offer" query ambiguous. The bump offer is checked when the order is made.
  add column if not exists bump_offer_id uuid,
  add column if not exists bump_amount_cents int check (bump_amount_cents >= 0),
  add column if not exists upsell_of_order_id uuid references public.orders(id) on delete set null,
  add column if not exists gift_recipient_email text check (char_length(gift_recipient_email) between 3 and 254),
  add column if not exists gift_recipient_name text check (char_length(gift_recipient_name) between 1 and 60),
  add column if not exists gift_message text check (char_length(gift_message) <= 500),
  add column if not exists gift_delivered_at timestamptz;

alter table public.orders drop constraint if exists orders_discount_kind_check;
alter table public.orders add constraint orders_discount_kind_check
  check (discount_kind = any (array['friend', 'reward', 'upsell', 'coupon', 'post_purchase']));

-- A buyer uses a coupon once (a canceled or failed attempt doesn't count).
create unique index if not exists orders_one_coupon_per_buyer
  on public.orders (user_id, coupon_id) where coupon_id is not null and status in ('pending', 'paid');
-- One after-purchase upsell per first purchase.
create unique index if not exists orders_one_upsell_per_order
  on public.orders (upsell_of_order_id) where upsell_of_order_id is not null and status in ('pending', 'paid');
create index if not exists orders_coupon on public.orders (coupon_id) where coupon_id is not null;

-- How many times a coupon is taken: paid orders, plus unpaid ones from the last day (a checkout in progress).
create or replace function public.coupon_redemptions(p_coupon_id uuid)
returns int language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.orders
   where coupon_id = p_coupon_id
     and (status = 'paid' or (status = 'pending' and created_at > now() - interval '1 day'));
$$;
revoke all on function public.coupon_redemptions(uuid) from public, anon, authenticated;
grant execute on function public.coupon_redemptions(uuid) to service_role;

-- ── 4. Subscriptions: the offer to stay ─────────────────────────────────────
alter table public.subscriptions
  add column if not exists retention_percent int check (retention_percent between 1 and 100),
  add column if not exists retention_cycles_left int check (retention_cycles_left >= 0),
  add column if not exists retention_accepted_at timestamptz;
