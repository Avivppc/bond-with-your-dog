import "server-only";
import * as q from "@/lib/analytics/queries";
import type { CurrencyAmount } from "@/lib/admin-helpers/money";

const DAY_MS = 86_400_000;
const WINDOW_DAYS = 30;
/** admin_top_offers caps its result; beyond this an offer's figures are unknown, not zero. */
const OFFER_LIMIT = 100;

export interface OfferSales {
  purchases: number;
  net: number;
}

export interface PricingStats {
  purchases30d: number;
  net30d: CurrencyAmount[];
  netAllTime: CurrencyAmount[];
  /** Per offer (all time). `complete` is false when the list was capped. */
  byOffer: Map<string, OfferSales>;
  complete: boolean;
}

/** Kajabi's Pricing cards and per-offer columns, from the payments ledger (net = charges − refunds). */
export async function loadPricingStats(now: Date = new Date()): Promise<PricingStats> {
  const currencies = await q.currencies();
  const recent = { from: new Date(now.getTime() - WINDOW_DAYS * DAY_MS), to: now };
  const ever = { from: new Date(0), to: now };

  const perCurrency = await Promise.all(
    currencies.map(async (currency) => {
      const [recentOffers, allOffers, recentTotals, allTotals] = await Promise.all([
        q.topOffers(recent, currency, OFFER_LIMIT),
        q.topOffers(ever, currency, OFFER_LIMIT),
        q.revenueTotals(recent, currency),
        q.revenueTotals(ever, currency),
      ]);
      return { currency, recentOffers, allOffers, recentTotals, allTotals };
    })
  );

  const byOffer = new Map<string, OfferSales>();
  for (const c of perCurrency) {
    for (const o of c.allOffers) {
      const prev = byOffer.get(o.offerId) ?? { purchases: 0, net: 0 };
      byOffer.set(o.offerId, { purchases: prev.purchases + o.purchases, net: prev.net + o.gross - o.refunds });
    }
  }

  return {
    purchases30d: perCurrency.reduce((sum, c) => sum + c.recentOffers.reduce((s, o) => s + o.purchases, 0), 0),
    net30d: perCurrency.map((c) => ({ currency: c.currency, net_cents: c.recentTotals.gross - c.recentTotals.refunds })),
    netAllTime: perCurrency.map((c) => ({ currency: c.currency, net_cents: c.allTotals.gross - c.allTotals.refunds })),
    byOffer,
    complete: perCurrency.every((c) => c.allOffers.length < OFFER_LIMIT),
  };
}
