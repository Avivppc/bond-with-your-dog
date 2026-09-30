import "server-only";
import { z } from "zod";
import type { CheckoutRequest, PaymentProvider, ProviderName } from "./types";

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
    if (process.env.NODE_ENV === "production" && process.env.VERCEL_ENV === "production") {
      console.error("[payments] test provider is disabled in production");
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

const paddle: PaymentProvider = {
  name: "paddle",
  async createCheckout(request: CheckoutRequest): Promise<string> {
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
    return url.toString();
  },
};

const test: PaymentProvider = {
  name: "test",
  async createCheckout(request: CheckoutRequest): Promise<string> {
    const url = new URL("/checkout/test-pay", request.successUrl);
    url.searchParams.set("order", request.orderId);
    return url.toString();
  },
};

export function getPaymentProvider(): PaymentProvider | null {
  const name = configuredProvider();
  if (name === "paddle") return paddle;
  if (name === "test") return test;
  return null;
}
