import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/admin";
import { chapterOffer, ensureCode, ownsChapter } from "@/lib/flows/server/data";
import { discountedCents, formatUsd } from "@/lib/flows/discount";
import { Ms } from "@/components/app/ui";

/** The offer appears from this share of the chapter done (the same moment the 80% email flow starts). */
const SHOW_FROM_PERCENT = 80;

interface NextChapterOfferProps {
  userId: string;
  /** The chapter the member is in. */
  courseId: string;
  percentDone: number;
}

/** A live flow that sells the next chapter of this one with a discount, preferring the trigger matching this moment. */
async function liveDiscount(sb: ReturnType<typeof createServiceClient>, courseId: string, completed: boolean) {
  const { data } = await sb
    .from("email_flows")
    .select("id, trigger, trigger_params, offer, discount_percent, discount_valid_days")
    .eq("status", "live")
    .in("trigger", ["chapter_progress", "chapter_completed"])
    .not("discount_percent", "is", null);
  const flows = (data ?? []).filter((f) => {
    const params = (f.trigger_params ?? {}) as { courseId?: string | null };
    const offer = (f.offer ?? {}) as { kind?: string };
    return offer.kind === "next_chapter" && (!params.courseId || params.courseId === courseId);
  });
  const wanted = completed ? "chapter_completed" : "chapter_progress";
  return flows.find((f) => f.trigger === wanted) ?? flows[0] ?? null;
}

/**
 * "Your next chapter" in the app, at 80% of a chapter and when it's done: the next chapter's price
 * and, when a live email flow offers one, the member's personal code (the same code the emails carry).
 */
export async function NextChapterOffer({ userId, courseId, percentDone }: NextChapterOfferProps) {
  if (percentDone < SHOW_FROM_PERCENT) return null;
  const sb = createServiceClient();
  const now = new Date();
  const { data: next } = await sb.from("courses").select("id, title, image, image_alt").eq("requires_course_id", courseId).eq("published", true).maybeSingle();
  if (!next || (await ownsChapter(sb, userId, next.id, now))) return null;
  const offer = await chapterOffer(sb, next.id);
  if (!offer) return null;

  const completed = percentDone >= 100;
  const flow = await liveDiscount(sb, courseId, completed);
  const code =
    flow?.discount_percent && flow.discount_valid_days
      ? await ensureCode(sb, { userId, courseId: next.id, percent: flow.discount_percent, validDays: flow.discount_valid_days, flowId: flow.id }, now)
      : null;
  const until = code ? new Date(code.expiresAt).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" }) : null;
  const href = `/checkout/${offer.slug}${code ? `?code=${encodeURIComponent(code.code)}` : ""}`;

  return (
    <div className="card" style={{ flexDirection: "row", alignItems: "center", gap: 22, flexWrap: "wrap" }}>
      {next.image && (
        <div className="media" style={{ width: 168, aspectRatio: "16 / 10", flexShrink: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- chapter artwork */}
          <img src={next.image} alt={next.image_alt ?? ""} />
        </div>
      )}
      <div className="stack" style={{ flex: 1, minWidth: 220, gap: 6 }}>
        <span className="eyebrow">Your next chapter</span>
        <h2 className="h3">{completed ? `Ready for ${next.title}?` : `Almost there. ${next.title} is next.`}</h2>
        {code ? (
          <p className="muted">
            As a member you get {code.percent}% off with your code <b>{code.code}</b>, until {until}.
          </p>
        ) : (
          <p className="muted">It builds on everything you&apos;ve practiced in this chapter.</p>
        )}
        <div className="row" style={{ gap: 10 }}>
          <b style={{ fontFamily: "var(--display)", fontSize: 22 }}>{formatUsd(code ? discountedCents(offer.priceCents, code.percent) : offer.priceCents)}</b>
          {code && <s className="faint">{formatUsd(offer.priceCents)}</s>}
        </div>
      </div>
      <Link className="btn btn-primary" href={href}>
        Continue to {next.title}
        <Ms name="arrow_forward" />
      </Link>
    </div>
  );
}
