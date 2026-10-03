import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SalesAssistant from "@/components/assistant/SalesAssistant";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, formatOfferPrice, type PricedOffer } from "@/lib/pricing";
import { getPaymentProvider } from "@/lib/payments/provider";
import { referralQuote } from "@/lib/referrals-server";
import { upsellQuote } from "@/lib/flows/server/checkout";
import { startCheckout } from "../actions";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  unavailable: "This offer is no longer available.",
  "not-configured": "Online payments are not open yet. Please check back soon.",
  provider: "We couldn't reach the payment provider. Please try again in a moment.",
  failed: "Something went wrong starting your checkout. Please try again.",
  owned: "You already have access to everything in this offer — head to your dashboard to keep learning.",
  "code-used": "That code is already on another purchase.",
};

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string; code?: string }>;
}) {
  const { slug } = await params;
  const { error, code } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/checkout/${slug}`);

  const { data: offer } = await supabase
    .from("offers")
    .select("id, slug, title, description, payment_type, price_cents, currency, interval, days_of_access, offer_courses(courses(id, title))")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (!offer) notFound();

  const courses = (offer.offer_courses ?? []).flatMap((oc) =>
    oc.courses ? [oc.courses as unknown as { id: string; title: string }] : []
  );
  const price = formatOfferPrice(offer as unknown as PricedOffer);
  // Preview of the referral discount applied at checkout (a friend's first purchase / a referrer reward).
  const quote = offer.payment_type === "free" ? null : await referralQuote({ userId: user.id, offerId: offer.id, priceCents: offer.price_cents, provider: getPaymentProvider()?.name ?? null });
  // A personal code from an email flow or the in-app offer (?code=); the bigger discount wins.
  const provider = getPaymentProvider();
  const upsell = code && provider?.chargesOrderAmount ? await upsellQuote({ userId: user.id, offerId: offer.id, paymentType: offer.payment_type, priceCents: offer.price_cents, code }) : null;
  const useUpsell = upsell?.ok === true && upsell.percent >= (quote?.discount?.percent ?? 0);
  const discount = useUpsell ? null : (quote?.discount ?? null);

  return (
    <>
      <Navbar />
      <main className="pt-28 pb-20 max-w-2xl mx-auto px-5 min-h-screen" style={{ backgroundColor: "#edf8ff" }}>
        <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#8b4b00" }}>
          Checkout
        </p>
        <h1 className="text-4xl font-extrabold tracking-tighter mb-3" style={{ fontFamily: "var(--font-headline)", color: "#243036" }}>
          {offer.title}
        </h1>
        {offer.description && (
          <p className="text-lg mb-6" style={{ color: "#515d64" }}>
            {offer.description}
          </p>
        )}

        {upsell && !upsell.ok && (
          <p role="alert" className="mb-6 p-4 rounded-xl bg-amber-50 text-amber-900 text-sm">
            {upsell.reason} You can still buy at the regular price.
          </p>
        )}

        {error && ERRORS[error] && (
          <p role="alert" className="mb-6 p-4 rounded-xl bg-red-50 text-red-800 text-sm">
            {ERRORS[error]}
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

          <div className="flex items-center justify-between border-t border-slate-100 pt-5">
            <span>
              {useUpsell && upsell?.ok ? (
                <>
                  <span className="block text-sm line-through" style={{ color: "#515d64" }}>
                    {price}
                  </span>
                  <span className="text-3xl font-extrabold" style={{ color: "#243036" }}>
                    {formatMoney(upsell.amountCents, offer.currency)}
                  </span>
                  <span className="mt-1 block text-xs font-bold" style={{ color: "#0e666a" }}>
                    Your member code {upsell.code}: {upsell.percent}% off
                  </span>
                </>
              ) : discount ? (
                <>
                  <span className="block text-sm line-through" style={{ color: "#515d64" }}>
                    {price}
                  </span>
                  <span className="text-3xl font-extrabold" style={{ color: "#243036" }}>
                    {formatMoney(quote!.amountCents, offer.currency)}
                  </span>
                  <span className="mt-1 block text-xs font-bold" style={{ color: "#0e666a" }}>
                    {discount.kind === "friend" ? `Friend discount: ${discount.percent}% off your first purchase` : `Your referral reward: ${discount.percent}% off`}
                    {offer.payment_type === "subscription" ? " (first payment)" : ""}
                  </span>
                </>
              ) : (
                <span className="text-3xl font-extrabold" style={{ color: "#243036" }}>
                  {price}
                </span>
              )}
            </span>
            <form action={startCheckout}>
              <input type="hidden" name="slug" value={offer.slug} />
              {useUpsell && upsell?.ok && <input type="hidden" name="code" value={upsell.code} />}
              <button type="submit" className="kinetic-gradient px-6 py-3 rounded-full font-bold shadow-md" style={{ color: "#fff0e6" }}>
                {offer.payment_type === "free" ? "Get access" : "Continue to payment"}
              </button>
            </form>
          </div>
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
