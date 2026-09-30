-- ============================================================
-- Referral program — "friend brings friend".
--   A student shares /r/<code>. A new friend (no paid orders yet) who arrives through it gets
--   a discount on their first purchase; when that purchase is paid, the referrer earns a reward
--   (a discount on their next purchase). Full refunds undo it.
--   Clients only use the RPCs below; the tables are server-only.
-- Tests: supabase/tests/referrals.test.sql
-- ============================================================

create table if not exists public.referral_settings (
  id int primary key default 1 check (id = 1),
  enabled boolean not null default false,
  friend_discount_percent int not null default 20 check (friend_discount_percent between 0 and 100),
  friend_paddle_discount_id text,
  reward_percent int not null default 20 check (reward_percent between 0 and 100),
  reward_paddle_discount_id text,
  attribution_days int not null default 30 check (attribution_days between 1 and 365),
  description text,
  updated_at timestamptz not null default now()
);
insert into public.referral_settings (id) values (1) on conflict (id) do nothing;

create table if not exists public.referral_codes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  code text not null unique check (code ~ '^[a-z0-9]{6,16}$'),
  created_at timestamptz not null default now()
);

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references auth.users(id) on delete cascade,
  friend_id uuid not null unique references auth.users(id) on delete cascade,
  status text not null default 'signed_up' check (status in ('signed_up', 'converted', 'reversed')),
  order_id uuid references public.orders(id) on delete set null,
  created_at timestamptz not null default now(),
  converted_at timestamptz,
  check (referrer_id <> friend_id)
);
create index if not exists referrals_referrer on public.referrals (referrer_id);

create table if not exists public.referral_rewards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  referral_id uuid unique references public.referrals(id) on delete cascade,
  percent int not null check (percent between 1 and 100),
  status text not null default 'available' check (status in ('available', 'used', 'revoked')),
  used_order_id uuid references public.orders(id) on delete set null,
  created_at timestamptz not null default now(),
  used_at timestamptz
);
create index if not exists referral_rewards_user on public.referral_rewards (user_id) where status = 'available';

alter table public.orders add column if not exists discount_kind text check (discount_kind in ('friend', 'reward'));
alter table public.orders add column if not exists discount_percent int check (discount_percent between 0 and 100);
alter table public.orders add column if not exists referral_reward_id uuid references public.referral_rewards(id) on delete set null;

alter table public.referral_settings enable row level security;
alter table public.referral_codes enable row level security;
alter table public.referrals enable row level security;
alter table public.referral_rewards enable row level security;
revoke all on public.referral_settings, public.referral_codes, public.referrals, public.referral_rewards from anon, authenticated;

-- ── Student RPCs ────────────────────────────────────────────
create or replace function public.get_or_create_referral_code()
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_code text;
begin
  if v_uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  select code into v_code from public.referral_codes where user_id = v_uid;
  if v_code is not null then return v_code; end if;
  loop
    v_code := substr(md5(gen_random_uuid()::text), 1, 8);
    begin
      insert into public.referral_codes (user_id, code) values (v_uid, v_code);
      return v_code;
    exception when unique_violation then
      select code into v_code from public.referral_codes where user_id = v_uid;
      if v_code is not null then return v_code; end if;  -- concurrent call created ours
    end;
  end loop;
end;
$$;

