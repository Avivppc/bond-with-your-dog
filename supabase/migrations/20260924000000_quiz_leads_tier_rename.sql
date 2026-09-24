-- ============================================================
-- Rename quiz tiers: movement -> moves, masterpiece -> letsDance
-- Apply via Supabase SQL editor AFTER 20260630000000_quiz_leads.sql
-- ============================================================

alter table public.quiz_leads drop constraint if exists quiz_leads_tier_check;

update public.quiz_leads set tier = 'moves' where tier = 'movement';
update public.quiz_leads set tier = 'letsDance' where tier = 'masterpiece';

alter table public.quiz_leads
  add constraint quiz_leads_tier_check
  check (tier in ('foundations', 'moves', 'letsDance'));
