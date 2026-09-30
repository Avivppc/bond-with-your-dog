/**
 * Provider-agnostic payment types. Providers (Paddle today, Polar/others later)
 * translate their webhooks into BillingEvent; src/lib/payments/billing.ts applies them.
 */
export type ProviderName = "paddle" | "test";

export type SubscriptionStatus = "active" | "trialing" | "past_due" | "paused" | "canceled";

export type BillingEvent =
  | {
      kind: "order.paid";
      orderId: string | null; // our order id, passed through checkout custom data
      providerRef: string; // provider transaction id
      subscriptionRef: string | null;
      recurring: boolean; // renewal of an existing subscription
      amountCents: number;
      currency: string;
      periodEnd: string | null; // end of the billing period this payment covers
      priceIds: string[]; // provider price ids actually paid for (validated against the offer)
    }
  | {
      kind: "subscription.updated";
      subscriptionRef: string;
      orderId: string | null;
      status: SubscriptionStatus;
      periodEnd: string | null;
      canceledAt: string | null;
    }
  | { kind: "order.refunded"; providerRef: string; full: boolean }
  | { kind: "ignored"; reason: string };

export interface CheckoutRequest {
  orderId: string;
  userId: string;
  offerId: string;
  customerEmail: string;
  providerPriceId: string | null;
  successUrl: string;
}

export interface CheckoutSession {
  /** Where to send the buyer. */
  url: string;
  /** Provider transaction id created by OUR server — webhooks are matched on it. */
  providerRef: string | null;
}

export interface PaymentProvider {
  name: ProviderName;
  createCheckout(request: CheckoutRequest): Promise<CheckoutSession>;
}
