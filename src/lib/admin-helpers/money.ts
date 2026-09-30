import { formatMoney } from "../pricing";

/** Per-currency amounts (lifetime value, revenue) as one short string. Pure. */
export interface CurrencyAmount {
  currency: string;
  net_cents: number;
}

/** "$100 + €20"; "$0" when there's nothing. Zero-value currencies are skipped. */
export function formatAmounts(amounts: readonly CurrencyAmount[], fallbackCurrency = "USD"): string {
  const nonZero = amounts.filter((a) => a.net_cents !== 0);
  if (nonZero.length === 0) return formatMoney(0, fallbackCurrency);
  return nonZero.map((a) => formatMoney(a.net_cents, a.currency)).join(" + ");
}

/** Validates the jsonb from admin_people_extras (external data) into typed amounts. */
export function toAmounts(value: unknown): CurrencyAmount[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((v): CurrencyAmount[] => {
    if (typeof v !== "object" || v === null) return [];
    const { currency, net_cents: cents } = v as Record<string, unknown>;
    return typeof currency === "string" && /^[A-Z]{3}$/.test(currency) && Number.isFinite(Number(cents))
      ? [{ currency, net_cents: Number(cents) }]
      : [];
  });
}
