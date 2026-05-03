"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { courses, pricingTiers } from "@/lib/data";

const H = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <span style={{ fontFamily: "var(--font-headline), Plus Jakarta Sans, sans-serif" }} className={className}>
    {children}
  </span>
);

export default function HomePage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (email) setSubmitted(true);
  }

  return (
    <>
      <Navbar />
      <main className="pt-20 overflow-hidden" style={{ backgroundColor: "#edf8ff" }}>

        {/* ─── Hero ─── */}
        <section className="relative px-6 md:px-8 py-12 md:py-24 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-12 items-center">
          <div className="md:col-span-7 z-10 order-2 md:order-1">
            <h1
              className="text-5xl md:text-7xl font-extrabold leading-[1.1] tracking-tight mb-6"
              style={{ fontFamily: "var(--font-headline), Plus Jakarta Sans, sans-serif", color: "#243036" }}
            >
              Train. Connect.{" "}
              <span style={{ color: "#8b4b00", fontStyle: "italic" }}>Dance.</span>
            </h1>
            <p className="text-lg md:text-xl mb-10 leading-relaxed max-w-xl" style={{ color: "#515d64" }}>
              Unlock a deeper bond with your dog through the magic of creative
              movement. Professional choreography meets heart-centered training
              for every skill level.
            </p>
            <div className="flex flex-wrap gap-4">
              <button className="kinetic-gradient px-7 py-4 rounded-full font-bold text-lg shadow-xl flex items-center gap-2 group active:scale-95 transition-transform"
                style={{ fontFamily: "var(--font-headline), Plus Jakarta Sans, sans-serif", color: "#fff0e6", boxShadow: "0 16px 40px rgba(139,75,0,0.28)" }}>
                Try a Free Lesson
                <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </button>
              <Link
                href="/courses"
                className="px-7 py-4 rounded-full font-bold text-lg transition-colors"
                style={{ fontFamily: "var(--font-headline), Plus Jakarta Sans, sans-serif", backgroundColor: "#d4e5ef", color: "#515d64" }}
              >
                View Curriculum
              </Link>
            </div>
          </div>

          <div className="md:col-span-5 relative order-1 md:order-2">
            <div
              className="absolute -top-12 -right-12 w-64 h-64 rounded-full blur-3xl opacity-30 animate-pulse"
              style={{ backgroundColor: "#fdd400" }}
            />
            <div className="relative rounded-xl overflow-visible aspect-[4/5]" style={{ backgroundColor: "#e4f3fc" }}>
              <Image
                src="https://static.wixstatic.com/media/4da84e_a0a1b15a92f44c7ab5cf86f708589c1f~mv2.jpg/v1/fill/w_1680,h_737,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/4da84e_a0a1b15a92f44c7ab5cf86f708589c1f~mv2.jpg"
                alt="Dynamic shot of a Border Collie and trainer performing a dance move"
                fill
                className="object-cover rounded-xl shadow-2xl scale-110 -rotate-3 hover:rotate-0 transition-transform duration-700"
                unoptimized
              />
            </div>
          </div>
        </section>

        {/* ─── Social Proof ─── */}
        <section className="py-12 mb-16" style={{ backgroundColor: "rgba(228,243,252,0.5)" }}>
          <div className="max-w-7xl mx-auto px-6 md:px-8">
            <p className="text-center text-xs uppercase tracking-[0.2em] font-bold mb-8" style={{ color: "#6c7980" }}>
              As Seen On &amp; Featured In
            </p>
            <div className="flex flex-wrap justify-center items-center gap-6 md:gap-16 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
              {["AGT", "DOG SHOW", "NBC", "K9 STYLE", "PETS PLUS"].map((b) => (
                <span key={b} className="text-xl md:text-2xl font-black" style={{ fontFamily: "var(--font-headline), Plus Jakarta Sans, sans-serif" }}>{b}</span>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Course Overview ─── */}
        <section className="px-6 md:px-8 max-w-7xl mx-auto mb-24" id="courses">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <h2 className="text-3xl md:text-5xl font-extrabold mb-3" style={{ fontFamily: "var(--font-headline), Plus Jakarta Sans, sans-serif", color: "#243036" }}>
                Master Every Move
              </h2>
              <p className="max-w-md" style={{ color: "#515d64" }}>
                Structured learning paths designed by world-class dog dance finalists.
              </p>
            </div>
            <span className="inline-flex px-4 py-2 rounded-full text-sm font-bold" style={{ backgroundColor: "#a6eff3", color: "#005b5f" }}>
              New Courses Weekly
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {courses.slice(0, 3).map((course, i) => (
              <div
                key={course.id}
                className="group flex flex-col h-full p-6 rounded-xl shadow-sm hover:scale-[1.02] transition-all duration-500"
                style={{
                  backgroundColor: "#ffffff",
                  transform: i === 1 ? undefined : undefined,
                  marginTop: i === 1 ? "2rem" : undefined,
                }}
              >
                <div className="aspect-video rounded-lg overflow-hidden mb-6 relative">
                  <Image
                    src={course.image}
                    alt={course.imageAlt}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-700"
                    unoptimized
                  />
                  {i === 0 && (
                    <span className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: "#8b4b00", color: "#fff0e6" }}>
                      Bestseller
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-bold mb-2" style={{ fontFamily: "var(--font-headline), Plus Jakarta Sans, sans-serif", color: "#243036" }}>
                  {course.title.split(":")[0]}
                </h3>
                <p className="text-sm flex-grow mb-6" style={{ color: "#515d64" }}>{course.description}</p>
                <div className="flex justify-between items-center pt-5" style={{ borderTop: "1px solid #d4e5ef" }}>
                  <div>
                    <span className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "#6c7980" }}>{course.lessons} Lessons</span>
                    <span className="text-xl font-extrabold" style={{ fontFamily: "var(--font-headline), Plus Jakarta Sans, sans-serif", color: "#0e666a" }}>${course.price}</span>
                  </div>
                  <Link href="/courses" className="font-bold flex items-center gap-1 group/btn" style={{ color: "#8b4b00" }}>
                    Enroll <span className="material-symbols-outlined text-lg group-hover/btn:translate-x-1 transition-transform">chevron_right</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ─── About Roni ─── */}
        <section className="py-16 md:py-24" style={{ backgroundColor: "#d4e5ef" }} id="about">
          <div className="max-w-7xl mx-auto px-6 md:px-8 grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">
            <div className="relative order-2 md:order-1">
              <div className="bg-white p-3 md:p-4 rounded-xl shadow-2xl rotate-2 relative z-10">
                <Image
                  src="https://static.wixstatic.com/media/4da84e_b3eaefd5248241eaa3b1905ff9ba6fea~mv2.jpg/v1/fill/w_865,h_737,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/4da84e_b3eaefd5248241eaa3b1905ff9ba6fea~mv2.jpg"
                  alt="Roni Sagi smiling with her dog"
                  width={865}
                  height={737}
                  className="w-full h-auto rounded-lg"
                  unoptimized
                />
              </div>
              <div className="absolute -bottom-6 -left-4 md:-bottom-8 md:-left-8 p-5 md:p-6 rounded-xl shadow-xl z-20 max-w-[220px] md:max-w-[240px]" style={{ backgroundColor: "#a6eff3" }}>
                <p className="font-bold italic text-sm" style={{ fontFamily: "var(--font-headline), Plus Jakarta Sans, sans-serif", color: "#005b5f" }}>
                  &ldquo;It&rsquo;s not about the tricks; it&rsquo;s about the conversation you have with your dog.&rdquo;
                </p>
              </div>
            </div>

            <div className="order-1 md:order-2">
              <span className="text-sm font-bold uppercase tracking-widest mb-4 block" style={{ color: "#8b4b00" }}>Meet Your Coach</span>
              <h2 className="text-3xl md:text-5xl font-extrabold mb-6" style={{ fontFamily: "var(--font-headline), Plus Jakarta Sans, sans-serif", color: "#243036" }}>
                Roni Sagi: The Art of Partnership
              </h2>
              <p className="text-lg leading-relaxed mb-6" style={{ color: "#515d64" }}>
                From the world stage of <strong>America&apos;s Got Talent</strong> to your living room, Roni brings a revolutionary approach to dog training. Her philosophy centers on &ldquo;The Kinetic Duet&rdquo;—a method where handler and dog move as one.
              </p>
              <p className="text-lg leading-relaxed mb-8" style={{ color: "#515d64" }}>
                With over a decade of competitive experience, Roni focuses on positive reinforcement, body awareness, and the pure joy of performance.
              </p>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-3xl font-black" style={{ fontFamily: "var(--font-headline), Plus Jakarta Sans, sans-serif", color: "#8b4b00" }}>Top 10</p>
                  <p className="text-sm font-bold" style={{ color: "#6c7980" }}>AGT Finalist</p>
                </div>
                <div>
                  <p className="text-3xl font-black" style={{ fontFamily: "var(--font-headline), Plus Jakarta Sans, sans-serif", color: "#8b4b00" }}>5,000+</p>
                  <p className="text-sm font-bold" style={{ color: "#6c7980" }}>Students Globally</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Pricing ─── */}
        <section className="py-16 md:py-24 max-w-7xl mx-auto px-6 md:px-8" id="membership">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl md:text-5xl font-extrabold mb-4" style={{ fontFamily: "var(--font-headline), Plus Jakarta Sans, sans-serif", color: "#243036" }}>
              Dance Together, Always
            </h2>
            <p className="max-w-xl mx-auto" style={{ color: "#515d64" }}>
              Get unlimited access to every course, live sessions, and our exclusive community.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 items-start">
            {pricingTiers.map((tier) => (
              <div
                key={tier.id}
                className="p-7 md:p-8 rounded-xl flex flex-col relative"
                style={{
                  backgroundColor: tier.highlighted ? "#a6eff3" : "#e4f3fc",
                  transform: tier.highlighted ? "scale(1.03)" : undefined,
                  boxShadow: tier.highlighted ? "0 20px 60px rgba(14,102,106,0.18)" : undefined,
                  border: tier.highlighted ? "3px solid rgba(14,102,106,0.18)" : undefined,
                }}
              >
                {tier.highlighted && (
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider" style={{ backgroundColor: "#0e666a", color: "#c8fcff" }}>
                    Most Popular
                  </span>
                )}
                <h3 className="text-xl font-bold mb-2" style={{ fontFamily: "var(--font-headline), Plus Jakarta Sans, sans-serif" }}>{tier.name}</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-black" style={{ fontFamily: "var(--font-headline), Plus Jakarta Sans, sans-serif" }}>${tier.price}</span>
                  <span style={{ color: "#515d64" }}>{tier.period}</span>
                </div>
                <ul className="space-y-3 mb-8 flex-grow">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-center gap-3 text-sm">
                      <span className="material-symbols-outlined text-sm fill-icon" style={{ color: "#0e666a" }}>
                        {tier.highlighted ? "stars" : "check_circle"}
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  className="w-full py-3 rounded-full font-bold transition-all"
                  style={
                    tier.highlighted
                      ? { fontFamily: "var(--font-headline), Plus Jakarta Sans, sans-serif", backgroundColor: "#0e666a", color: "#c8fcff", boxShadow: "0 8px 24px rgba(14,102,106,0.25)" }
                      : { fontFamily: "var(--font-headline), Plus Jakarta Sans, sans-serif", border: "2px solid #8b4b00", color: "#8b4b00", backgroundColor: "transparent" }
                  }
                >
                  {tier.cta}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Learning Tracks ─── */}
        <section className="py-16 md:py-24 overflow-hidden" style={{ backgroundColor: "rgba(228,243,252,0.3)" }}>
          <div className="max-w-7xl mx-auto px-6 md:px-8">
            <div className="mb-12">
              <h2 className="text-3xl md:text-4xl font-extrabold mb-3" style={{ fontFamily: "var(--font-headline), Plus Jakarta Sans, sans-serif", color: "#243036" }}>
                Choose Your Track
              </h2>
              <p style={{ color: "#515d64" }}>Structured paths to take you from first steps to center stage.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
              {[
                {
                  num: "01", title: "Starter Track", bg: "#fdd400", text: "#594a00", border: "#6d5a00",
                  items: ["Intro to Rhythm", "Focus & Eye Contact", "Luring Techniques", "The First Spin", "Heel Work Essentials"],
                },
                {
                  num: "02", title: "Intermediate Track", bg: "#ff8f00", text: "#462300", border: "#8b4b00",
                  items: ["Distance Work", "Reverse Weaving", "Cues at Speed", "Lateral Movement", "Prop Integration"],
                },
                {
                  num: "03", title: "Expert Track", bg: "#a6eff3", text: "#005b5f", border: "#0e666a",
                  items: ["Narrative Staging", "Syncopated Rhythm", "Aerial Tricks", "Full Performance Flow", "Showmanship Mastery"],
                },
              ].map((track) => (
                <div key={track.num}>
                  <div className="flex items-center gap-3 mb-5">
                    <span className="w-10 h-10 rounded-full flex items-center justify-center font-black text-sm" style={{ backgroundColor: track.bg, color: track.text }}>
                      {track.num}
                    </span>
                    <h4 className="text-xl font-bold" style={{ fontFamily: "var(--font-headline), Plus Jakarta Sans, sans-serif" }}>{track.title}</h4>
                  </div>
                  <div className="space-y-2">
                    {track.items.map((item, idx) => (
                      <div key={item} className="p-4 rounded-lg shadow-sm text-sm" style={{
                        backgroundColor: "#ffffff",
                        opacity: idx === 0 ? 1 : 0.7,
                        borderLeft: idx === 0 ? `4px solid ${track.border}` : undefined,
                      }}>
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Testimonials ─── */}
        <section className="py-16 md:py-24 max-w-7xl mx-auto px-6 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">
            <div>
              <span className="inline-block text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-6" style={{ backgroundColor: "#fdd400", color: "#594a00" }}>
                Student Spotlight
              </span>
              <h2 className="text-3xl md:text-5xl font-extrabold mb-8 leading-tight" style={{ fontFamily: "var(--font-headline), Plus Jakarta Sans, sans-serif", color: "#243036" }}>
                &ldquo;The most clear, structured, and joyful training we&apos;ve ever done.&rdquo;
              </h2>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full overflow-hidden relative flex-shrink-0">
                  <Image
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDps2UDcOtJtPGT5UGKBffn_YtzUFxS7Q8hXx9RYig92kgX3WKspQaA86SJfyioqvAr3krjS2MKBMQSocu44WWiSc84O7u5zzbweC_biYhAqPzslWOPDeA_gcHSs-xzxh3rQMLNsXbjs4mgey9ZjjWzVfhVAiIV4H7_tpXQiV2r9IZwuu0KgSQjcxJLCx4yBe6E-fXA7DfZl5F_SGUnp87s60FWQ7mXCDL5-vJqxaXNy0JhvQeJcDTxDJJPZo0Scph8fkdo0lsMqoKI"
                    alt="Sarah student portrait"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <div>
                  <p className="font-bold">Sarah &amp; Bella</p>
                  <p className="text-sm font-medium" style={{ color: "#6c7980" }}>Foundations &amp; Expert Graduate</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-xl shadow-sm sm:mt-8">
                <p className="text-sm italic mb-4" style={{ color: "#515d64" }}>&ldquo;My dog literally waits by the laptop for Roni&apos;s voice. We&apos;ve built so much trust.&rdquo;</p>
                <p className="font-bold text-xs">— Marcus &amp; Toby</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm">
                <p className="text-sm italic mb-4" style={{ color: "#515d64" }}>&ldquo;I never thought my senior rescue dog could dance. These mini-courses are magic.&rdquo;</p>
                <p className="font-bold text-xs">— Elena &amp; Luna</p>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Lead Capture ─── */}
        <section className="max-w-7xl mx-auto px-6 md:px-8 mb-16">
          <div className="kinetic-gradient rounded-xl p-8 md:p-14 flex flex-col md:flex-row items-center gap-8 md:gap-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none select-none">
              <span className="material-symbols-outlined fill-icon" style={{ fontSize: "12rem" }}>pets</span>
            </div>
            <div className="flex-grow z-10">
              <h2 className="text-3xl md:text-5xl font-black mb-3" style={{ fontFamily: "var(--font-headline), Plus Jakarta Sans, sans-serif", color: "#fff0e6" }}>
                Start Your First Dance Today
              </h2>
              <p className="text-lg" style={{ color: "rgba(255,240,230,0.8)" }}>
                Sign up for our &lsquo;Free Mini-Class&rsquo; and learn 3 foundational moves in under 15 minutes.
              </p>
            </div>
            <div className="w-full md:w-auto z-10">
              {submitted ? (
                <div className="bg-white/20 px-8 py-5 rounded-full text-center" style={{ color: "#fff0e6" }}>
                  <span className="material-symbols-outlined fill-icon align-middle mr-2">check_circle</span>
                  Check your inbox!
                </div>
              ) : (
                <form
                  onSubmit={handleSignup}
                  className="flex rounded-full overflow-hidden"
                  style={{ backgroundColor: "rgba(255,255,255,0.15)", backdropFilter: "blur(12px)" }}
                >
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email address"
                    className="bg-transparent border-none focus:ring-0 px-5 py-3 w-full text-sm placeholder:text-white/60"
                    style={{ color: "#fff0e6", outline: "none" }}
                  />
                  <button
                    type="submit"
                    className="bg-white px-6 py-3 font-bold whitespace-nowrap rounded-full m-1 hover:bg-orange-50 transition-colors text-sm"
                    style={{ fontFamily: "var(--font-headline), Plus Jakarta Sans, sans-serif", color: "#8b4b00" }}
                  >
                    Free Class
                  </button>
                </form>
              )}
              <p className="text-[10px] mt-2 opacity-60 text-center" style={{ color: "#fff0e6" }}>
                No credit card required. Instant access.
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
