import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import { requestPasswordReset } from "./actions";

export const metadata = { title: "Reset your password" };

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string }> }) {
  const { sent, error } = await searchParams;

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen px-5 pb-20 pt-28 md:px-8" style={{ backgroundColor: "#edf8ff" }}>
        <div className="mx-auto max-w-md rounded-2xl bg-white p-8 shadow-lg md:p-10">
          <h1 className="mb-2 text-4xl font-extrabold tracking-tighter" style={{ fontFamily: "var(--font-headline)", color: "#243036" }}>
            Forgot your password?
          </h1>
          {sent ? (
            <p className="mb-6 text-sm" style={{ color: "#515d64" }}>
              If there&apos;s an account for that email, a reset link is on its way. Open it on this device to choose a new password.
            </p>
          ) : (
            <>
              <p className="mb-8 text-sm" style={{ color: "#515d64" }}>
                Enter your email and we&apos;ll send you a link to choose a new one.
              </p>
              {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{decodeURIComponent(error)}</div>}
              <form action={requestPasswordReset} className="flex flex-col gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Email</span>
                  <input name="email" type="email" required autoComplete="email" className="rounded-lg border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-300" />
                </label>
                <button type="submit" className="kinetic-gradient mt-2 rounded-full px-6 py-3.5 text-sm font-bold shadow-md transition-transform active:scale-95" style={{ color: "#fff0e6" }}>
                  Send reset link
                </button>
              </form>
            </>
          )}
          <p className="mt-6 text-center text-sm" style={{ color: "#515d64" }}>
            <Link href="/login" className="font-bold" style={{ color: "#8b4b00" }}>
              Back to sign in
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
