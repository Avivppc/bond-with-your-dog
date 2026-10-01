-- Practice sessions save once per client_id; certificates keep the dog's name. Runs in a transaction.
\set ON_ERROR_STOP 1
begin;

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000e7001', 'pc-member@test.dev');
insert into public.profiles (id, full_name) values ('00000000-0000-0000-0000-0000000e7001', 'Dana Cohen')
on conflict (id) do update set full_name = excluded.full_name;
insert into public.dogs (id, owner_id, name) values ('c3000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000e7001', 'Luna');
update public.profiles set active_dog_id = 'c3000000-0000-0000-0000-000000000001' where id = '00000000-0000-0000-0000-0000000e7001';
insert into public.courses (id, title, description, level, category, price, published) values
  ('pc-course', 'Cert course', 'd', 'Beginner', 'Foundations', 0, true);

select t.login('00000000-0000-0000-0000-0000000e7001');
set role authenticated;

insert into public.practice_sessions (user_id, dog_id, client_id, duration_seconds)
values ('00000000-0000-0000-0000-0000000e7001', 'c3000000-0000-0000-0000-000000000001', 'c9000000-0000-0000-0000-000000000001', 300);
insert into public.practice_sessions (user_id, dog_id, client_id, duration_seconds)
values ('00000000-0000-0000-0000-0000000e7001', 'c3000000-0000-0000-0000-000000000001', 'c9000000-0000-0000-0000-000000000001', 300)
on conflict (user_id, client_id) do nothing;
select t.ok((select count(*) from public.practice_sessions where client_id = 'c9000000-0000-0000-0000-000000000001') = 1,
            'a retried save with the same client_id is stored once');
select t.fails_with($$insert into public.practice_sessions (user_id, client_id) values ('00000000-0000-0000-0000-0000000e7001', 'c9000000-0000-0000-0000-000000000001')$$,
                    '23505', 'the same client_id cannot be saved twice');
insert into public.practice_sessions (user_id, duration_seconds) values ('00000000-0000-0000-0000-0000000e7001', 60), ('00000000-0000-0000-0000-0000000e7001', 60);
select t.ok((select count(*) from public.practice_sessions where client_id is null) = 2, 'sessions without a client_id still save');

reset role;
insert into public.certificates (code, user_id, course_id, student_name, course_title)
values ('PC-TEST-1', '00000000-0000-0000-0000-0000000e7001', 'pc-course', 'Dana Cohen', 'Cert course');
select t.ok((select dog_name from public.certificates where code = 'PC-TEST-1') = 'Luna', 'a new certificate takes the active dog''s name');

update public.dogs set name = 'Bella' where id = 'c3000000-0000-0000-0000-000000000001';
select t.ok((select dog_name from public.certificates where code = 'PC-TEST-1') = 'Luna', 'renaming the dog later does not rewrite the certificate');

set role anon;
select t.ok((select dog_name from public.verify_certificate('PC-TEST-1')) = 'Luna', 'public verification shows the dog''s name');
reset role;

rollback;
