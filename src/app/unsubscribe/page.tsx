import Link from "next/link";
import { redirect } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import { resubscribeByToken, unsubscribeByToken } from "@/lib/flows/server/unsubscribe";

export const metadata = { title: "Email preferences", robots: { index: false, follow: false } };

type Search = Promise<{ t?: string; done?: string }>;

async function unsubscribe(formData: FormData) {
  "use server";
  const token = String(formData.get("t") ?? "");
  const ok = await unsubscribeByToken(token, "link");
  redirect(`/unsubscribe?t=${encodeURIComponent(token)}&done=${ok ? "out" : "error"}`);
}

async function resubscribe(formData: FormData) {
  "use server";
  const token = String(formData.get("t") ?? "");
  const ok = await resubscribeByToken(token);
  redirect(`/unsubscribe?t=${encodeURIComponent(token)}&done=${ok ? "in" : "error"}`);
}

/**
 * Where "Unsubscribe" in a Bonded email lands. A button confirms it, so mail scanners that open
 * links don't unsubscribe anyone by accident. Lesson and account emails keep coming.
 */
export default async function UnsubscribePage({ searchParams }: { searchParams: Search }) {
  const { t = "", done } = await searchParams;
  const copy =
    done === "out"
      ? { title: "You're unsubscribed.", body: "We won't send you offers or updates about new chapters. Emails about your account and lessons still arrive." }
      : done === "in"
        ? { title: "Welcome back.", body: "You'll hear from us about new chapters again." }
        : done === "error"
          ? { title: "That link didn't work.", body: "It may be incomplete. Open the link from the email again, or write to us and we'll take care of it." }
          : { title: "Stop emails about new chapters?", body: "You'll stop getting offers and updates about upcoming chapters. Emails about your account and lessons still arrive." };
  return (
    <>
      <SiteHeader />
      <main className="pt-32 pb-24 px-6 min-h-[70vh] flex items-center">
        <div className="max-w-xl mx-auto text-center">
          <p className="font-label text-sm font-semibold text-secondary uppercase tracking-widest mb-4">Email preferences</p>
          <h1 className="font-headline text-4xl md:text-5xl font-extrabold tracking-tight mb-4">{copy.title}</h1>
          <p className="text-lg text-on-surface-variant font-light mb-10">{copy.body}</p>
          {!done && t && (
            <form action={unsubscribe}>
              <input type="hidden" name="t" value={t} />
              <button type="submit" className="kinetic-gradient text-on-primary px-8 py-4 rounded-full font-headline font-bold">
                Unsubscribe
              </button>
            </form>
          )}
          {done === "out" && (
            <form action={resubscribe}>
              <input type="hidden" name="t" value={t} />
              <button type="submit" className="text-primary font-headline font-bold underline underline-offset-4">
                I changed my mind, keep me subscribed
              </button>
            </form>
          )}
          {(done === "in" || done === "error" || !t) && (
            <Link href="/" className="kinetic-gradient text-on-primary px-8 py-4 rounded-full font-headline font-bold">
              Back home
            </Link>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
