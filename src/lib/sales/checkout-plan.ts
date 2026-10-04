import "server-only";
import { createServiceClient } from "@/lib/supabase/admin";
import type { PaymentProvider } from "@/lib/payments/types";
import { referralQuote } from "@/lib/referrals-server";
import { upsellQuote } from "@/lib/flows/server/checkout";
import { couponQuote, loadAddOn, ownsOffer, OFFER_FOR_SALE_COLUMNS, type OfferForSale, type UsableAddOn } from "./server";
import { bestDiscount, checkGift, effectivePercent, orderTotal, upsellStillOpen, type DiscountKind, type GiftInput } from "./pricing";

/**
 * What a checkout will charge and why: one discount (referral, personal code, coupon or an
 * after-purchase upsell price), an optional order bump and an optional gift. The checkout page
 * shows it and startCheckout charges it, from the same function, so the two never disagree.
 */

export interface PlanInput {
  userId: string;
  userEmail: string;
  offer: OfferForSale;
  provider: PaymentProvider | null;
  /** A typed code: a personal BOND-XXXX-XXXX code or a coupon. */
  code: string;
  wantBump: boolean;
  /** Present when "This is a gift" is ticked. */
  gift: GiftInput | null;
  /** The first purchase an after-purchase upsell belongs to. */
  afterOrderId: string | null;
}

export interface PlanDiscount {
  kind: DiscountKind;
  label: string;
  amountCents: number;
  percent: number;
  couponId: string | null;
  codeId: string | null;
  code: string | null;
  rewardId: string | null;
  paddleDiscountId: string | null;
  parentOrderId: string | null;
}

export interface CheckoutPlan {
  listCents: number;
  mainCents: number;
  discount: PlanDiscount | null;
  /** Why the typed code (or the after-purchase link) can't be used, when it can't. */
  codeProblem: string | null;
  /** The add-on offered with this offer (shown even when not ticked). */
  bump: UsableAddOn | null;
  bumpAccepted: boolean;
  gift: GiftInput | null;
  giftProblem: string | null;
  totalCents: number;
  /** Whether our own prices are charged (codes, bumps and upsells need it). */
  ownPricing: boolean;
}

const PERSONAL_CODE = /^BOND-/i;
const UUID = /^[0-9a-f-]{36}$/;

type Candidate = PlanDiscount;

function candidate(partial: Partial<PlanDiscount> & Pick<PlanDiscount, "kind" | "label" | "amountCents">, listCents: number): Candidate {
  return {
    couponId: null,
    codeId: null,
    code: null,
    rewardId: null,
    paddleDiscountId: null,
    parentOrderId: null,
    percent: effectivePercent(listCents, partial.amountCents),
    ...partial,
  };
}

async function referralCandidate(input: PlanInput): Promise<Candidate | null> {
  const { offer } = input;
  if (offer.payment_type === "free") return null;
  const quote = await referralQuote({ userId: input.userId, offerId: offer.id, priceCents: offer.price_cents, provider: input.provider?.name ?? null });
  if (!quote.discount) return null;
  const label = quote.discount.kind === "friend" ? `Friend discount: ${quote.discount.percent}% off your first purchase` : `Your referral reward: ${quote.discount.percent}% off`;
  return candidate(
    { kind: quote.discount.kind, label, amountCents: quote.amountCents, percent: quote.discount.percent, rewardId: quote.discount.rewardId, paddleDiscountId: quote.paddleDiscountId },
    offer.price_cents,
  );
}

async function codeCandidate(input: PlanInput, ownPricing: boolean): Promise<{ candidate: Candidate | null; problem: string | null }> {
  const code = input.code.trim();
  if (!code) return { candidate: null, problem: null };
  if (!ownPricing) return { candidate: null, problem: "Codes can't be used here yet." };
  const { offer } = input;
  if (PERSONAL_CODE.test(code)) {
    const quote = await upsellQuote({ userId: input.userId, offerId: offer.id, paymentType: offer.payment_type, priceCents: offer.price_cents, code });
    if (!quote.ok) return { candidate: null, problem: quote.reason };
    return {
      candidate: candidate({ kind: "upsell", label: `Your member code ${quote.code}: ${quote.percent}% off`, amountCents: quote.amountCents, percent: quote.percent, codeId: quote.codeId, code: quote.code }, offer.price_cents),
      problem: null,
    };
  }
  if (offer.payment_type !== "one_time") return { candidate: null, problem: "Codes work on one-time purchases." };
  const quote = await couponQuote({ userId: input.userId, offer, code });
  if (!quote.ok) return { candidate: null, problem: quote.reason };
  return {
    candidate: candidate({ kind: "coupon", label: `Code ${quote.code}: ${quote.label}`, amountCents: quote.amountCents, couponId: quote.couponId, code: quote.code }, offer.price_cents),
    problem: null,
  };
}

