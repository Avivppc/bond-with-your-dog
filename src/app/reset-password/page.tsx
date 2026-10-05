import { redirect } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/server";
import { updatePassword } from "./actions";

export const metadata = { title: "Choose a new password" };
export const dynamic = "force-dynamic";

const INPUT = "rounded-lg border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-300";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  const { error, notice } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Only reachable through the emailed link, which signs the user in first.
  if (!user) redirect("/forgot-password");

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen px-5 pb-20 pt-28 md:px-8" style={{ backgroundColor: "#edf8ff" }}>
        <div className="mx-auto max-w-md rounded-2xl bg-white p-8 shadow-lg md:p-10">
          <h1 className="mb-2 text-4xl font-extrabold tracking-tighter" style={{ fontFamily: "var(--font-headline)", color: "#243036" }}>
            Choose a new password
          </h1>
          <p className="mb-8 text-sm" style={{ color: "#515d64" }}>
            For {user.email}.
          </p>
          {notice === "secured" && (
            <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">
              Your email is confirmed. To keep your account safe, please choose a password now.
            </div>
          )}
          {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{decodeURIComponent(error)}</div>}
          <form action={updatePassword} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">New password</span>
              <input name="password" type="password" required minLength={8} maxLength={72} autoComplete="new-password" className={INPUT} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Repeat it</span>
              <input name="confirm" type="password" required minLength={8} maxLength={72} autoComplete="new-password" className={INPUT} />
            </label>
            <button type="submit" className="kinetic-gradient mt-2 rounded-full px-6 py-3.5 text-sm font-bold shadow-md transition-transform active:scale-95" style={{ color: "#fff0e6" }}>
              Save and continue
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </>
  );
}
