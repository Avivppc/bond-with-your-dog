-- Paywall: offers can grant "limited" access, which only opens content above the course's paywall.
\set ON_ERROR_STOP 1

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000fa01', 'limited@test.dev'),
  ('00000000-0000-0000-0000-00000000fa02', 'full@test.dev'),
  ('00000000-0000-0000-0000-00000000fa03', 'upgrader@test.dev');

insert into public.courses (id, title, description, level, category, price, published) values
  ('pw-course', 'Paywalled', 'd', 'Beginner', 'Foundations', 0, true),
  ('pw-other', 'Other', 'd', 'Beginner', 'Foundations', 0, true);
insert into public.modules (id, course_id, parent_id, title, position, published) values
  ('fa100000-0000-0000-0000-000000000001', 'pw-course', null, 'Intro', 1, true),
  ('fa100000-0000-0000-0000-000000000002', 'pw-course', null, 'Deep dive', 2, true),
  ('fa100000-0000-0000-0000-000000000003', 'pw-course', 'fa100000-0000-0000-0000-000000000002', 'Sub of deep dive', 1, true),
  ('fa100000-0000-0000-0000-000000000009', 'pw-other', null, 'Elsewhere', 1, true);
insert into public.lessons (id, course_id, module_id, position, title, published, free_preview) values
  ('fa200000-0000-0000-0000-000000000001', 'pw-course', 'fa100000-0000-0000-0000-000000000001', 1, 'Above', true, false),
  ('fa200000-0000-0000-0000-000000000002', 'pw-course', 'fa100000-0000-0000-0000-000000000002', 1, 'Below', true, false),
  ('fa200000-0000-0000-0000-000000000003', 'pw-course', 'fa100000-0000-0000-0000-000000000003', 1, 'Below in sub', true, false),
  ('fa200000-0000-0000-0000-000000000004', 'pw-course', 'fa100000-0000-0000-0000-000000000002', 2, 'Below but preview', true, true);

insert into public.offers (id, slug, title, payment_type, price_cents, currency, status) values
  ('fa300000-0000-0000-0000-000000000001', 'pw-taster', 'Taster', 'free', 0, 'USD', 'published'),
  ('fa300000-0000-0000-0000-000000000002', 'pw-full', 'Full', 'free', 0, 'USD', 'published');
insert into public.offer_courses (offer_id, course_id, access_level) values
  ('fa300000-0000-0000-0000-000000000001', 'pw-course', 'limited'),
  ('fa300000-0000-0000-0000-000000000002', 'pw-course', 'full');

-- ── Paywall placement rules ──
select t.fails_with($$update public.courses set paywall_after_module_id = 'fa100000-0000-0000-0000-000000000009' where id = 'pw-course'$$,
                    '23514', 'the paywall module must belong to the same course');
select t.fails_with($$update public.courses set paywall_after_module_id = 'fa100000-0000-0000-0000-000000000003' where id = 'pw-course'$$,
                    '23514', 'the paywall sits between top-level modules, not inside a submodule');
update public.courses set paywall_after_module_id = 'fa100000-0000-0000-0000-000000000001' where id = 'pw-course';

select public.grant_offer_access('00000000-0000-0000-0000-00000000fa01', 'fa300000-0000-0000-0000-000000000001', 'grant', null, null);
select public.grant_offer_access('00000000-0000-0000-0000-00000000fa02', 'fa300000-0000-0000-0000-000000000002', 'grant', null, null);

select t.ok((select access_level from public.enrollments where user_id = '00000000-0000-0000-0000-00000000fa01' and course_id = 'pw-course') = 'limited',
            'a limited offer gives a limited enrollment');

-- ── Limited member: above the paywall only (free previews stay open) ──
select t.login('00000000-0000-0000-0000-00000000fa01');
select t.ok(public.can_access_lesson('fa200000-0000-0000-0000-000000000001'), 'limited member opens content above the paywall');
select t.ok(not public.can_access_lesson('fa200000-0000-0000-0000-000000000002'), 'limited member is stopped below the paywall');
select t.ok(not public.can_access_lesson('fa200000-0000-0000-0000-000000000003'), 'submodules follow their parent module');
select t.ok(public.can_access_lesson('fa200000-0000-0000-0000-000000000004'), 'free previews ignore the paywall');
reset role;

-- ── Full member: everything ──
select t.login('00000000-0000-0000-0000-00000000fa02');
select t.ok(public.can_access_lesson('fa200000-0000-0000-0000-000000000002'), 'full member opens content below the paywall');
reset role;

-- ── Upgrading: a full grant on top of a limited one opens everything; losing it drops back ──
select public.grant_offer_access('00000000-0000-0000-0000-00000000fa03', 'fa300000-0000-0000-0000-000000000001', 'grant', null, null);
select public.grant_offer_access('00000000-0000-0000-0000-00000000fa03', 'fa300000-0000-0000-0000-000000000002', 'grant', null, null);
select t.ok((select access_level from public.enrollments where user_id = '00000000-0000-0000-0000-00000000fa03' and course_id = 'pw-course') = 'full',
            'full access wins over limited');
select public.revoke_offer_access('00000000-0000-0000-0000-00000000fa03', 'fa300000-0000-0000-0000-000000000002', null);
select t.ok((select access_level from public.enrollments where user_id = '00000000-0000-0000-0000-00000000fa03' and course_id = 'pw-course') = 'limited',
            'revoking the full offer drops back to limited');

-- ── Removing the paywall opens the course to limited members ──
update public.courses set paywall_after_module_id = null where id = 'pw-course';
select t.login('00000000-0000-0000-0000-00000000fa01');
select t.ok(public.can_access_lesson('fa200000-0000-0000-0000-000000000002'), 'without a paywall, limited access is the whole course');
reset role;

-- Deleting the paywall module clears the paywall instead of blocking the delete.
update public.courses set paywall_after_module_id = 'fa100000-0000-0000-0000-000000000001' where id = 'pw-course';
delete from public.lessons where module_id = 'fa100000-0000-0000-0000-000000000001';
delete from public.modules where id = 'fa100000-0000-0000-0000-000000000001';
select t.ok((select paywall_after_module_id from public.courses where id = 'pw-course') is null, 'deleting the paywall module removes the paywall');
