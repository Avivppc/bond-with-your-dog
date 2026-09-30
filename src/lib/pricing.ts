export interface PricedOffer {
  payment_type: "free" | "one_time" | "subscription";
  price_cents: number;
  currency: string;
  interval: "month" | "year" | null;
}

/** "49", "49.50", "$1,250.10" → cents (integer math, max 2 decimals); invalid → null. */
export function parsePriceToCents(input: string): number | null {
  const cleaned = input.trim().replace(/[$€£,\s]/g, "");
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(cleaned);
  if (!match) return null;
  return Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
}

/** "$49", "$49.50", "€1,250" from integer cents. */
export function formatMoney(cents: number, currency: string): string {
  const amount = cents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** "Free", "$49", "$49.50", "$19 / month" — English UI, currency symbol per ISO code. */
export function formatOfferPrice(offer: PricedOffer): string {
  if (offer.payment_type === "free") return "Free";
  const formatted = formatMoney(offer.price_cents, offer.currency);
  return offer.payment_type === "subscription" && offer.interval ? `${formatted} / ${offer.interval}` : formatted;
}
