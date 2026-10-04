-- A marketing "yes" keeps its proof (where, from which country, pre-ticked or not); a "no" keeps none.
\set ON_ERROR_STOP 1
begin;

-- Signup trigger: consent and proof come from the signup metadata.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000e1001', 'yes-us@test.dev',
   '{"full_name": "Yes", "marketing_opt_in": true, "marketing_opt_in_source": "signup_form", "marketing_opt_in_country": "us", "marketing_opt_in_prechecked": true}'),
  ('00000000-0000-0000-0000-0000000e1002', 'yes-il@test.dev',
   '{"marketing_opt_in": true, "marketing_opt_in_source": "signup_form", "marketing_opt_in_country": "IL", "marketing_opt_in_prechecked": false}'),
  ('00000000-0000-0000-0000-0000000e1003', 'no@test.dev',
   '{"marketing_opt_in": false, "marketing_opt_in_source": "signup_form", "marketing_opt_in_country": "DE", "marketing_opt_in_prechecked": false}'),
  ('00000000-0000-0000-0000-0000000e1004', 'junk@test.dev',
   '{"marketing_opt_in": true, "marketing_opt_in_source": "carrier-pigeon", "marketing_opt_in_country": "Narnia", "marketing_opt_in_prechecked": "maybe"}'),
  ('00000000-0000-0000-0000-0000000e1005', 'plain@test.dev', '{}');

select t.ok((select marketing_opt_in and marketing_opt_in_at is not null
                    and marketing_opt_in_source = 'signup_form'
                    and marketing_opt_in_country = 'US'
                    and marketing_opt_in_prechecked
               from public.profiles where id = '00000000-0000-0000-0000-0000000e1001'),
            'a yes keeps its source, upper-cased country and the pre-ticked flag');
select t.ok((select marketing_opt_in_country = 'IL' and marketing_opt_in_prechecked = false
               from public.profiles where id = '00000000-0000-0000-0000-0000000e1002'),
            'a yes from an unticked-by-default country says so');
select t.ok((select not marketing_opt_in and marketing_opt_in_at is null and marketing_opt_in_source is null
                    and marketing_opt_in_country is null and marketing_opt_in_prechecked is null
               from public.profiles where id = '00000000-0000-0000-0000-0000000e1003'),
            'a no keeps no proof');
select t.ok((select marketing_opt_in and marketing_opt_in_source is null and marketing_opt_in_country is null
                    and marketing_opt_in_prechecked = false
               from public.profiles where id = '00000000-0000-0000-0000-0000000e1004'),
            'unexpected proof becomes null instead of failing the signup');
select t.ok((select not marketing_opt_in and marketing_opt_in_prechecked is null
               from public.profiles where id = '00000000-0000-0000-0000-0000000e1005'),
            'a signup with no metadata is not a yes');

-- Turning marketing off removes the proof, whoever does it; turning it on never invents any.
update public.profiles set marketing_opt_in = false where id = '00000000-0000-0000-0000-0000000e1001';
select t.ok((select marketing_opt_in_at is null and marketing_opt_in_source is null
                    and marketing_opt_in_country is null and marketing_opt_in_prechecked is null
               from public.profiles where id = '00000000-0000-0000-0000-0000000e1001'),
            'withdrawing consent clears its proof');
update public.profiles set marketing_opt_in = true, marketing_opt_in_at = now() where id = '00000000-0000-0000-0000-0000000e1001';
select t.ok((select marketing_opt_in_source is null and marketing_opt_in_prechecked is null
               from public.profiles where id = '00000000-0000-0000-0000-0000000e1001'),
            'a later yes with no proof stays without proof');

-- The table refuses values outside the allowed ones.
select t.fails_with($$ update public.profiles set marketing_opt_in_source = 'carrier-pigeon'
                        where id = '00000000-0000-0000-0000-0000000e1001' $$, '23514', 'an unknown source is refused');
select t.fails_with($$ update public.profiles set marketing_opt_in_country = 'USA'
                        where id = '00000000-0000-0000-0000-0000000e1001' $$, '23514', 'a country must be an ISO code');

-- A member sees and changes only their own record.
update public.profiles set marketing_opt_in_source = 'settings', marketing_opt_in_prechecked = false
  where id = '00000000-0000-0000-0000-0000000e1001';

set role authenticated;
select t.login('00000000-0000-0000-0000-0000000e1001');
select t.ok((select count(*) = 1 from public.profiles where marketing_opt_in_source is not null), 'a member reads only their own proof');
select t.ok((select count(*) = 0 from public.profiles where id = '00000000-0000-0000-0000-0000000e1002' and marketing_opt_in_source is not null),
            'and not anyone else''s');
reset role;

rollback;
