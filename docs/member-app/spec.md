# Bonded Member App + Kajabi-style admin — build spec

Source design (approved by the client, 2026-10-01): `docs/member-app/design/index.html` (+ `app.css`, `app.js`).
Open it in a browser (images resolve from `/public/app/img` when served by the app; in the raw file they are `img/…`).
Every screen in that file is in scope. **Nothing on screen may be fake**: every button, link, number and
list is backed by real data or a real action. If something truly can't work yet, show the design's empty /
locked state with a real next step — never a dead control, `href="#"`, placeholder copy or made-up numbers.

## Decisions (from the client)
- Payments: our own Paddle checkout (not Kajabi). "Membership & purchases" shows our orders/enrollments.
- Community: keep the in-app community (feed, channels, challenges, meetups, leaderboard) **and** add the
  design's hub: WhatsApp group card (`community_settings.whatsapp_url`), Live Q&A (meetups with
  `kind='live_qa'`, send-a-question-ahead, past recordings), Bonded Stories (support_requests kind `story`).
- Admin must look **exactly like Kajabi** (see "Admin" below). Member app looks exactly like the design.
- All the design's features are built now (practice mode, plan, moves, routine builder, video feedback, studio…).
- English UI. Material Symbols icons. The client's photos in `public/app/img` may be used.

## Stack & conventions (read AGENTS.md: this Next.js has breaking changes — check node_modules/next/dist/docs)
- Next.js 16 App Router, React 19, Tailwind 4, Supabase (RLS + SECURITY DEFINER RPCs), zod v4, vitest.
- Member pages live in `src/app/(member)/…` and render inside `src/app/(member)/layout.tsx` (sidebar, topbar,
  tab bar, `.member-app` scope). Pages return their sections directly (the layout wraps them in `.screen.on`).
- Styling for member pages = the design's classes from `src/styles/member-app.css` (`card`, `btn btn-primary`,
  `h1`, `eyebrow`, `grid-main`, `list-row`, `pill learning|reliable|perform|neutral`, `tip`, `seg`, `chip`, …).
  Copy the markup structure from the design file. Use Tailwind only for tiny gaps the design doesn't cover.
- Shared member components: `src/components/app/ui.tsx` (Ms, Eyebrow, Ring, ProgressLine, LevelPill, Pill,
  Days, StateIc, Dots, Tip, Sketch, ArrowLink, StateCard, Breadcrumbs, formatMinutes), `Sidebar.tsx`,
  `Topbar.tsx`, `DogChip.tsx`, `nav.ts`.
- Current member: `memberViewer()` / `requireMember(next)` from `src/lib/member/viewer.ts` (profile, dogs,
  activeDog, unreadNotifications, isStaff, firstName, initials). Everything dog-specific uses `activeDog`.
- Data access: server components read with `createClient()` (RLS). Member writes: RPCs or RLS-checked
  inserts; validate every input with zod in server actions; return friendly errors. Staff screens: call
  `requireStaff(capability)` first, then `createServiceClient()`.
- Uploads: signed upload URLs from a server action (see `startCommunityUpload` in
  `src/app/(member)/community/actions.ts`) → client `uploadToSignedUrl`. Buckets: `profile-photos` (public,
  5 MB images, path `<uid>/…`), `routine-music` (private, 20 MB audio, path `<uid>/…`), `community-media`.
- Videos to Roni use Mux like `src/app/api/uploads` (needs MUX_TOKEN_ID/SECRET; when missing, show a clear
  "video upload isn't set up yet" state — no 500s).
