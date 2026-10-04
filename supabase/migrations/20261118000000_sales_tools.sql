-- Selling tools (Kajabi parity), all on our side of the checkout; the payment provider charges the
-- order's amount (PayPlus, connected later; the local test provider today).
--   1. coupons                      public codes (e.g. SPRING20): % or amount off, chosen offers,
--                                   dates and a redemption limit (Marketing → Coupons)
--   2. offers: selling tools        order bump, after-purchase upsell, gift, offer to stay
--   3. orders                       which coupon / bump / upsell / gift an order carries
--   4. subscriptions                the offer to stay, once accepted
--   5. access_invites.order_id      a gift for someone without an account remembers its order, so a
--                                   refund can take the access back after they sign up
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

-- How many times a coupon is taken: paid orders, plus unpaid ones from the last hour (a checkout in
-- progress). A buyer's own unpaid attempt doesn't count against them (starting again replaces it).
drop function if exists public.coupon_redemptions(uuid);
create or replace function public.coupon_redemptions(p_coupon_id uuid, p_exclude_user uuid default null)
returns int language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.orders
   where coupon_id = p_coupon_id
     and (status = 'paid'
          or (status = 'pending' and created_at > now() - interval '1 hour'
              and (p_exclude_user is null or user_id <> p_exclude_user)));
$$;
revoke all on function public.coupon_redemptions(uuid, uuid) from public, anon, authenticated;
grant execute on function public.coupon_redemptions(uuid, uuid) to service_role;

-- The limit holds even when several checkouts start at once: each new order with a coupon locks
-- the coupon and counts again before it's saved.
create or replace function private.enforce_coupon_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_max int;
begin
  if new.coupon_id is null or new.status <> 'pending' then return new; end if;
  select max_redemptions into v_max from public.coupons where id = new.coupon_id for update;
  if v_max is not null and public.coupon_redemptions(new.coupon_id, new.user_id) >= v_max then
    raise exception 'coupon used up' using errcode = '54000';
  end if;
  return new;
end;
$$;
drop trigger if exists orders_coupon_limit on public.orders;
create trigger orders_coupon_limit before insert on public.orders
  for each row execute function private.enforce_coupon_limit();

-- ── 5. Gifts for people without an account ──────────────────────────────────
alter table public.access_invites add column if not exists order_id uuid references public.orders(id) on delete set null;

-- Same as before, plus: an invite from a paid order (a gift) grants with that order, so refunding
-- the order takes the access back.
create or replace function public.claim_access_invites()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_invite public.access_invites%rowtype;
  v_count int := 0;
begin
  if v_uid is null then return 0; end if;
  v_email := public.verified_email(v_uid);
  if v_email is null then return 0; end if;

  for v_invite in
    select * from public.access_invites
     where lower(email) = v_email and claimed_at is null
     for update
  loop
    perform public.grant_offer_access(
      v_uid, v_invite.offer_id,
      case when v_invite.order_id is null then 'grant' else 'order' end, v_invite.order_id,
      case when v_invite.days_of_access is null then null else now() + make_interval(days => v_invite.days_of_access) end
    );
    update public.access_invites set claimed_at = now(), claimed_by = v_uid where id = v_invite.id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- ── 4. Subscriptions: the offer to stay ─────────────────────────────────────
alter table public.subscriptions
  add column if not exists retention_percent int check (retention_percent between 1 and 100),
  add column if not exists retention_cycles_left int check (retention_cycles_left >= 0),
  add column if not exists retention_accepted_at timestamptz;
