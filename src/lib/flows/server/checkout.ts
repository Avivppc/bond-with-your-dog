import "server-only";
import { createServiceClient } from "@/lib/supabase/admin";
import { checkCode, discountedCents, normalizeCode, type CodeRecord } from "../discount";

/** A member's personal code applied to an offer at checkout. */
export type UpsellQuote = { ok: true; codeId: string; code: string; percent: number; amountCents: number } | { ok: false; reason: string };

interface QuoteInput {
  userId: string;
  offerId: string;
  paymentType: string;
  priceCents: number;
  code: string;
}

/**
 * Checks a personal code against the member and the offer, and prices the offer with it. A code is
 * for one chapter: it only applies to a one-time offer that sells exactly that chapter (not a bundle
 * or a subscription). The code is marked used when the order is paid (see fulfillOrder).
 */
export async function upsellQuote(input: QuoteInput, now: Date = new Date()): Promise<UpsellQuote> {
  const code = normalizeCode(input.code);
  if (!/^BOND-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) return { ok: false, reason: "That code isn't valid." };
  if (input.paymentType !== "one_time") return { ok: false, reason: "That code is for a single chapter." };
  const sb = createServiceClient();
  const [codeRes, coursesRes] = await Promise.all([
    sb.from("discount_codes").select("id, user_id, course_id, percent, expires_at, redeemed_at").eq("code", code).maybeSingle(),
    sb.from("offer_courses").select("course_id, access_level").eq("offer_id", input.offerId),
  ]);
  if (codeRes.error || coursesRes.error) {
    console.error("[checkout] code lookup failed", { error: codeRes.error?.message ?? coursesRes.error?.message });
    return { ok: false, reason: "We couldn't check that code. Try again." };
  }
  const courses = coursesRes.data ?? [];
  const singleChapter = courses.length === 1 && courses[0].access_level === "full" ? [courses[0].course_id] : [];
  const record = codeRes.data as (CodeRecord & { id: string }) | null;
  const check = checkCode(record, input.userId, singleChapter, now);
  if (!check.ok) return check;
  return { ok: true, codeId: record!.id, code, percent: check.percent, amountCents: discountedCents(input.priceCents, check.percent) };
}
