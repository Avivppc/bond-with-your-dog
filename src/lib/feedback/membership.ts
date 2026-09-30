/** Membership & purchases: access labels, money, order and subscription states. Pure. */
import { ownsEverything, type AccessLevel } from "../offer-ownership";

export interface EnrollmentLike {
  course_id: string;
  expires_at: string | null;
  access_level: AccessLevel;
}

export type AccessKind = "lifetime" | "until" | "expired";

export function accessKind(e: Pick<EnrollmentLike, "expires_at">, now: Date): AccessKind {
  if (!e.expires_at) return "lifetime";
  return new Date(e.expires_at).getTime() > now.getTime() ? "until" : "expired";
}

export function isActiveEnrollment(e: Pick<EnrollmentLike, "expires_at">, now: Date): boolean {
  return accessKind(e, now) !== "expired";
}

/** "$89.00", "€12.50", "Free". */
export function formatMoney(cents: number, currency: string): string {
  if (cents === 0) return "Free";
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

export type OrderStatus = "pending" | "paid" | "refunded" | "canceled" | "failed";

export function orderStatusPill(status: OrderStatus): { tone: "reliable" | "neutral" | "learning" | "danger"; label: string } {
  switch (status) {
    case "paid":
      return { tone: "reliable", label: "Paid" };
    case "refunded":
      return { tone: "neutral", label: "Refunded" };
    case "pending":
      return { tone: "learning", label: "Pending" };
    case "canceled":
      return { tone: "neutral", label: "Canceled" };
    default:
      return { tone: "danger", label: "Failed" };
  }
}

export type SubscriptionStatus = "active" | "trialing" | "past_due" | "paused" | "canceled";

export interface SubscriptionLike {
  status: SubscriptionStatus;
  current_period_end: string | null;
  canceled_at: string | null;
}

export type SubscriptionPhase = "renews" | "ends" | "past_due" | "paused" | "canceled";

/** What the member should read about a subscription. */
export function subscriptionPhase(s: SubscriptionLike): SubscriptionPhase {
  if (s.status === "canceled") return "canceled";
  if (s.status === "paused") return "paused";
  if (s.canceled_at) return "ends";
  if (s.status === "past_due") return "past_due";
  return "renews";
}

/** Cancel is offered while the subscription still renews. */
export function canCancelSubscription(s: SubscriptionLike): boolean {
  return (s.status === "active" || s.status === "trialing" || s.status === "past_due") && !s.canceled_at;
}

export interface OfferWithCourses {
  id: string;
  courses: { course_id: string; access_level: AccessLevel }[];
}

/** Published offers that would give the member something they don't have yet. */
export function offersNotOwned<T extends OfferWithCourses>(offers: readonly T[], enrollments: readonly EnrollmentLike[], now: Date): T[] {
  const active = enrollments.filter((e) => isActiveEnrollment(e, now));
  return offers.filter((o) => o.courses.length > 0 && !ownsEverything(o.courses, active));
}
