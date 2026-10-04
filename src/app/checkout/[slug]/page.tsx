import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import SalesAssistant from "@/components/assistant/SalesAssistant";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, formatOfferPrice, type PricedOffer } from "@/lib/pricing";
import { getPaymentProvider } from "@/lib/payments/provider";
import { planCheckout } from "@/lib/sales/checkout-plan";
import { OFFER_FOR_SALE_COLUMNS, type OfferForSale } from "@/lib/sales/server";
import { CheckoutChoices } from "./CheckoutChoices";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  unavailable: "This offer is no longer available.",
  "not-configured": "Online payments are not open yet. Please check back soon.",
  provider: "We couldn't reach the payment provider. Please try again in a moment.",
  failed: "Something went wrong starting your checkout. Please try again.",
  owned: "You already have access to everything in this offer — head to your dashboard to keep learning.",
  "code-used": "That code is already on another purchase.",
  gift: "Check the gift details: their first name, their email (not yours), and a message without links.",
};

const MAX_CODE = 60;

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string; code?: string; after?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const code = typeof query.code === "string" ? query.code.trim().slice(0, MAX_CODE) : "";
  const after = typeof query.after === "string" ? query.after.slice(0, 40) : null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/checkout/${slug}${after ? `?after=${after}` : ""}`)}`);

  const { data: row } = await supabase
    .from("offers")
    .select(`${OFFER_FOR_SALE_COLUMNS}, description, interval, offer_courses(courses(id, title))`)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (!row) notFound();
  const offer = row as unknown as OfferForSale & {
    description: string | null;
    interval: "month" | "year" | null;
    offer_courses: { courses: { id: string; title: string } | null }[] | null;
  };

  const courses = (offer.offer_courses ?? []).flatMap((oc) => (oc.courses ? [oc.courses] : []));
  const price = formatOfferPrice(offer as unknown as PricedOffer);
  const provider = getPaymentProvider();
  // The same calculation startCheckout charges (bump and gift are chosen on the form).
  const plan = await planCheckout({ userId: user.id, userEmail: user.email ?? "", offer, provider, code, wantBump: false, gift: null, afterOrderId: after });
  const discount = plan.discount;
  const isFree = offer.payment_type === "free";
  const appliedCode = discount?.code ?? null;

  return (
    <>
      <SiteHeader />
      <main className="pt-28 pb-20 max-w-2xl mx-auto px-5 min-h-screen" style={{ backgroundColor: "#edf8ff" }}>
        <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#8b4b00" }}>
          {discount?.kind === "post_purchase" ? "A special offer for you" : "Checkout"}
        </p>
        <h1 className="text-4xl font-extrabold tracking-tighter mb-3" style={{ fontFamily: "var(--font-headline)", color: "#243036" }}>
          {offer.title}
        </h1>
        {offer.description && (
          <p className="text-lg mb-6" style={{ color: "#515d64" }}>
            {offer.description}
          </p>
        )}

        {plan.codeProblem && (
          <p role="alert" className="mb-6 p-4 rounded-xl bg-amber-50 text-amber-900 text-sm">
            {plan.codeProblem} {code ? "You can still buy at the regular price." : ""}
          </p>
        )}
        {query.error && ERRORS[query.error] && (
          <p role="alert" className="mb-6 p-4 rounded-xl bg-red-50 text-red-800 text-sm">
            {ERRORS[query.error]}
          </p>
        )}

        <section className="bg-white rounded-2xl p-6 shadow-sm space-y-5">
          <div>
            <p className="text-sm font-bold mb-2" style={{ color: "#243036" }}>
              Includes
            </p>
            <ul className="space-y-1">
              {courses.map((c) => (
                <li key={c.id} className="flex items-center gap-2" style={{ color: "#243036" }}>
                  <span className="material-symbols-outlined text-base" style={{ color: "#0e666a" }}>
                    check_circle
                  </span>
                  {c.title}
                </li>
              ))}
            </ul>
            <p className="text-xs mt-2" style={{ color: "#515d64" }}>
              {offer.payment_type === "subscription"
                ? "Access while your membership is active. Cancel anytime."
                : offer.days_of_access
                  ? `Access for ${offer.days_of_access} days.`
                  : "Lifetime access."}
            </p>
          </div>

          <div className="flex items-end justify-between gap-4 border-t border-slate-100 pt-5">
            <span>
              {discount ? (
                <>
                  <span className="block text-sm line-through" style={{ color: "#515d64" }}>
                    {price}
                  </span>
                  <span className="text-2xl font-extrabold" style={{ color: "#243036" }}>
                    {formatMoney(plan.mainCents, offer.currency)}
                  </span>
                  <span className="mt-1 block text-xs font-bold" style={{ color: "#0e666a" }}>
                    {discount.label}
                    {offer.payment_type === "subscription" ? " (first payment)" : ""}
                  </span>
                </>
              ) : (
                <span className="text-2xl font-extrabold" style={{ color: "#243036" }}>
                  {price}
                </span>
              )}
            </span>
            {plan.ownPricing && !isFree && discount?.kind !== "post_purchase" && (
              <form method="get" className="flex items-center gap-2">
                {after && <input type="hidden" name="after" value={after} />}
                <input
                  name="code"
                  defaultValue={appliedCode ?? code}
                  placeholder="Have a code?"
                  aria-label="Discount code"
                  maxLength={MAX_CODE}
                  className="w-36 px-3 py-2 rounded-lg border border-slate-200 text-sm uppercase"
                />
                <button type="submit" className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold" style={{ color: "#243036" }}>
                  Apply
                </button>
              </form>
            )}
          </div>

          <CheckoutChoices
            slug={offer.slug}
            currency={offer.currency}
            mainCents={plan.mainCents}
            code={appliedCode}
            after={discount?.kind === "post_purchase" ? after : null}
            bump={
              plan.bump
                ? {
                    title: plan.bump.offer.title,
                    headline: plan.bump.headline || `Add ${plan.bump.offer.title}`,
                    text: plan.bump.text,
                    priceCents: plan.bump.priceCents,
                    listCents: plan.bump.offer.priceCents,
                  }
                : null
            }
            giftable={offer.giftable && offer.payment_type === "one_time"}
            isFree={isFree}
          />
          <p className="text-xs" style={{ color: "#515d64" }}>
            Signed in as {user.email}. Payments are processed securely by our payment partner. See our{" "}
            <Link href="/refund-policy" className="underline">
              refund policy
            </Link>
            .
          </p>
        </section>
      </main>
      <Footer />
      <SalesAssistant />
    </>
  );
}
