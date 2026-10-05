-- Affiliate discount codes: an affiliate picks their own code (e.g. DANA10) on their page; it's an
-- ordinary coupon tied to them, so it shows in Marketing → Coupons and a purchase with it earns them
-- the commission, link or no link. The team sets how much it takes off, per affiliate.
--   1. affiliates.coupon_percent   what their code takes off (null = no code for this affiliate)
--   2. coupons.affiliate_id        whose code it is; one code per affiliate
-- Only the server reads and writes these (service role), as before.

alter table public.affiliates
  add column if not exists coupon_percent int check (coupon_percent between 1 and 90);

alter table public.coupons
  add column if not exists affiliate_id uuid references public.affiliates(id) on delete cascade;
create unique index if not exists coupons_affiliate_key on public.coupons (affiliate_id) where affiliate_id is not null;
