/**
 * Checks that a provider payment really is the purchase our order describes before any
 * access is granted — the webhook payload is signed, but the buyer controls which price
 * they pay for in the provider's checkout.
 */
export interface OrderForValidation {
  currency: string;
}

export interface OfferForValidation {
  payment_type: "free" | "one_time" | "subscription";
  provider_price_id: string | null;
}

export interface PaymentForValidation {
  currency: string;
  priceIds: readonly string[];
  subscriptionRef: string | null;
  periodEnd: string | null;
}

/** Returns a reason the payment must not fulfil the order, or null when it matches. */
export function validatePayment(
  order: OrderForValidation,
  offer: OfferForValidation,
  payment: PaymentForValidation
): string | null {
  if (payment.currency.toUpperCase() !== order.currency.toUpperCase()) {
    return `currency mismatch (${payment.currency} paid, ${order.currency} ordered)`;
  }
  if (!offer.provider_price_id) return "offer has no provider price id";
  if (!payment.priceIds.includes(offer.provider_price_id)) {
    return `paid price ${payment.priceIds.join(",") || "(none)"} does not match offer price ${offer.provider_price_id}`;
  }
  if (offer.payment_type === "subscription" && (!payment.subscriptionRef || !payment.periodEnd)) {
    return "subscription offer paid without a subscription/billing period";
  }
  return null;
}
