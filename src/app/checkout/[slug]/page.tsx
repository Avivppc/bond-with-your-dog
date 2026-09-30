import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/server";
import { formatOfferPrice, type PricedOffer } from "@/lib/pricing";
import { startCheckout } from "../actions";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  unavailable: "This offer is no longer available.",
  "not-configured": "Online payments are not open yet. Please check back soon.",
  provider: "We couldn't reach the payment provider. Please try again in a moment.",
  failed: "Something went wrong starting your checkout. Please try again.",
};

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { slug } = await params;
  const { error } = await searchParams;
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
            <span className="text-3xl font-extrabold" style={{ color: "#243036" }}>
              {price}
            </span>
            <form action={startCheckout}>
              <input type="hidden" name="slug" value={offer.slug} />
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
    </>
  );
}