-- Attributes the caller to the code's owner. Returns ok | invalid | self | already | existing_customer.
create or replace function public.claim_referral(p_code text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_referrer uuid;
begin
  if v_uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  select user_id into v_referrer from public.referral_codes where code = lower(p_code);
  if v_referrer is null then return 'invalid'; end if;
  if v_referrer = v_uid then return 'self'; end if;
  if exists (select 1 from public.referrals where friend_id = v_uid) then return 'already'; end if;
  if exists (select 1 from public.orders where user_id = v_uid and status in ('paid', 'refunded') and amount_cents > 0) then
    return 'existing_customer';
  end if;
  insert into public.referrals (referrer_id, friend_id) values (v_referrer, v_uid) on conflict (friend_id) do nothing;
  perform private.emit_event('referral.signed_up', v_uid, 'user', v_referrer::text, '{}'::jsonb);
  return 'ok';
end;
$$;

create or replace function public.my_referral_summary()
returns table (code text, friends_joined bigint, friends_converted bigint, rewards_available bigint, rewards_used bigint, best_reward_percent int)
language sql
stable
security definer
set search_path = public
as $$
  select (select c.code from public.referral_codes c where c.user_id = auth.uid()),
         (select count(*) from public.referrals r where r.referrer_id = auth.uid()),
         (select count(*) from public.referrals r where r.referrer_id = auth.uid() and r.status = 'converted'),
         (select count(*) from public.referral_rewards w where w.user_id = auth.uid() and w.status = 'available'),
         (select count(*) from public.referral_rewards w where w.user_id = auth.uid() and w.status = 'used'),
         (select max(w.percent) from public.referral_rewards w where w.user_id = auth.uid() and w.status = 'available');
$$;

-- ── Server settlement (called by billing after pay / refund) ──
create or replace function public.referral_order_paid(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_settings public.referral_settings%rowtype;
  v_referral public.referrals%rowtype;
begin
  select * into v_order from public.orders where id = p_order_id and status = 'paid';
  if v_order.id is null then return; end if;
  select * into v_settings from public.referral_settings where id = 1;

  -- The buyer used one of their rewards.
  if v_order.referral_reward_id is not null then
    update public.referral_rewards
       set status = 'used', used_order_id = v_order.id, used_at = now()
     where id = v_order.referral_reward_id and user_id = v_order.user_id and status = 'available';
  end if;

  -- The buyer's first paid purchase inside the window converts their referral.
  if v_order.amount_cents > 0 then
    update public.referrals
       set status = 'converted', converted_at = now(), order_id = v_order.id
     where friend_id = v_order.user_id and status = 'signed_up'
       and created_at >= now() - make_interval(days => v_settings.attribution_days)
    returning * into v_referral;
    if v_referral.id is not null then
      if v_settings.enabled and v_settings.reward_percent > 0 then
        insert into public.referral_rewards (user_id, referral_id, percent)
        values (v_referral.referrer_id, v_referral.id, v_settings.reward_percent)
        on conflict (referral_id) do nothing;
      end if;
      perform private.emit_event('referral.converted', v_referral.referrer_id, 'order', v_order.id::text,
                                 jsonb_build_object('friend_id', v_order.user_id));
    end if;
  end if;
end;
$$;

create or replace function public.referral_order_refunded(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referral uuid;
begin
  -- A refunded purchase that used a reward gives it back.
  update public.referral_rewards
     set status = 'available', used_order_id = null, used_at = null
   where used_order_id = p_order_id and status = 'used';

  -- A refunded friend purchase undoes the referral; an unused reward is taken back.
  update public.referrals set status = 'reversed' where order_id = p_order_id and status = 'converted'
  returning id into v_referral;
  if v_referral is not null then
    update public.referral_rewards set status = 'revoked' where referral_id = v_referral and status = 'available';
  end if;
end;
$$;

revoke all on function public.get_or_create_referral_code() from public, anon;
revoke all on function public.claim_referral(text) from public, anon;
revoke all on function public.my_referral_summary() from public, anon;
revoke all on function public.referral_order_paid(uuid) from public, anon, authenticated;
revoke all on function public.referral_order_refunded(uuid) from public, anon, authenticated;
grant execute on function public.get_or_create_referral_code() to authenticated;
grant execute on function public.claim_referral(text) to authenticated;
grant execute on function public.my_referral_summary() to authenticated;
grant execute on function public.referral_order_paid(uuid) to service_role;
grant execute on function public.referral_order_refunded(uuid) to service_role;
