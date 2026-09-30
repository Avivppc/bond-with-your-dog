import "server-only";
import { resolveRange, type ResolvedRange } from "@/lib/analytics/range";
import { currencies } from "@/lib/analytics/queries";

export interface AnalyticsSearchParams {
  range?: string;
  from?: string;
  to?: string;
  currency?: string;
}

export interface AnalyticsContext {
  range: ResolvedRange;
  currency: string;
  currencies: string[];
  /** For the date inputs: inclusive YYYY-MM-DD of the current window. */
  fromDay: string;
  toDay: string;
}

const DEFAULT_CURRENCY = "USD";

/** Range + currency shared by the Analytics overview and every report. */
export async function analyticsContext(params: AnalyticsSearchParams): Promise<AnalyticsContext> {
  const range = resolveRange(params);
  const seen = await currencies();
  // A repeated ?currency= arrives as an array; only a single value counts.
  const requested = typeof params.currency === "string" ? params.currency.toUpperCase() : undefined;
  const currency = requested && /^[A-Z]{3}$/.test(requested) ? requested : (seen[0] ?? DEFAULT_CURRENCY);
  return {
    range,
    currency,
    currencies: seen.includes(currency) ? seen : [currency, ...seen],
    fromDay: range.from.toISOString().slice(0, 10),
    toDay: new Date(range.to.getTime() - 1).toISOString().slice(0, 10),
  };
}