/** The special price of an after-purchase upsell, when this checkout follows a qualifying purchase. */
async function afterCandidate(input: PlanInput, ownPricing: boolean): Promise<{ candidate: Candidate | null; problem: string | null }> {
  if (!input.afterOrderId) return { candidate: null, problem: null };
  const expired = { candidate: null, problem: "That special offer has ended, but you can still buy at the regular price." };
  if (!ownPricing || !UUID.test(input.afterOrderId)) return expired;
  const sb = createServiceClient();
  const { data: parent } = await sb
    .from("orders")
    .select("id, offer_id, status, paid_at")
    .eq("id", input.afterOrderId)
    .eq("user_id", input.userId)
    .maybeSingle();
  if (!parent || parent.status !== "paid" || !upsellStillOpen(parent.paid_at, new Date())) return expired;
  const [{ data: parentOffer }, { count: taken }] = await Promise.all([
    sb.from("offers").select(OFFER_FOR_SALE_COLUMNS).eq("id", parent.offer_id).maybeSingle(),
    // Only a paid upsell closes it; an unpaid attempt is replaced when they start again.
    sb.from("orders").select("id", { count: "exact", head: true }).eq("upsell_of_order_id", parent.id).eq("status", "paid"),
  ]);
  if (!parentOffer || (taken ?? 0) > 0) return expired;
  const upsell = await loadAddOn(parentOffer as unknown as OfferForSale, "upsell");
  if (!upsell || upsell.offer.id !== input.offer.id) return expired;
  return {
    candidate: candidate({ kind: "post_purchase", label: "Your special after-purchase price", amountCents: upsell.priceCents, parentOrderId: parent.id }, input.offer.price_cents),
    problem: null,
  };
}

async function bumpFor(input: PlanInput, ownPricing: boolean): Promise<UsableAddOn | null> {
  if (!ownPricing || input.gift || input.offer.payment_type !== "one_time") return null;
  const bump = await loadAddOn(input.offer, "bump");
  if (!bump || (await ownsOffer(input.userId, bump.offer.id))) return null;
  return bump;
}

/** Works out the whole checkout (see CheckoutPlan). Never throws for a buyer's mistake; problems are fields. */
export async function planCheckout(input: PlanInput): Promise<CheckoutPlan> {
  const { offer } = input;
  const ownPricing = offer.payment_type === "free" || input.provider?.chargesOrderAmount === true;

  const giftCheck = input.gift
    ? offer.giftable && offer.payment_type === "one_time"
      ? checkGift(input.gift, input.userEmail)
      : ({ ok: false, reason: "This offer can't be bought as a gift." } as const)
    : null;

  const [referral, code, after, bump] = await Promise.all([
    referralCandidate(input),
    codeCandidate(input, ownPricing),
    afterCandidate(input, ownPricing),
    bumpFor(input, ownPricing),
  ]);
  const discount = bestDiscount([referral, code.candidate, after.candidate]);
  const mainCents = discount?.amountCents ?? offer.price_cents;
  const bumpAccepted = Boolean(bump && input.wantBump);

  return {
    listCents: offer.price_cents,
    mainCents,
    discount,
    codeProblem: after.problem ?? code.problem,
    bump,
    bumpAccepted,
    gift: giftCheck?.ok ? giftCheck.gift : null,
    giftProblem: giftCheck && !giftCheck.ok ? giftCheck.reason : null,
    totalCents: orderTotal(mainCents, bumpAccepted && bump ? bump.priceCents : null),
    ownPricing,
  };
}
