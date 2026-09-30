import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/server";
import { AutoRefresh } from "./AutoRefresh";

export const dynamic = "force-dynamic";

/** Post-payment page. Access is granted by the webhook, so a pending order polls until paid. */
export default async function CheckoutSuccessPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { order: orderId } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");

  const { data: order } = await supabase
    .from("orders")
    .select("id, status, offers(title, offer_courses(courses(id, title)))")
    .eq("id", orderId ?? "")
    .maybeSingle();
  if (!order) notFound();

  const offer = order.offers as unknown as { title: string; offer_courses: { courses: { id: string; title: string } | null }[] } | null;
  const courses = (offer?.offer_courses ?? []).flatMap((oc) => (oc.courses ? [oc.courses] : []));

  return (
    <>
      <Navbar />
      <main className="pt-32 pb-20 max-w-xl mx-auto px-5 min-h-screen text-center" style={{ backgroundColor: "#edf8ff" }}>
        {order.status === "paid" && (
          <>
            <span className="material-symbols-outlined text-6xl" style={{ color: "#0e666a" }}>
              celebration
            </span>
            <h1 className="text-4xl font-extrabold tracking-tighter my-3" style={{ fontFamily: "var(--font-headline)", color: "#243036" }}>
              You&apos;re in!
            </h1>
            <p className="mb-8" style={{ color: "#515d64" }}>
              {offer?.title} is ready. We also emailed you the links.
            </p>
            <div className="flex flex-col gap-3 items-center">
              {courses.map((c) => (
                <Link key={c.id} href={`/learn/${c.id}`} className="kinetic-gradient px-6 py-3 rounded-full font-bold shadow-md" style={{ color: "#fff0e6" }}>
                  Start {c.title} →
                </Link>
              ))}
            </div>
          </>
        )}
        {order.status === "pending" && (
          <>
            <AutoRefresh everyMs={3000} />
            <h1 className="text-3xl font-extrabold my-3" style={{ color: "#243036" }}>
              Confirming your payment…
            </h1>
            <p style={{ color: "#515d64" }}>This usually takes a few seconds. You can keep this page open.</p>
          </>
        )}
        {(order.status === "canceled" || order.status === "failed") && (
          <>
            <h1 className="text-3xl font-extrabold my-3" style={{ color: "#243036" }}>
              Payment not completed
            </h1>
            <p style={{ color: "#515d64" }}>No charge was made. You can try again whenever you&apos;re ready.</p>
          </>
        )}
        {order.status === "refunded" && (
          <h1 className="text-3xl font-extrabold my-3" style={{ color: "#243036" }}>
            This order was refunded.
          </h1>
        )}
      </main>
      <Footer />
    </>
  );
}
