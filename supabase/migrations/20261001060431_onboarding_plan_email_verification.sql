-- Applied directly to production on 2026-10-01 06:04 UTC (from the posthog-site-events work,
-- through the Supabase dashboard/MCP, which stamped it with this version). Its contents live in
-- 20261020000000_onboarding_plan_email_verification.sql, which must run after access_invites
-- (20261003) on a fresh database. This file only keeps the migration history in step with
-- production so `supabase db push` works.
select 1;
