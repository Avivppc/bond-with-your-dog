import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  return (
    <>
      <Navbar />
      <main
        className="pt-28 pb-20 min-h-screen px-5 md:px-8"
        style={{ backgroundColor: "#edf8ff" }}
      >
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg p-8 md:p-10">
          <h1
            className="text-4xl font-extrabold mb-2 tracking-tighter"
            style={{ fontFamily: "var(--font-headline)", color: "#243036" }}
          >
            Welcome back
          </h1>
          <p className="text-sm mb-8" style={{ color: "#515d64" }}>
            Sign in to continue your training.
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
              {decodeURIComponent(error)}
            </div>
          )}

          <form action={login} className="flex flex-col gap-4">
            <input type="hidden" name="next" value={next ?? "/dashboard"} />
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Email
              </span>
              <input
                name="email"
                type="email"
                required
                className="px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-orange-300 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Password
              </span>
              <input
                name="password"
                type="password"
                required
                minLength={8}
                className="px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-orange-300 focus:outline-none"
              />
            </label>
            <button
              type="submit"
              className="kinetic-gradient mt-2 px-6 py-3.5 rounded-full font-bold text-sm shadow-md active:scale-95 transition-transform"
              style={{ color: "#fff0e6" }}
            >
              Sign in
            </button>
          </form>

          <p className="text-sm text-center mt-6" style={{ color: "#515d64" }}>
            New here?{" "}
            <Link href="/signup" className="font-bold" style={{ color: "#8b4b00" }}>
              Create an account
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
