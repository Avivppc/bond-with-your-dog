-- Fixes for the Supabase security advisor (database linter) findings of 2026-10-01.

-- ============================================================
-- 1. my_enrollments ran as its owner (postgres, which owns enrollments and so skips its RLS)
--    and is a simple, auto-updatable view that anon/authenticated held full DML on. A signed-in
--    user could UPDATE or DELETE their own enrollment rows through it — e.g. swap a free course
--    for a paid one — even though direct writes to enrollments are refused. Nothing in the app
--    reads it; keep it as a read-only helper that runs with the caller's grants and RLS.
-- ============================================================
alter view public.my_enrollments set (security_invoker = true);
revoke all on public.my_enrollments from public, anon, authenticated;
grant select on public.my_enrollments to authenticated;

-- ============================================================
-- 2. Trigger-only SECURITY DEFINER functions should not be reachable at /rest/v1/rpc.
--    Triggers fire without an EXECUTE check, so signup (handle_new_user on auth.users) and
--    achievements (award_achievements on lesson_progress) keep working.
--
--    Deliberately left executable by anon:
--    - can_access_lesson, current_staff_role, is_module_live: evaluated by the TO public read
--      policies on courses, lessons, modules, offers, offer_courses, lesson_files and
--      quiz_questions, so logged-out visitors can browse the catalog.
--    - verify_certificate: backs the public certificate page and PDF route.
-- ============================================================
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.award_achievements() from public, anon, authenticated;

-- ============================================================
-- 3. Pin search_path on functions that left it role-mutable. Every body already
--    schema-qualifies its references, so an empty path changes nothing at runtime.
-- ============================================================
alter function public.is_admin() set search_path = '';
alter function public.lesson_unlocks_at(uuid, uuid) set search_path = '';
alter function private.check_module_structure() set search_path = '';
alter function private.check_lesson_module() set search_path = '';
alter function private.backfill_default_modules() set search_path = '';
alter function private.guard_student_video_approval() set search_path = '';
alter function private.forbid_event_changes() set search_path = '';
alter function private.community_post_live(text, timestamptz) set search_path = '';
alter function private.recording_chapters_valid(jsonb) set search_path = '';
alter function private.support_media_paths_valid(uuid, text, text[]) set search_path = '';
