import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { claimPendingAccess } from "@/lib/access";
import { formatOfferPrice, type PricedOffer } from "@/lib/pricing";
import { loadStudentCourse, type StudentCourse, type StudentLesson } from "@/lib/student-course-server";
import type { CourseOutline } from "@/lib/course-outline";
import { LearnLayout } from "@/components/learn/LearnLayout";
import { LEARN, ProgressBar } from "@/components/learn/CourseSidebar";
import { CourseLessonRow } from "./CourseLessonRow";

export const dynamic = "force-dynamic";

type PublishedOffer = PricedOffer & { slug: string; title: string; status: string };

const PILL_ORANGE = "inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:brightness-95";

export default async function CourseHomePage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ enroll?: string; tab?: string }>;
}) {
  const { courseId } = await params;
  const { enroll, tab } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/learn/${courseId}`);
  await claimPendingAccess(supabase);

  const data = await loadStudentCourse(supabase, courseId, user.id);
  if (!data) notFound();
  const { course, outline, lessons, enrolledAt, progress } = data;
  // Staff previews see the member view, like Kajabi's preview mode.
  const isMember = Boolean(enrolledAt) || data.isStaffPreview;

  // Visitors see every offer for the course; limited members only the ones that unlock all of it.
  const needsOffers = !isMember || data.isLimited;
  const [{ data: profile }, { data: offerLinks }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
    needsOffers
      ? supabase.from("offer_courses").select("access_level, offers(slug, title, payment_type, price_cents, currency, interval, status)").eq("course_id", courseId)
      : Promise.resolve({ data: [] }),
  ]);
  const offers = (offerLinks ?? [])
    .filter((l) => !data.isLimited || l.access_level === "full")
    .flatMap((l) => (l.offers ? [l.offers as unknown as PublishedOffer] : []))
    .filter((o) => o.status === "published");
  const firstName = profile?.full_name?.split(" ")[0] || "friend";
  const numberOf = new Map(lessons.map((l, i) => [l.id, i + 1]));
  const next = progress.next ?? lessons[0] ?? null;
  const showMap = tab === "map";

  async function enrollFree() {
    "use server";
    const sb = await createClient();
    // enroll_free() refuses courses that are sold in a paid offer (see review_hardening migration).
    const { error } = await sb.rpc("enroll_free", { p_course_id: courseId });
    if (error) {
      console.error("enroll_free failed", { courseId, error: error.message });
      redirect(`/learn/${courseId}?enroll=failed`);
    }
    redirect(`/learn/${courseId}`);
  }

  return (
    <LearnLayout data={data} variant="home">
      <section className="relative overflow-hidden rounded-[2rem] p-7 text-white shadow-sm sm:p-9" style={{ backgroundColor: LEARN.teal }}>
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10" aria-hidden />
        <p className="text-[11px] font-bold uppercase tracking-widest text-white/75">{isMember ? "Member dashboard" : `${course.category} · ${course.level}`}</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl" style={{ fontFamily: "var(--font-headline)" }}>
          {isMember ? `Welcome back, ${firstName}` : course.title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-white/85 sm:text-base">{course.description}</p>

        {isMember ? (
          <div className="mt-6 flex flex-wrap items-end justify-between gap-5">
            <div className="w-full max-w-sm space-y-1.5">
              <div className="flex justify-between text-xs text-white/80">
                <span>
                  {progress.completed} of {progress.total} lessons complete
                </span>
                <span className="font-bold text-white">{progress.percent}%</span>
              </div>
              <ProgressBar percent={progress.percent} onDark />
            </div>
            {next && (
              <Link href={`/learn/${courseId}/${next.id}`} className={PILL_ORANGE} style={{ backgroundColor: LEARN.orange }}>
                {progress.completed === 0 ? "Start training" : progress.next ? "Continue training" : "Watch again"} →
              </Link>
            )}
          </div>
        ) : (
          <GetAccess courseId={courseId} isFree={course.price === 0} offers={offers} enrollFailed={enroll === "failed"} enrollFree={enrollFree} />
        )}
      </section>

      {data.isLimited && data.paywallAfterModuleId && (
        <section id="upgrade" className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-[1.5rem] bg-white p-6 shadow-sm">
          <div>
            <p className="text-xs font-bold" style={{ color: LEARN.orange }}>
              You have limited access
            </p>
            <h2 className="mt-1 text-lg font-extrabold" style={{ fontFamily: "var(--font-headline)" }}>
              Unlock the full course
            </h2>
            <p className="text-sm" style={{ color: LEARN.muted }}>
              Lessons marked with a lock are part of the full course.
            </p>
          </div>
          {offers.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {offers.map((o) => (
                <Link key={o.slug} href={`/checkout/${o.slug}`} className={PILL_ORANGE} style={{ backgroundColor: LEARN.orange }}>
                  {o.title} — {formatOfferPrice(o)}
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm" style={{ color: LEARN.muted }}>
              Ask us about upgrading.
            </p>
          )}
        </section>
      )}

      <nav className="mt-6 inline-flex rounded-full bg-white p-1 shadow-sm" aria-label="Course sections">
        {[
          { label: "Home", href: `/learn/${courseId}`, active: !showMap },
          { label: "Course map", href: `/learn/${courseId}?tab=map`, active: showMap },
        ].map((t) => (
          <Link
            key={t.label}
            href={t.href}
            aria-current={t.active ? "page" : undefined}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${t.active ? "text-white" : "hover:bg-[#f3f9fd]"}`}
            style={t.active ? { backgroundColor: LEARN.teal } : { color: LEARN.muted }}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {showMap ? (
        <CourseMap courseId={courseId} data={data} numberOf={numberOf} />
      ) : (
        <div className="mt-6 space-y-4">
          <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: LEARN.muted }}>
            Your training
          </p>
          {lessons.length === 0 ? (
            <div className="rounded-[1.5rem] bg-white p-8 text-center text-sm shadow-sm" style={{ color: LEARN.muted }}>
              Lessons are being prepared. Check back soon.
            </div>
          ) : (
            <UpNext courseId={courseId} lesson={next} number={next ? (numberOf.get(next.id) ?? 1) : 1} moduleTitle={next ? moduleTitleOf(outline, next.id) : null} enrolled={isMember} />
          )}
        </div>
      )}
    </LearnLayout>
  );
}

