import "server-only";
import { randomInt } from "node:crypto";
import type { createServiceClient } from "@/lib/supabase/admin";
import { generateCode } from "../discount";

/** Database helpers shared by the flow runner, the in-app offer card and checkout (service role). */

export type ServiceClient = ReturnType<typeof createServiceClient>;

const PAGE_ROWS = 1000;

/** PostgREST returns at most 1000 rows per request: read every page (the query must be ordered). */
export async function fetchAll<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_ROWS) {
    const { data, error } = await page(from, from + PAGE_ROWS - 1);
    if (error) throw new Error(`read failed: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_ROWS) return rows;
  }
}

export interface ChapterOffer {
  slug: string;
  title: string;
  priceCents: number;
  currency: string;
}

/** The published one-time offer that gives full access to a chapter (the cheapest, if several). */
export async function chapterOffer(sb: ServiceClient, courseId: string): Promise<ChapterOffer | null> {
  const { data, error } = await sb
    .from("offer_courses")
    .select("access_level, offers!inner(slug, title, price_cents, currency, status, payment_type)")
    .eq("course_id", courseId)
    .eq("access_level", "full")
    .eq("offers.status", "published")
    .eq("offers.payment_type", "one_time");
  if (error) {
    console.error("[flows] chapter offer lookup failed", { courseId, error: error.message });
    return null;
  }
  const offers = (data ?? []).map((r) => r.offers as unknown as { slug: string; title: string; price_cents: number; currency: string });
  const best = offers.sort((a, b) => a.price_cents - b.price_cents)[0];
  return best ? { slug: best.slug, title: best.title, priceCents: best.price_cents, currency: best.currency } : null;
}

export interface IssuedCode {
  id: string;
  code: string;
  percent: number;
  expiresAt: string;
}

/**
 * The member's personal code for a chapter in a flow: one per member, chapter and flow, ever. The
 * first call creates it; later calls (the next email, the in-app card) return the same code while
 * it's usable. Once it has expired or been used, there is no new one: null means "no discount".
 */
export async function ensureCode(
  sb: ServiceClient,
  input: { userId: string; courseId: string; percent: number; validDays: number; flowId: string },
  now: Date,
): Promise<IssuedCode | null> {
  const read = async () => {
    const { data, error } = await sb
      .from("discount_codes")
      .select("id, code, percent, expires_at, redeemed_at")
      .eq("user_id", input.userId)
      .eq("course_id", input.courseId)
      .eq("flow_id", input.flowId)
      .maybeSingle();
    if (error) console.error("[flows] code lookup failed", { error: error.message });
    return data;
  };
  const usable = (c: NonNullable<Awaited<ReturnType<typeof read>>>): IssuedCode | null =>
    !c.redeemed_at && new Date(c.expires_at) > now ? { id: c.id, code: c.code, percent: c.percent, expiresAt: c.expires_at } : null;

  const existing = await read();
  if (existing) return usable(existing);

  const expiresAt = new Date(now.getTime() + input.validDays * 24 * 60 * 60 * 1000).toISOString();
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = generateCode(() => randomInt(0, 1_000_000) / 1_000_000);
    const { data, error } = await sb
      .from("discount_codes")
      .insert({ code, user_id: input.userId, course_id: input.courseId, percent: input.percent, expires_at: expiresAt, flow_id: input.flowId })
      .select("id")
      .single();
    if (!error) return { id: data.id, code, percent: input.percent, expiresAt };
    if (error.code !== "23505") {
      console.error("[flows] code insert failed", { error: error.message });
      return null;
    }
    // Either the code string collided (try another) or a parallel request created this member's code.
    const raced = await read();
    if (raced) return usable(raced);
  }
  return null;
}

/** Whether the member already has full access to a chapter (then there's nothing to sell). */
export async function ownsChapter(sb: ServiceClient, userId: string, courseId: string, now: Date): Promise<boolean> {
  const { data } = await sb.from("enrollments").select("expires_at").eq("user_id", userId).eq("course_id", courseId).eq("access_level", "full");
  return (data ?? []).some((e) => !e.expires_at || new Date(e.expires_at) > now);
}
