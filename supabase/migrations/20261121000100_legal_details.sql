-- Business details for the legal pages and the payment provider's review (Settings → General):
-- registered name, company / dealer number, postal address and phone. Public to read like the rest
-- of site_settings (they are printed on the Terms page); only the service role writes them.
alter table public.site_settings
  add column if not exists legal_name text not null default '' check (char_length(legal_name) <= 120),
  add column if not exists business_number text not null default '' check (char_length(business_number) <= 40),
  add column if not exists business_address text not null default '' check (char_length(business_address) <= 300),
  add column if not exists business_phone text not null default '' check (char_length(business_phone) <= 40);
