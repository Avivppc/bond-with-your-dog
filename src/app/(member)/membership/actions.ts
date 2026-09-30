"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { getPaymentProvider } from "@/lib/payments/provider";
import { canCancelSubscription, type SubscriptionLike } from "@/lib/feedback/membership";

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