- Times: render with `src/components/ui/LocalTime.tsx` (viewer's zone).
- Keep files < 400 lines; small components; no `any`; no console.log (console.error with context is fine).
- Tests: pure logic in `src/lib/**` with vitest (`*.test.ts`); DB rules in `supabase/tests/*.test.sql`
  (`npm run test:db`). Run `npx tsc --noEmit`, `npx eslint <your dirs>`, `npx vitest run` before finishing.

## Database (already migrated: `supabase/migrations/20261012000000_member_app.sql`)
profiles: onboarded_at, goals[] (bond|tricks|dance|calm|job|perform), session_minutes (5|10|15),
practice_days smallint[] (0=Sun…6=Sat), active_dog_id, tours_seen[], avatar_url, location, notif_prefs jsonb.
dogs (owner RLS; name, breed, age_group puppy|adult|senior, size, limitations[] joints|injury|other,
limitation_note, photo_url) · moves (slug, name, course_id, lesson_id, cue, summary, steps jsonb[string],
video_url, image_url, loads_joints, gentle_alternative, position, published) · dog_skills (dog, move, level
learning|reliable|performance, set_by member|coach; RPC `set_dog_skill` — members up to reliable) ·
lessons + key_takeaways[], cues[], practice_steps jsonb [{title, body, seconds?, reps?}], practice_minutes ·
courses + chapter_number, requires_course_id ("opens after"), what_you_need jsonb [{icon,label}],
before_you_start, trailer_url · practice_sessions (own; practiced_on, duration_seconds, reps, steps_done,
lesson/move/dog) · practice_plan (own; planned_on, minutes, lesson) · lesson_questions (RPCs
`lesson_questions_for`, `ask_lesson_question`; staff answer via service → notification) · feedback_videos
(+ feedback_notes at_seconds, feedback_messages; RPCs `reply_to_feedback`, `mark_feedback_read`; status
uploading|waiting|replied|errored; setting status=replied notifies + achievement) · notifications (RPC
`mark_notifications_read(null|ids)`; created by triggers `private.notify`) · support_requests (kind
question|bug|story; RPC `submit_support_request`) · community_meetups + kind meetup|live_qa, recording_url,
recording_minutes · community_settings.whatsapp_url · qa_questions (RPC `send_qa_question`) · routines
(own; items jsonb [{move_id, start, end, lane}], music_path) · achievements: first_practice, rhythm_6,
first_feedback, first_routine (+ existing first_lesson, three_lessons, ten_lessons, course_complete) ·
admin RPC `admin_list_people(search, filter all|students|no_course|team|not_onboarded, limit, offset)`.
If you need more schema, add ONE new migration in your reserved range (see ownership) — never edit others.

## Member routes (design screen → route)
| Screen | Route | Owner |
|---|---|---|
| Home / Home day one | `/home` (`/dashboard` redirects) | lead |
| Onboarding (bare) | `/welcome` | lead |
| My Courses | `/my-courses` | lead |
| Course overview | `/learn/[courseId]` | lead |
| Lesson player (+ tabs Overview / Practice steps / Downloads / Questions) | `/learn/[courseId]/[lessonId]` | lead |
| Checkpoint (quiz lessons) · Lesson complete · Certificate | `/learn/…` (quiz) · `/learn/[c]/[l]/complete` · `/certificates/[code]` | lead |
| Profile · Your dogs | `/profile` · `/dogs`, `/dogs/new`, `/dogs/[id]` | lead |
| Community hub (+ existing community pages) | `/community/**` | lead |
| Practice mode | `/practice` (`?lesson=`) | practice agent |
| Weekly plan & history | `/plan` | practice agent |
| Routine builder | `/routine`, `/routine/[id]` | practice agent |
| Moves Library | `/moves` (`?move=slug`) | practice agent |
| Search | `/search?q=` | practice agent |
| Progress & achievements | `/progress` | practice agent |
| Send a video · Your videos · Feedback view | `/feedback/new` · `/feedback` · `/feedback/[id]` | feedback agent |
| Roni's Studio (staff) | `/studio` | feedback agent |
| Notifications | `/notifications` | feedback agent |
| Settings & privacy · Membership | `/settings` · `/membership` | feedback agent |
| Help (FAQ, Ask Roni, report a problem) | `/help` | feedback agent |

## Admin (Kajabi look) — measured from the client's Kajabi, 2026-10-01
Tokens: font Inter 14px · page bg `#f8f8f8` · text `#1a1a19` · muted `#6c6a69` · primary button `#343332`
white text, pill radius 9999px, padding 8px 16px, weight 500, ~38px tall · cards white, ~12px radius,
hairline borders · status pills (Published green / Draft neutral).
Shell: fixed white left sidebar ~217px. Top: site switcher pill ("Bonded Academy"). Nav items are
**top-level entries with icons; groups expand with a chevron** (not static headings). Kajabi's order:
Dashboard · Products ▾ (All Products, Courses, Coaching, Community, Podcasts, Newsletters, Downloads) ·
Sales ▾ (Payments, Pricing/Offers, Cart, Invoices, Coupons, Affiliates) · Website · Marketing ▾ ·
Contacts ▾ (All Contacts, Insights, Assessments) · Analytics ▾ (Analytics, Reports) · Agents · Media Library ·
… · bottom: Settings, Give Feedback. Top bar right: notifications, search, account menu ("Bonded Academy").
Our mapping (only real features): Dashboard · Products ▾ (All Products, Courses, Moves Library, Community) ·
Sales ▾ (Offers, Orders, Referrals) · Coaching ▾ (Roni's Studio, Lesson questions, Live Q&A) ·
Contacts ▾ (All Contacts = People, Leads, Inbox = support requests & stories) · Analytics ▾ (Analytics,
Reports) · bottom: Settings ▾ (Team, Community settings), "View member app".
Dashboard: "Welcome back, {name}." · big card: date-range pill ("Last 7 days"), currency pill, "Customize
metrics" pill, metric select ("Gross revenue"), big number, line chart with "previous period" legend ·
right column small cards: "Net revenue All-time", then others.
Contacts list: title "Contacts" + dark "Add contacts"; tabs "All Contacts | …"; toolbar: segment select,
search "Search contacts", Filters; "Displaying 1–25 of N contacts", pagination, "25 / page", Sort; table:
Name, Email, Email marketing, Lifetime value, Added date, Last activity, ⋯ options.
Offers ("Pricing"): "New Offer"; tabs Offers | Upsells; stat cards (Purchases – last 30 days, Net revenue
– last 30 days, Net revenue – all time); table: Offer title, Products, Price, Qty sold, Net revenue, Status.
Products: "New product"; table: Title (thumb), Members, Created, Type ("Evergreen course", "Access group").
Course page, lesson editor, outline: see `docs/kajabi-research/sources/ui-reference.md`.

## Ownership & rules for parallel work
- lead (main session): member shell, `src/components/app/**`, `src/lib/member/**`, routes marked "lead",
  course import, guided tour. Migrations 2026101200xxxx.
- admin agent: `src/app/admin/**`, `src/lib/admin-nav.ts`, admin components. Migrations 2026101300xxxx.
- practice agent: its routes above + `src/lib/practice/**`. Migrations 2026101400xxxx.
- feedback agent: its routes above + `src/lib/feedback/**`, `src/app/api/feedback/**`, `src/app/api/ask`.
  Migrations 2026101500xxxx.
- Don't edit files you don't own; if you need a change in a shared file (nav, ui.tsx, viewer), make the
  smallest additive change and list it in your final report.
- Never: push, touch production, run `next build` (a dev server runs on :3100), `supabase db reset`,
  edit another owner's migration, use real credentials. Local test users: owner@/editor@/student@/buyer@
  bonded.test (password in scripts/seed-local.sh).
