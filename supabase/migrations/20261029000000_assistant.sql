-- ============================================================
-- "Ask Bonded" AI assistant: members ask about their lessons, visitors ask about the chapters.
--   assistant_settings       singleton: on/off per surface + the owner's tone instructions
--   assistant_conversations  one per chat (a member, or an anonymous visitor cookie)
--   assistant_messages       every question and reply, shown in the admin
-- Server-only: RLS on, no policies, no grants to anon/authenticated (the API uses the service role).
-- Tests: supabase/tests/assistant.test.sql
-- ============================================================

create table if not exists public.assistant_settings (
  id int primary key default 1 check (id = 1),
  members_enabled boolean not null default false,
  sales_enabled boolean not null default false,
  extra_instructions text check (extra_instructions is null or char_length(extra_instructions) <= 2000),
  updated_at timestamptz not null default now()
);
alter table public.assistant_settings enable row level security;
revoke all on public.assistant_settings from anon, authenticated;
insert into public.assistant_settings (id) values (1) on conflict (id) do nothing;

create table if not exists public.assistant_conversations (
  id uuid primary key default gen_random_uuid(),
  mode text not null check (mode in ('member', 'sales')),
  user_id uuid references auth.users(id) on delete cascade,
  visitor_id text check (visitor_id is null or char_length(visitor_id) between 8 and 64),
  lesson_id uuid references public.lessons(id) on delete set null,
  page text check (page is null or char_length(page) <= 300),
  ip_hash text check (ip_hash is null or char_length(ip_hash) <= 128),
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  message_count int not null default 0 check (message_count >= 0),
  handed_off boolean not null default false,
  -- A member chat belongs to a member; a sales chat to a visitor cookie.
  constraint assistant_conversations_owner check (
    (mode = 'member' and user_id is not null) or (mode = 'sales' and visitor_id is not null)
  )
);
create index if not exists assistant_conversations_recent on public.assistant_conversations (last_message_at desc);
create index if not exists assistant_conversations_user on public.assistant_conversations (user_id) where user_id is not null;
create index if not exists assistant_conversations_visitor on public.assistant_conversations (visitor_id) where visitor_id is not null;
create index if not exists assistant_conversations_ip on public.assistant_conversations (ip_hash) where ip_hash is not null;
alter table public.assistant_conversations enable row level security;
revoke all on public.assistant_conversations from anon, authenticated;

create table if not exists public.assistant_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.assistant_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) between 1 and 4000),
  provider text check (provider is null or provider in ('local', 'anthropic')),
  input_tokens int check (input_tokens is null or input_tokens >= 0),
  output_tokens int check (output_tokens is null or output_tokens >= 0),
  created_at timestamptz not null default now()
);
create index if not exists assistant_messages_conversation on public.assistant_messages (conversation_id, created_at);
create index if not exists assistant_messages_recent on public.assistant_messages (created_at desc);
alter table public.assistant_messages enable row level security;
revoke all on public.assistant_messages from anon, authenticated;

-- One question + its reply, saved together with the conversation's counters.
create or replace function public.assistant_record_exchange(
  p_conversation_id uuid,
  p_question text,
  p_reply text,
  p_provider text,
  p_input_tokens int,
  p_output_tokens int,
  p_handed_off boolean
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_now timestamptz := clock_timestamp();
begin
  insert into public.assistant_messages (conversation_id, role, content, created_at)
  values (p_conversation_id, 'user', p_question, v_now);
  insert into public.assistant_messages (conversation_id, role, content, provider, input_tokens, output_tokens, created_at)
  values (p_conversation_id, 'assistant', p_reply, p_provider, p_input_tokens, p_output_tokens, v_now + interval '1 millisecond');
  update public.assistant_conversations
     set message_count = message_count + 2,
         last_message_at = v_now,
         handed_off = handed_off or coalesce(p_handed_off, false)
   where id = p_conversation_id;
end;
$$;

-- Questions asked in the last window, per member / visitor cookie / IP hash (rate limits).
create or replace function public.assistant_usage(p_user_id uuid, p_visitor_id text, p_ip_hash text, p_since timestamptz)
returns table (user_count int, visitor_count int, ip_count int)
language sql stable security definer set search_path = '' as $$
  select
    count(*) filter (where p_user_id is not null and c.user_id = p_user_id)::int,
    count(*) filter (where p_visitor_id is not null and c.visitor_id = p_visitor_id)::int,
    count(*) filter (where p_ip_hash is not null and c.ip_hash = p_ip_hash)::int
  from public.assistant_messages m
  join public.assistant_conversations c on c.id = m.conversation_id
  where m.role = 'user'
    and m.created_at > p_since
    and (c.user_id = p_user_id or c.visitor_id = p_visitor_id or c.ip_hash = p_ip_hash);
$$;

-- The admin list: newest first, with the member's email, the first question and the last reply's provider.
create or replace function public.assistant_conversation_list(p_limit int, p_offset int)
returns table (
  id uuid, mode text, created_at timestamptz, last_message_at timestamptz, message_count int,
  handed_off boolean, user_email text, first_question text, last_provider text
)
language sql stable security definer set search_path = '' as $$
  select c.id, c.mode, c.created_at, c.last_message_at, c.message_count, c.handed_off,
         u.email::text,
         (select m.content from public.assistant_messages m
           where m.conversation_id = c.id and m.role = 'user' order by m.created_at limit 1),
         (select m.provider from public.assistant_messages m
           where m.conversation_id = c.id and m.role = 'assistant' order by m.created_at desc limit 1)
    from public.assistant_conversations c
    left join auth.users u on u.id = c.user_id
   order by c.last_message_at desc, c.id
   limit least(greatest(coalesce(p_limit, 25), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

revoke all on function public.assistant_record_exchange(uuid, text, text, text, int, int, boolean) from public, anon, authenticated;
revoke all on function public.assistant_usage(uuid, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.assistant_conversation_list(int, int) from public, anon, authenticated;
grant execute on function public.assistant_record_exchange(uuid, text, text, text, int, int, boolean) to service_role;
grant execute on function public.assistant_usage(uuid, text, text, timestamptz) to service_role;
grant execute on function public.assistant_conversation_list(int, int) to service_role;
