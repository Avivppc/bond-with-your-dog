import "server-only";
import { createServiceClient } from "@/lib/supabase/admin";
import { formatOfferPrice, type PricedOffer } from "@/lib/pricing";
import { STAGES } from "@/components/chapters/stages";
import { chapterChoice, type ChapterChoice } from "./chapter-choice";

/**
 * The three chapters' state for one member's My Courses. Draft courses are read with the service
 * role (only id, title, publish state and order — nothing members couldn't see on the website),
 * so the chapter appears as "Opening soon" before Roni publishes it.
 */

type OfferRow = { course_id: string; access_level: string; offers: (PricedOffer & { slug: string; status: string }) | null };

export async function loadChapterChoices(ownedCourseIds: ReadonlySet<string>): Promise<Map<string, ChapterChoice>> {
  const ids = STAGES.map((s) => s.courseId);
  const sb = createServiceClient();
  const [coursesRes, offersRes] = await Promise.all([
    sb.from("courses").select("id, title, published, requires_course_id").in("id", ids),
    sb.from("offer_courses").select("course_id, access_level, offers(slug, payment_type, price_cents, currency, interval, status)").in("course_id", ids),
  ]);
  if (coursesRes.error) console.error("[my-courses] chapter courses load failed", coursesRes.error.message);
  if (offersRes.error) console.error("[my-courses] chapter offers load failed", offersRes.error.message);

  const courses = new Map((coursesRes.data ?? []).map((c) => [c.id as string, c as { id: string; title: string; published: boolean; requires_course_id: string | null }]));
  const offers = (offersRes.data ?? []) as unknown as OfferRow[];

  return new Map(
    STAGES.map((stage) => {
      const course = courses.get(stage.courseId);
      const offer = offers.find((o) => o.course_id === stage.courseId && o.access_level === "full" && o.offers?.status === "published")?.offers ?? null;
      const requires = course?.requires_course_id ? courses.get(course.requires_course_id) : null;
      return [
        stage.courseId,
        chapterChoice({
          courseId: stage.courseId,
          ctaLabel: stage.ctaLabel,
          published: Boolean(course?.published),
          owned: ownedCourseIds.has(stage.courseId),
          offer: offer ? { slug: offer.slug, price: formatOfferPrice(offer) } : null,
          requiresTitle: requires?.title ?? null,
        }),
      ];
    }),
  );
}
