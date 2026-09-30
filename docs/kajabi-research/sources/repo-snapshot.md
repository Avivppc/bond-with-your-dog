# Repo snapshot — Bond-with-your-dog (2026-09-29)

> Read-only map of this repo taken as the baseline for the Kajabi gap analysis. Reflects the working tree on 2026-09-29 (including uncommitted changes).

## Routes (src/app)
- **Public/marketing** (mostly static, hand-coded): `/`, `/about`, `/courses` (BONDED Method — hard-coded stages), `/courses/kinetic-basics`, `/enroll` (static tiers, no checkout), `/quiz` (lead-capture funnel; `src/lib/quiz/{data,scoring}.ts`), `/chapter/{foundations,movement,masterpiece}` (stubs), `/blog/5-tips-for-better-flow` (single hard-coded post), `/community` (approved public student videos), `/stories`, `/login`, `/signup`, `/auth/callback`, `/auth/logout`.
- **Member:** `/dashboard` (profile, enrollments, progress, achievements, certificates, Sanity academy news), `/training`, `/learn/[courseId]` (outline + inline "Enroll for free" server action), `/learn/[courseId]/[lessonId]` (Mux player, QuizPlayer, drip lock), `/profile` (dog fields; "Paid memberships coming soon").
- **API:** `api/lessons/[lessonId]/playback` (enrollment-gated signed Mux JWT, 4h), `api/quiz/[lessonId]/{questions,submit}`, `api/certificates/[code]` (react-pdf), `api/uploads` + `/[id]/finalize` (Mux direct upload, polled), `api/ask` (Resend), `api/quiz-leads`.
- **Admin** (`ADMIN_EMAILS` env via `requireAdmin()` in `src/lib/admin.ts`; writes via service role): `/admin` (course list + Sync from Sanity), `/admin/courses/new|[id]`, lessons CRUD + quiz-question CRUD, `/admin/videos` (moderation).

## Data model (supabase/migrations)
profiles · courses (text slug id, price, published) · lessons (flat — **no modules**; mux_playback_id, policy, free_preview, kind video|quiz, available_after_days, pass_threshold, resources, expert_tip, sanity_id) · enrollments (no payment ref/expiry/source) · lesson_progress · quiz_questions · quiz_attempts · certificates (auto-issued by trigger) · achievement_defs / achievements (trigger) · student_videos · quiz_leads · sanity_sync_runs · view `my_enrollments`, fn `lesson_unlocks_at()`, `is_admin()` (unused).
**Absent:** payments/orders/offers/coupons/subscriptions, modules, comments/community posts, contacts/tags/segments beyond quiz_leads.
RLS on all tables; own-row policies; courses readable if published; lessons metadata public; quiz questions for enrolled only.

## Integrations
Supabase auth (email+password only) · session refresh in `src/proxy.ts` (Next 16 proxy) · Mux (signed playback for lessons; public for student uploads; no webhooks) · **no payments** (Stripe on README roadmap) · Resend (ask-the-coach + quiz result only) · no analytics · Sanity (`course`, `lesson`, `academyNews`; read via zero-dep client; admin sync mirrors courses/lessons into Supabase) · Vercel hosting.

## Gaps / risks noted
- `enrollments_insert_own` RLS + inline server action → **anyone can self-enroll into any course**; `courses.price` not enforced.
- Two sources of truth for courses/lessons (in-app admin vs Sanity sync overwrites).
- `certificates_verify_by_code` and `achievements_select_public_for_spotlight` use `using (true)` → world-readable rows.
- No RTL / Hebrew (`<html lang="en">`), no i18n lib.
- No email lifecycle (welcome/receipt/drip), `notif_prefs` unused; no webhooks/cron.
- Tests: Vitest, 3 files (~18 cases) on pure helpers only.
