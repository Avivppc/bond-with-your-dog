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
      amountCents: number; // what the buyer paid, tax included
      taxCents: number; // tax inside amountCents (collected for the authorities, not revenue)
      currency: string;
      periodEnd: string | null; // end of the billing period this payment covers
      priceIds: string[]; // provider price ids actually paid for (validated against the offer)
      paymentMethod: string | null; // card, paypal, apple_pay… (analytics)
    }
  | {
      kind: "subscription.updated";
      subscriptionRef: string;
      orderId: string | null;
      status: SubscriptionStatus;
      periodEnd: string | null;
      canceledAt: string | null;
    }
  | {
      kind: "order.refunded";
      providerRef: string; // the refunded transaction
      full: boolean;
      adjustmentRef: string | null; // provider refund id (several partial refunds per transaction)
      amountCents: number | null; // refunded amount when the provider reports it (tax included)
      taxCents: number; // tax inside amountCents
    }
  | { kind: "ignored"; reason: string };

export interface CheckoutRequest {
  orderId: string;
  userId: string;
  offerId: string;
  customerEmail: string;
  providerPriceId: string | null;
  successUrl: string;
  /** Provider discount to apply (referral friend discount / referrer reward). */
  discountId: string | null;
}

export interface CheckoutSession {
  /** Where to send the buyer. */
  url: string;
  /** Provider transaction id created by OUR server — webhooks are matched on it. */
  providerRef: string | null;
}

export interface PaymentProvider {
  name: ProviderName;
  /**
   * Whether the checkout charges the order's own amount (so our discounts, like personal flow codes,
   * are really applied). Paddle charges its catalog price; PayPlus will charge the amount we send.
   */
  chargesOrderAmount: boolean;
  createCheckout(request: CheckoutRequest): Promise<CheckoutSession>;
  /**
   * Stops renewal at the end of the paid period (the member keeps access until then).
   * Returns when the provider has accepted it; the local row is updated by the caller/webhook.
   */
  cancelSubscription(subscriptionRef: string): Promise<{ effectiveAt: string | null }>;
}
