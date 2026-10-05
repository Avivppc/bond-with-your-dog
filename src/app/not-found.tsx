import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="pt-32 pb-24 px-6 min-h-[70vh] flex items-center">
        <div className="max-w-xl mx-auto text-center">
          <p className="font-label text-sm font-semibold text-secondary uppercase tracking-widest mb-4">
            404
          </p>
          <h1 className="font-headline text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
            This page wandered off.
          </h1>
          <p className="text-lg text-on-surface-variant font-light mb-10">
            Even the best-trained dogs take a wrong turn now and then. Let&apos;s get you back on the path.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/"
              className="kinetic-gradient text-on-primary px-8 py-4 rounded-full font-headline font-bold"
            >
              Back home
            </Link>
            <Link
              href="/quiz"
              className="bg-surface-container text-on-surface px-8 py-4 rounded-full font-headline font-bold hover:bg-surface-container-high transition-colors"
            >
              Find Your Journey
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
