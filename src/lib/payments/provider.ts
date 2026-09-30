import "server-only";
import { z } from "zod";
import type { CheckoutRequest, CheckoutSession, PaymentProvider, ProviderName } from "./types";

/**
 * PAYMENTS_PROVIDER selects the provider:
 *   - "paddle": Paddle Billing (PADDLE_ENV=sandbox|production, PADDLE_API_KEY,
 *               PADDLE_WEBHOOK_SECRET, NEXT_PUBLIC_PADDLE_CLIENT_TOKEN)
 *   - "test":   local end-to-end testing without a payment account (never in production)
 * Swapping to another provider (e.g. Polar) means adding one adapter here.
 */
export function configuredProvider(): ProviderName | null {
  const value = process.env.PAYMENTS_PROVIDER;
  if (value === "paddle") return "paddle";
  if (value === "test") {
    // Fail closed: fake payments only ever run in local development (next dev).
    if (process.env.NODE_ENV !== "development") {
      console.error("[payments] PAYMENTS_PROVIDER=test is ignored outside local development");
      return null;
    }
    return "test";
  }
  return null;
}

function paddleApiBase(): string {
  return process.env.PADDLE_ENV === "production" ? "https://api.paddle.com" : "https://sandbox-api.paddle.com";
}

const TransactionResponse = z.object({ data: z.object({ id: z.string() }) });
const SubscriptionResponse = z.object({
  data: z.object({
    id: z.string(),
    scheduled_change: z.object({ action: z.string(), effective_at: z.string() }).nullable().optional(),
    canceled_at: z.string().nullable().optional(),
  }),
});

const paddle: PaymentProvider = {
  name: "paddle",
  async createCheckout(request: CheckoutRequest): Promise<CheckoutSession> {
    const apiKey = process.env.PADDLE_API_KEY;
    if (!apiKey) throw new Error("PADDLE_API_KEY is not configured");
    if (!request.providerPriceId) throw new Error("This offer has no Paddle price id yet");

    const res = await fetch(`${paddleApiBase()}/transactions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ price_id: request.providerPriceId, quantity: 1 }],
        custom_data: { order_id: request.orderId, user_id: request.userId, offer_id: request.offerId },
        collection_mode: "automatic",
        ...(request.discountId ? { discount_id: request.discountId } : {}),
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const json: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      console.error("[paddle] create transaction failed", { status: res.status, body: JSON.stringify(json)?.slice(0, 500) });
      throw new Error("Payment provider rejected the checkout");
    }
    const parsed = TransactionResponse.parse(json);
    // /checkout/pay loads Paddle.js, which opens the overlay for this transaction (_ptxn).
    const url = new URL("/checkout/pay", request.successUrl);
    url.searchParams.set("_ptxn", parsed.data.id);
    url.searchParams.set("order", request.orderId);
    return { url: url.toString(), providerRef: parsed.data.id };
  },
  async cancelSubscription(subscriptionRef: string) {
    const apiKey = process.env.PADDLE_API_KEY;
    if (!apiKey) throw new Error("PADDLE_API_KEY is not configured");
    const res = await fetch(`${paddleApiBase()}/subscriptions/${encodeURIComponent(subscriptionRef)}/cancel`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ effective_from: "next_billing_period" }),
      signal: AbortSignal.timeout(15_000),
    });
    const json: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      console.error("[paddle] cancel subscription failed", { status: res.status, body: JSON.stringify(json)?.slice(0, 500) });
      throw new Error("Payment provider rejected the cancellation");
    }
    const parsed = SubscriptionResponse.safeParse(json);
    const data = parsed.success ? parsed.data.data : null;
    return { effectiveAt: data?.scheduled_change?.effective_at ?? data?.canceled_at ?? null };
  },
};

const test: PaymentProvider = {
  name: "test",
  async createCheckout(request: CheckoutRequest): Promise<CheckoutSession> {
    const url = new URL("/checkout/test-pay", request.successUrl);
    url.searchParams.set("order", request.orderId);
    return { url: url.toString(), providerRef: null };
  },
  // Local testing: nothing to call; the caller marks the subscription canceled.
  async cancelSubscription() {
    return { effectiveAt: null };
  },
};

export function getPaymentProvider(): PaymentProvider | null {
  const name = configuredProvider();
  if (name === "paddle") return paddle;
  if (name === "test") return test;
  return null;
}
