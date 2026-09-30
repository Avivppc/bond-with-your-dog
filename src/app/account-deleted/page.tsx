import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata = { title: "Account deleted", robots: { index: false, follow: false } };

/** Where "Delete account" (Settings) lands after the account is gone and the member is signed out. */
export default function AccountDeletedPage() {
  return (
    <>
      <Navbar />
      <main className="pt-32 pb-24 px-6 min-h-[70vh] flex items-center">
        <div className="max-w-xl mx-auto text-center">
          <p className="font-label text-sm font-semibold text-secondary uppercase tracking-widest mb-4">Account deleted</p>
          <h1 className="font-headline text-4xl md:text-5xl font-extrabold tracking-tight mb-4">Your Bonded account is gone.</h1>
          <p className="text-lg text-on-surface-variant font-light mb-10">
            We&apos;ve erased your profile, dogs, progress, practice history, videos and order history, and signed you out. Thank you for
            training with us.
          </p>
          <Link href="/" className="kinetic-gradient text-on-primary px-8 py-4 rounded-full font-headline font-bold">
            Back home
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