function moduleTitleOf(outline: CourseOutline<StudentLesson>, lessonId: string): string | null {
  for (const m of outline.modules) {
    if (m.lessons.some((l) => l.id === lessonId)) return m.title;
    const sub = m.submodules.find((s) => s.lessons.some((l) => l.id === lessonId));
    if (sub) return `${m.title} · ${sub.title}`;
  }
  return null;
}

function UpNext({ courseId, lesson, number, moduleTitle, enrolled }: { courseId: string; lesson: StudentLesson | null; number: number; moduleTitle: string | null; enrolled: boolean }) {
  if (!lesson) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-[1.5rem] bg-white p-6 shadow-sm">
      <div className="min-w-0">
        <p className="text-xs font-bold" style={{ color: LEARN.orange }}>
          {enrolled ? "Up next" : "Start here"}
          {moduleTitle ? ` · ${moduleTitle}` : ""}
        </p>
        <h2 className="mt-1 text-xl font-extrabold" style={{ fontFamily: "var(--font-headline)" }}>
          {number}. {lesson.title}
        </h2>
      </div>
      <Link href={`/learn/${courseId}?tab=map`} className="text-sm font-bold hover:underline" style={{ color: LEARN.teal }}>
        See all lessons →
      </Link>
    </div>
  );
}

function CourseMap({ courseId, data, numberOf }: { courseId: string; data: StudentCourse; numberOf: ReadonlyMap<string, number> }) {
  const { outline, states, enrolledAt, isStaffPreview } = data;
  const rows = (lessons: readonly StudentLesson[]) => (
    <div className="divide-y divide-[#edf3f7]">
      {lessons.map((l) => (
        <CourseLessonRow
          key={l.id}
          courseId={courseId}
          lesson={l}
          number={numberOf.get(l.id) ?? 0}
          state={states.get(l.id) ?? { kind: "locked" }}
          showPreviewTag={!enrolledAt && !isStaffPreview}
        />
      ))}
    </div>
  );
  if (numberOf.size === 0) {
    return (
      <div className="mt-6 rounded-[1.5rem] bg-white p-8 text-center text-sm shadow-sm" style={{ color: LEARN.muted }}>
        Lessons are being prepared. Check back soon.
      </div>
    );
  }
  return (
    <div className="mt-6 space-y-4">
      {outline.modules.map((m) => (
        <section key={m.id} className="overflow-hidden rounded-[1.5rem] bg-white shadow-sm">
          <h2 className="border-b border-[#edf3f7] px-5 py-4 text-lg font-extrabold" style={{ fontFamily: "var(--font-headline)" }}>
            {m.title}
          </h2>
          {rows(m.lessons)}
          {m.submodules.map((s) => (
            <div key={s.id}>
              <h3 className="bg-[#f6fafd] px-5 py-2.5 text-sm font-bold" style={{ color: LEARN.teal }}>
                {s.title}
              </h3>
              {rows(s.lessons)}
            </div>
          ))}
        </section>
      ))}
      {outline.unassigned.length > 0 && <section className="overflow-hidden rounded-[1.5rem] bg-white shadow-sm">{rows(outline.unassigned)}</section>}
    </div>
  );
}

function GetAccess({
  courseId,
  isFree,
  offers,
  enrollFailed,
  enrollFree,
}: {
  courseId: string;
  isFree: boolean;
  offers: readonly PublishedOffer[];
  enrollFailed: boolean;
  enrollFree: () => Promise<void>;
}) {
  if (offers.length > 0) {
    return (
      <div className="mt-6 flex flex-wrap gap-3">
        {offers.map((o) => (
          <Link key={o.slug} href={`/checkout/${o.slug}`} className={PILL_ORANGE} style={{ backgroundColor: LEARN.orange }}>
            Get access · {o.title} — {formatOfferPrice(o)}
          </Link>
        ))}
        <Link href={`/learn/${courseId}?tab=map`} className="rounded-full border border-white/40 px-5 py-2.5 text-sm font-bold hover:bg-white/10">
          Browse lessons
        </Link>
      </div>
    );
  }
  if (isFree) {
    return (
      <form action={enrollFree} className="mt-6 space-y-2">
        <button type="submit" className={PILL_ORANGE} style={{ backgroundColor: LEARN.orange }}>
          Enroll for free →
        </button>
        {enrollFailed && (
          <p role="alert" className="text-sm font-bold text-[#ffd7c2]">
            We couldn&apos;t enroll you just now. Please try again.
          </p>
        )}
      </form>
    );
  }
  return <p className="mt-6 text-sm text-white/85">Enrollment opens soon. Free preview lessons are available in the course map.</p>;
}
