"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { getPaymentProvider } from "@/lib/payments/provider";
import { canCancelSubscription, type SubscriptionLike } from "@/lib/feedback/membership";
import { notifyTeam } from "@/lib/notify-team";
import { retentionLabel } from "@/lib/sales/pricing";

export type CancelResult = { ok: true; message: string } | { ok: false; error: string };

const ASK_US = "We can't cancel this subscription from here. Please ask us from Help and we'll do it for you.";

interface SubRow extends SubscriptionLike {
  id: string;
  provider: string;
  provider_ref: string;
}

/** Stops a subscription from renewing (Paddle: at the end of the paid period). */
export async function cancelSubscription(subscriptionId: string): Promise<CancelResult> {
  if (!z.string().uuid().safeParse(subscriptionId).success) return { ok: false, error: "Unknown subscription." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/membership");

  // RLS: members only see their own subscriptions.
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("id, provider, provider_ref, status, current_period_end, canceled_at")
    .eq("id", subscriptionId)
    .maybeSingle<SubRow>();
  if (!sub) return { ok: false, error: "Unknown subscription." };
  if (!canCancelSubscription(sub)) return { ok: false, error: "This subscription is already canceled." };

  const provider = getPaymentProvider();
  if (!provider || provider.name !== sub.provider) return { ok: false, error: ASK_US };

  let effectiveAt: string | null;
  try {
    ({ effectiveAt } = await provider.cancelSubscription(sub.provider_ref));
  } catch (err) {
    console.error("[membership] cancel failed", { subscriptionId, error: err instanceof Error ? err.message : String(err) });
    return { ok: false, error: "The cancellation didn't go through. Please try again, or ask us from Help." };
  }

  // The provider accepted it; record it now so the page is right before the webhook arrives.
  const now = new Date().toISOString();
  const patch =
    provider.name === "test"
      ? { status: "canceled", canceled_at: now, updated_at: now }
      : { canceled_at: effectiveAt ?? sub.current_period_end ?? now, updated_at: now };
  const { error } = await createServiceClient().from("subscriptions").update(patch).eq("id", sub.id);
  if (error) console.error("[membership] could not record the cancellation", { subscriptionId, error: error.message });

  revalidatePath("/membership");
  return {
    ok: true,
    message: provider.name === "test" ? "Subscription canceled" : "Canceled. You keep access until the end of the period you paid for.",
  };
}

/**
 * The offer to stay: the member keeps the subscription and the discount is recorded for their next
 * payments. PayPlus renewals charge it once payments are connected; the team is told meanwhile.
 */
export async function acceptOfferToStay(subscriptionId: string): Promise<CancelResult> {
  if (!z.string().uuid().safeParse(subscriptionId).success) return { ok: false, error: "Unknown subscription." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/membership");

  // RLS: members only see their own subscriptions.
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("id, status, current_period_end, canceled_at, retention_accepted_at, offers(title, interval, retention_percent, retention_cycles)")
    .eq("id", subscriptionId)
    .maybeSingle();
  if (!sub) return { ok: false, error: "Unknown subscription." };
  const offer = sub.offers as unknown as { title: string; interval: "month" | "year" | null; retention_percent: number | null; retention_cycles: number | null } | null;
  if (!offer?.retention_percent || !offer.retention_cycles || sub.retention_accepted_at || !canCancelSubscription(sub as unknown as SubscriptionLike)) {
    return { ok: false, error: "This offer isn't available anymore." };
  }

  const { data: saved, error } = await createServiceClient()
    .from("subscriptions")
    .update({
      retention_percent: offer.retention_percent,
      retention_cycles_left: offer.retention_cycles,
      retention_accepted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", sub.id)
    .is("retention_accepted_at", null)
    .select("id");
  if (error || !saved?.length) {
    console.error("[membership] offer to stay failed", { subscriptionId, error: error?.message ?? "already accepted" });
    return { ok: false, error: "Couldn't save that. Please try again." };
  }
  const label = retentionLabel(offer.retention_percent, offer.retention_cycles, offer.interval);
  await notifyTeam("orders", {
    subject: `A member stayed with ${offer.title} (${label})`.slice(0, 150),
    lines: [`${user.email} was about to cancel ${offer.title} and took the offer to stay: ${label}.`, "Their next payments should be charged with this discount."],
    path: "/admin/orders",
  });
  revalidatePath("/membership");
  return { ok: true, message: `You're staying: ${label}. Thank you!` };
}
