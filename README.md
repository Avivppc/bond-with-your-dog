# Keta Tov — Bond With Your Dog

LMS + marketing site for the Keta Tov dog-dance academy.

**Stack:** Next.js 16 (App Router) · React 19 · Tailwind 4 · Supabase (auth + Postgres + RLS) · Mux (video hosting + signed playback).

## Local development

1. Copy env file and fill in keys:
   ```bash
   cp .env.example .env.local
   ```
2. Apply the database schema in Supabase:
   - Open your Supabase project → **SQL editor**
   - Paste the contents of [`supabase/schema.sql`](./supabase/schema.sql) and run it.
3. Install + run:
   ```bash
   npm install
   npm run dev
   ```

Open http://localhost:3000.

## Architecture

### Routes

| Path | Auth | Purpose |
|---|---|---|
| `/` | public | Marketing home |
| `/courses` | public | Catalog (links to `/learn/[id]` to view/enroll) |
| `/community`, `/blog/*` | public | Marketing |
| `/signup`, `/login` | public | Auth (Supabase email + password) |
| `/auth/callback` | public | OAuth/email confirmation handler |
| `/auth/logout` | POST | Sign out |
| `/dashboard` | protected | "My Courses" |
| `/learn/[courseId]` | protected | Course landing + lesson list + enroll |
| `/learn/[courseId]/[lessonId]` | protected | Lesson player (Mux) |
| `/api/lessons/[lessonId]/playback` | protected | Returns signed Mux JWT |

Protected routes are gated by [`src/proxy.ts`](./src/proxy.ts) (Next.js 16's renamed `middleware`).

### Data model

See [`supabase/schema.sql`](./supabase/schema.sql) for the full schema with RLS policies. Tables:

- `profiles` — extends `auth.users` (auto-populated via trigger).
- `courses` — published catalog rows.
- `lessons` — ordered lessons per course; `mux_playback_id` + `mux_playback_policy` (`signed` or `public`); `free_preview` flag.
- `enrollments` — `(user_id, course_id)` unique. Currently free.
- `lesson_progress` — per-user watch progress + completion.

Row-Level Security ensures users can only read/write their own enrollments and progress.

### Video playback (Mux)

1. Upload videos in the Mux dashboard with **playback policy = signed**.
2. Save the `playback_id` on the matching `lessons.mux_playback_id` row.
3. The browser hits `/api/lessons/[lessonId]/playback`, which:
   - verifies the user is signed in,
   - verifies they're enrolled (or the lesson is `free_preview`),
   - signs a short-lived JWT for that playback ID with `MUX_SIGNING_KEY_*`.
4. `<MuxPlayer>` plays the signed URL.

## Deployment

The app is set up for Vercel (`.vercel/` already present).

1. Push to GitHub — already connected to `Avivppc/bond-with-your-dog`.
2. In the Vercel project, set the env vars listed in `.env.example`.
3. Apply `supabase/schema.sql` against the prod Supabase project.
4. Deploy.

## Roadmap (post-v1)

- Stripe Checkout for paid enrollments (currently `enrollments.insert` is open to any signed-in user).
- Blog/CMS (MDX or Sanity).
- Course author admin UI (right now lessons are inserted via SQL).
- Email/social auth providers.
