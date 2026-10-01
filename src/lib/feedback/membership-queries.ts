import "server-only";
import type { createClient } from "@/lib/supabase/server";
import type { AccessLevel } from "@/lib/offer-ownership";
import { offersNotOwned, type OrderStatus, type SubscriptionStatus } from "./membership";

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

export interface OwnedCourse {
  course_id: string;
  expires_at: string | null;
  access_level: AccessLevel;
  title: string;
  image: string | null;
  image_alt: string | null;
}

export interface OrderItem {
  id: string;
  status: OrderStatus;
  amount_cents: number;
  currency: string;
  paid_at: string | null;
  created_at: string;
  offerTitle: string;
}

export interface SubscriptionItem {
  id: string;
  status: SubscriptionStatus;
  current_period_end: string | null;
  canceled_at: string | null;
  offerTitle: string;
  interval: string | null;
}

export interface AvailableOffer {
  id: string;
  slug: string;
  title: string;
  payment_type: "free" | "one_time" | "subscription";
  price_cents: number;
  currency: string;
  interval: string | null;
  image: string | null;
  courses: { course_id: string; access_level: AccessLevel }[];
}

interface OfferRow extends Omit<AvailableOffer, "image" | "courses"> {
  offer_courses: { course_id: string; access_level: AccessLevel; courses: { image: string | null } | null }[];
}

function logError(what: string, error: { message: string } | null): void {
  if (error) console.error(`[membership] ${what} load failed`, error.message);
}

/** Everything on "Membership & purchases", read with the member's own session (RLS). */
export async function loadMembership(supabase: ServerSupabase, userId: string, now: Date) {
  const [enrollRes, ordersRes, subsRes, offersRes] = await Promise.all([
    supabase.from("enrollments").select("course_id, expires_at, access_level, enrolled_at, courses(title, image, image_alt)").eq("user_id", userId).order("enrolled_at"),
    supabase.from("orders").select("id, status, amount_cents, currency, paid_at, created_at, offers(title)").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("subscriptions").select("id, status, current_period_end, canceled_at, offers(title, interval)").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase
      .from("offers")
      .select("id, slug, title, payment_type, price_cents, currency, interval, offer_courses(course_id, access_level, courses(image))")
      .eq("status", "published")
      .order("created_at"),
  ]);
  logError("enrollments", enrollRes.error);
  logError("orders", ordersRes.error);
  logError("subscriptions", subsRes.error);
  logError("offers", offersRes.error);

  type Embedded<T> = T & { courses?: unknown; offers?: unknown };
  const courses: OwnedCourse[] = ((enrollRes.data ?? []) as Embedded<Record<string, unknown>>[]).map((e) => {
    const c = (e.courses ?? {}) as { title?: string; image?: string | null; image_alt?: string | null };
    return {
      course_id: e.course_id as string,
      expires_at: (e.expires_at as string | null) ?? null,
      access_level: e.access_level as AccessLevel,
      title: c.title ?? "Course",
      image: c.image ?? null,
      image_alt: c.image_alt ?? null,
    };
  });
  const orders: OrderItem[] = ((ordersRes.data ?? []) as Embedded<Record<string, unknown>>[]).map((o) => ({
    id: o.id as string,
    status: o.status as OrderStatus,
    amount_cents: o.amount_cents as number,
    currency: o.currency as string,
    paid_at: (o.paid_at as string | null) ?? null,
    created_at: o.created_at as string,
    offerTitle: ((o.offers ?? {}) as { title?: string }).title ?? "Bonded",
  }));
  const subscriptions: SubscriptionItem[] = ((subsRes.data ?? []) as Embedded<Record<string, unknown>>[]).map((s) => {
    const offer = (s.offers ?? {}) as { title?: string; interval?: string | null };
    return {
      id: s.id as string,
      status: s.status as SubscriptionStatus,
      current_period_end: (s.current_period_end as string | null) ?? null,
      canceled_at: (s.canceled_at as string | null) ?? null,
      offerTitle: offer.title ?? "Subscription",
      interval: offer.interval ?? null,
    };
  });
  const offers: AvailableOffer[] = ((offersRes.data ?? []) as unknown as OfferRow[]).map(({ offer_courses, ...o }) => ({
    ...o,
    image: offer_courses.find((oc) => oc.courses?.image)?.courses?.image ?? null,
    courses: offer_courses.map((oc) => ({ course_id: oc.course_id, access_level: oc.access_level })),
  }));

  return { courses, orders, subscriptions, available: offersNotOwned(offers, courses, now) };
}
