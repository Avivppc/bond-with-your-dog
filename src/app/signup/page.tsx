import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import GoogleButton from "@/components/auth/GoogleButton";
import TestimonialCard from "@/components/TestimonialCard";
import { testimonialById } from "@/lib/testimonials";
import { MARKETING_CONSENT_LABEL } from "@/lib/auth/marketing-consent";
import TrackOnMount from "@/components/analytics/TrackOnMount";
import { EVENTS } from "@/lib/analytics-events";
import { signup } from "./actions";

export const metadata = {
  title: "Join BONDED",
  description: "Create your free BONDED account and be the first to know when Bonded: Foundations opens.",
};

const SIGNUP_PHOTO = "/images/photos/borderonis-16.jpg";
const SIGNUP_TESTIMONIAL_ID = "lili";

const perks = [
  { icon: "lock_open", text: "Free account. No card, no commitment." },
  { icon: "notifications_active", text: "First to know when Bonded: Foundations opens." },
  { icon: "explore", text: "A clear starting point: Foundations, Moves or Let's Dance." },
  { icon: "schedule", text: "10–15 minutes a day is all it takes." },
];

const inputClass =
  "px-4 py-3 rounded-lg border border-outline-variant/40 bg-white focus:ring-2 focus:ring-primary/30 focus:outline-none";
const labelClass = "text-xs font-bold uppercase tracking-wider text-on-surface-variant";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; next?: string }>;
}) {
  const { error, message, next } = await searchParams;
  const testimonial = testimonialById(SIGNUP_TESTIMONIAL_ID);

  return (
    <>
      <Navbar />
      <main className="pt-24 pb-20 min-h-screen px-5 md:px-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start pt-6 lg:pt-12">

          {/* Value side */}
          <section className="lg:col-span-6">
            <p className="font-label text-sm font-semibold text-secondary uppercase tracking-widest mb-4">
              Start your journey
            </p>
            <h1 className="font-headline text-4xl md:text-5xl font-extrabold text-on-surface tracking-tight leading-[1.05] mb-5">
              Your dog is ready.
              <br />
              <span className="text-primary">Are you?</span>
            </h1>
            <p className="text-lg text-on-surface-variant font-light leading-relaxed max-w-lg mb-8">
              Join thousands of dog lovers learning Roni&apos;s method: trust and
              communication first, tricks and dance when you&apos;re both ready.
            </p>

            <ul className="space-y-4 mb-10">
              {perks.map(({ icon, text }) => (
                <li key={icon} className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary mt-0.5">{icon}</span>
                  <span className="text-on-surface">{text}</span>
                </li>
              ))}
            </ul>

            <div className="grid grid-cols-5 gap-5 md:gap-6 items-end">
              <div className="col-span-2 aspect-[3/4] rounded-2xl overflow-hidden kinetic-shadow bg-surface-container-low">
                <img
                  src={SIGNUP_PHOTO}
                  alt="Roni kneeling while her border collie licks her cheek"
                  className="w-full h-full object-cover"
                />
              </div>
              {testimonial && (
                <div className="col-span-3 pb-4">
                  <TestimonialCard testimonial={testimonial} variant="inline" />
                </div>
              )}
            </div>
          </section>

          {/* Form side */}
          <section className="lg:col-span-6">
            <div className="bg-white rounded-2xl shadow-lg p-8 md:p-10">
              <h2 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface mb-2">
                Join BONDED
              </h2>
              <p className="text-sm text-on-surface-variant mb-6">
                Create your free account in under a minute.
              </p>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
                  {decodeURIComponent(error)}
                </div>
              )}
              {message && <TrackOnMount event={EVENTS.signupCompleted} />}
              {message && (
                <div className="mb-4 p-3 rounded-lg bg-green-50 text-green-700 text-sm">
                  {decodeURIComponent(message)}
                </div>
              )}

              <form action={signup} className="flex flex-col gap-4">
                <input type="hidden" name="next" value={next ?? "/dashboard"} />
                <label className="flex flex-col gap-1.5">
                  <span className={labelClass}>Your name</span>
                  <input name="full_name" type="text" required minLength={2} autoComplete="name" className={inputClass} />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className={labelClass}>Email</span>
                  <input name="email" type="email" required autoComplete="email" className={inputClass} />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className={labelClass}>Password</span>
                  <input name="password" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
                  <span className="text-xs text-outline">At least 8 characters.</span>
                </label>

                <label className="flex items-center gap-3 text-xs sm:text-sm text-on-surface-variant cursor-pointer mt-1">
                  <input
                    name="marketing_opt_in"
                    type="checkbox"
                    value="yes"
                    className="h-4 w-4 shrink-0 rounded border-outline-variant accent-[#8b4b00]"
                  />
                  <span>{MARKETING_CONSENT_LABEL}</span>
                </label>

                <button
                  type="submit"
                  className="kinetic-gradient mt-2 px-6 py-3.5 rounded-full font-bold text-sm shadow-md active:scale-95 transition-transform"
                  style={{ color: "#fff0e6" }}
                >
                  Create account
                </button>

                <div className="flex items-center gap-3 my-1">
                  <span className="h-px flex-1 bg-outline-variant/40" />
                  <span className="text-xs uppercase tracking-widest text-outline">or</span>
                  <span className="h-px flex-1 bg-outline-variant/40" />
                </div>

                <GoogleButton consentInputName="marketing_opt_in" label="Sign up with Google" next={next ?? "/dashboard"} />
              </form>

              <p className="text-xs text-outline mt-5 leading-relaxed">
                We&apos;ll only email you about your account, plus Roni&apos;s tips if you
                tick the box above. You can unsubscribe at any time.
              </p>

              <p className="text-sm text-center mt-6 text-on-surface-variant">
                Already a member?{" "}
                <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="font-bold text-primary">
                  Sign in
                </Link>
              </p>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
