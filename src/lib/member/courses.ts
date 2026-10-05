import "server-only";
import { createClient } from "@/lib/supabase/server";
import { loadStudentCourse, type StudentCourse } from "@/lib/student-course-server";
import { formatOfferPrice, type PricedOffer } from "@/lib/pricing";
import { loadEnrolled } from "./home";
import { courseStatus, type CourseStatus } from "./course-status";

export type { CourseStatus };

export interface CourseCardData {
  id: string;
  title: string;
  description: string;
  image: string | null;
  chapterNumber: number | null;
  status: CourseStatus;
  lockedByTitle: string | null;
  course: StudentCourse | null;
  moveNames: string[];
  offers: { slug: string; title: string; price: string }[];
}

export interface CertificateRow {
  code: string;
  course_title: string;
  issued_at: string;
}

interface CourseRow {
  id: string;
  title: string;
  description: string;
  image: string | null;
  chapter_number: number | null;
  requires_course_id: string | null;
  published: boolean;
}

/**
 * Every published course in chapter order, with this member's status for each (My Courses). A course
 * not published yet shows only to someone enrolled who may see it (the team previewing it before
 * launch; RLS keeps unpublished courses from students).
 */
export async function loadMyCourses(userId: string): Promise<{ cards: CourseCardData[]; certificates: CertificateRow[] }> {
  const supabase = await createClient();
  const [coursesRes, enrolled, certsRes] = await Promise.all([
    supabase
      .from("courses")
      .select("id, title, description, image, chapter_number, requires_course_id, published")
      .order("chapter_number", { ascending: true, nullsFirst: false })
      .order("created_at"),
    loadEnrolled(supabase),
    supabase.from("certificates").select("code, course_title, issued_at").eq("user_id", userId).order("issued_at", { ascending: false }),
  ]);
  if (coursesRes.error) console.error("[my-courses] courses load failed", coursesRes.error.message);
  const enrolledIds = new Set(enrolled.map((e) => e.courseId));
  const rows = ((coursesRes.data ?? []) as CourseRow[]).filter((r) => r.published || enrolledIds.has(r.id));
  const ids = rows.map((r) => r.id);

  const [loaded, movesRes, offersRes] = await Promise.all([
    Promise.all(rows.map((r) => (enrolledIds.has(r.id) ? loadStudentCourse(supabase, r.id, userId) : Promise.resolve(null)))),
    ids.length ? supabase.from("moves").select("name, course_id").in("course_id", ids).order("position") : Promise.resolve({ data: [], error: null }),
    ids.length
      ? supabase.from("offer_courses").select("course_id, access_level, offers(slug, title, payment_type, price_cents, currency, interval, status)").in("course_id", ids)
      : Promise.resolve({ data: [], error: null }),
  ]);
  const byId = new Map(rows.map((r, i) => [r.id, { row: r, course: loaded[i] }]));
  const done = (courseId: string | null) => {
    const c = courseId ? byId.get(courseId)?.course : null;
    return Boolean(c && c.progress.total > 0 && c.progress.completed === c.progress.total);
  };

  const cards = rows.map((r): CourseCardData => {
    const course = byId.get(r.id)?.course ?? null;
    const required = r.requires_course_id ? byId.get(r.requires_course_id)?.row : null;
    const offers = ((offersRes.data ?? []) as unknown as { course_id: string; access_level: string; offers: (PricedOffer & { slug: string; title: string; status: string }) | null }[])
      .filter((o) => o.course_id === r.id && o.offers?.status === "published" && (!course?.isLimited || o.access_level === "full"))
      .map((o) => ({ slug: o.offers!.slug, title: o.offers!.title, price: formatOfferPrice(o.offers!) }));
    return {
      id: r.id,
      title: r.title,
      description: r.description,
      image: r.image,
      chapterNumber: r.chapter_number,
      status: courseStatus({
        enrolled: Boolean(course?.enrolledAt) || Boolean(course?.isStaffPreview),
        completed: course ? course.progress.completed : 0,
        total: course ? course.progress.total : 0,
        lockedBehind: Boolean(required) && !done(r.requires_course_id),
      }),
      lockedByTitle: required?.title ?? null,
      course,
      moveNames: ((movesRes.data ?? []) as { name: string; course_id: string }[]).filter((m) => m.course_id === r.id).map((m) => m.name).slice(0, 4),
      offers,
    };
  });

  return { cards, certificates: (certsRes.data ?? []) as CertificateRow[] };
}
