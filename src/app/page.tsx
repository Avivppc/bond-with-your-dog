import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata = { title: "BONDED - Build Your Bond" };

const COMMUNITY_BG =
  "https://lh3.googleusercontent.com/aida/AP1WRLuKfN_FAkzj-B8cFzyTUvYSYcgpUq2IgmA4kT4VCf0XYPyzBgOcE0Lzd1oDVuPdoVMeGMuzkYlvd_FsVNbA5lr2iDeTk4ozfPQICxFn2dMtCE32rYi0VXlUN3UiCmoGE10On2vMkf2w5F6i6s3EYFm9zDqckN93YfTlnuZH8BPq0BaZfIDuYNQvGhO-WUczxyP0wnehy4m9gtb1-VWnjvC1mikGjyPvbkk0X7Gnof_pc4KJ3q8PF8wKWOT3";

const journeyTracks = [
  {
    num: "01",
    title: "Foundations",
    badgeClass: "bg-tertiary-container text-on-tertiary-container",
    firstBorder: "border-tertiary",
    iconClass: "bg-[#fdd400]/20 border border-[#edc600]",
    lessons: [
      { label: "Intro", slug: "intro" },
      { label: "Basic Foundations", slug: "basic-foundations" },
      { label: "Leash Walking", slug: "leash-walking" },
      { label: "Basic Skills", slug: "basic-skills" },
      { label: "Basic Tricks", slug: "basic-tricks" },
    ],
  },
  {
    num: "02",
    title: "Movement",
    badgeClass: "bg-primary-container text-on-primary-container",
    firstBorder: "border-primary",
    iconClass: "bg-[#ff8f00]/16 border border-[#eb8300]",
    lessons: [
      { label: "Fun Tricks", slug: "fun-tricks" },
      { label: "Take A Selfie", slug: "take-a-selfie" },
      { label: "Give A Hug", slug: "give-a-hug" },
      { label: "Jump Basics", slug: "jump-basics" },
      { label: "Hoop Jumps", slug: "hoop-jumps" },
    ],
  },
  {
    num: "03",
    title: "Masterpiece",
    badgeClass: "bg-secondary-container text-on-secondary-container",
    firstBorder: "border-secondary",
    iconClass: "bg-[#a6eff3]/40 border border-[#0e666a]",
    lessons: [
      { label: "Dancing Skills", slug: "dancing-skills" },
      { label: "Adding Artistic Impressions", slug: "artistic-impressions" },
      { label: "Moving Together", slug: "moving-together" },
      { label: "Model Walk", slug: "model-walk" },
      { label: "Drunk Bunny", slug: "drunk-bunny" },
    ],
  },
];

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main className="pt-24 overflow-hidden">

        {/* Hero */}
        <section className="relative px-8 py-12 md:py-24 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-12 items-center text-center md:text-left">
          <div className="md:col-span-7 z-10 mx-auto md:mx-0 max-w-4xl">
            <h1 className="font-headline text-5xl md:text-7xl font-extrabold text-on-surface leading-[1.1] tracking-tight mb-6">
              Learn the secret language of your dog.
            </h1>
            <p className="text-lg md:text-xl text-on-surface-variant max-w-xl mx-auto md:mx-0 mb-10 leading-relaxed font-light">
              Transform the relationship you have with your dog through movement,
              play and positive reinforcement.
            </p>
            <div className="flex flex-wrap gap-4 justify-center md:justify-start">
              <button className="kinetic-gradient text-on-primary px-8 py-4 rounded-full font-headline font-bold text-lg shadow-xl shadow-primary/30 flex items-center gap-2 group">
                Build Your Bond
                <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">
                  arrow_forward
                </span>
              </button>
              <button className="bg-surface-container-high text-on-surface-variant px-8 py-4 rounded-full font-headline font-bold text-lg hover:bg-surface-container-highest transition-colors flex items-center gap-2">
                <span className="material-symbols-outlined text-xl">
                  play_circle
                </span>
                Watch Roni &amp; River
              </button>
            </div>
          </div>
          <div className="md:col-span-5 relative">
            <div className="absolute -top-12 -right-12 w-64 h-64 bg-secondary-container rounded-full blur-3xl opacity-30 animate-pulse" />
            <div className="relative rounded-xl overflow-visible aspect-square md:aspect-[4/5] bg-surface-container-low shadow-2xl">
              <img
                className="absolute inset-0 w-full h-full object-cover rounded-xl shadow-2xl scale-110 -rotate-3 hover:rotate-0 transition-transform duration-700"
                alt="Woman and dog in a warm living room"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBjBF_B1FWEqclU3JcKhgMvWbDkp4lbVbQwQyem4uGu0PVDEVZIfaYzfPSPlq4y74nSzQWKfTefjSoKNVZUItUOZUje3hRpNxsLc5h3PQpCR0cdfGo-M4VTQYX0JSZZsSHeLFCnKaLKDfy1FlgIwNp9I1bHm3KNxlJXhfPribXn4OvMbDzxKeLT2pQJv0upqPta4-eA-a2dOsYemMy69X8bLo65CZtUTCi_vKHzVdJZV_ft3Z8bANOH0YkxUdsqj42PY0jGU5w3CgkeJRE"
              />
            </div>
          </div>
        </section>

        {/* Social Proof */}
        <section className="bg-surface-container-low/50 py-12 mb-20">
          <div className="max-w-7xl mx-auto px-8">
            <p className="text-center font-label text-xs uppercase tracking-[0.2em] text-outline mb-10 font-bold">
              As Seen On &amp; Featured In
            </p>
            <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
              <span className="font-headline text-2xl font-black">AGT</span>
              <span className="font-headline text-2xl font-bold">DOG SHOW</span>
              <span className="font-headline text-2xl font-black">NBC</span>
              <span className="font-headline text-2xl font-bold">K9 STYLE</span>
              <span className="font-headline text-2xl font-black">PETS PLUS</span>
            </div>
          </div>
        </section>

        {/* Course Overview */}
        <section className="px-8 max-w-7xl mx-auto mb-32 pt-16">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-4">
            <div>
              <h2 className="font-headline text-4xl md:text-5xl font-extrabold text-on-surface mb-4">
                Start Your Journey
              </h2>
              <p className="text-on-surface-variant max-w-md font-light">
                Start your path to a deeper connection.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCnhwjT5qcMl47SxoJE886F_z34yY2lY5aGza7bldpCCOoOG8wT0KGuIYfBF-PRAIABL0x2FRVbczeJ-vDu1lTrIjx5wPo2rBX3awuL8ry18WzuMWsHqF8I-1x8HprmcrMZC2Cy83KePBsE-dwggfOx3wtlJwij4AeYehnrGjSylLPgdpQ1DSuOPTAwZPYAA_nnZO3CEovm7tp4bbDRi5cqg66yclvQFHMPJT9lv7q8IW5iFt5sGF7hshTe1WSYYrKvHfdcxIJkS-9yqVY",
                chapter: "CHAPTER 01",
                icon: "favorite",
                badgeClass: "bg-primary text-on-primary",
                title: "Foundations",
                desc: "Build trust, communication and confidence.",
                cta: "Start Here",
              },
              {
                img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCeOV82TnwFEbpVF127JrtHzQeqzf-Y5hpt4iX2JeAgq9jz6JfQ7AxcrbF1gTQA5_3zKxD2K-R99VF75h5mRPtZriU7zXZ51tkiUaNwfTbwSVF5aOO1mRN0q_b7B2lr2typaErbuIM4Nb1fVrzM2U7iHg6PGQSFlLC9ZjZE8aQvxNUc6xkK6YVZlmi7LV_Cqx_NkuASrk0LSA_AyRPGb6GIvnKLu9RFLsCfiZdQPJBcROT83R4OnDC_0mtg2WTY9OUS5C66PpkiEgUkmW4",
                chapter: "CHAPTER 02",
                icon: "directions_run",
                badgeClass: "bg-secondary-container text-on-secondary-container",
                title: "Movement",
                desc: "Discover movement, play and shared experiences.",
                cta: "Explore",
              },
              {
                img: "https://lh3.googleusercontent.com/aida/AP1WRLuMxymK8kqjqrqr8B8Fe_ACuKQsgcTfA97Byb6HvYyEmz_kkSix5dkgfPZqth5Js-i8HJtYvTa8PsPrcOL2RVVrp6MNxYG-ZlQL4X7Js__1RTzLB6XZadAyT4jNm_xhV-FJeKf18QlsDsIKmxjtJC1JcBIQ7ObRtXzmIzJP-aK6iMjimapbQtb8jwaiwOtEz3yhs11KKSofUrf-AFJLOnjLcs_Nd-QasjJwCAtAUHmsaKjIIiPOdyykg5Bu",
                chapter: "CHAPTER 03",
                icon: "stars",
                badgeClass: "bg-tertiary-container text-on-tertiary-container",
                title: "Masterpiece",
                desc: "Create beautiful routines built on real connection.",
                cta: "Discover",
              },
            ].map(({ img, chapter, icon, badgeClass, title, desc, cta }, i) => (
              <div
                key={title}
                className="group bg-surface-container-lowest p-6 rounded-lg shadow-sm hover:scale-[1.02] transition-all duration-500 flex flex-col h-full relative"
              >
                <div className="aspect-video rounded-md overflow-hidden mb-6 relative bg-surface-container-low">
                  <img
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    alt={title}
                    src={img}
                  />
                </div>
                <div className="absolute top-4 -left-2 z-20">
                  <div
                    className={`${badgeClass} font-label text-[10px] font-bold tracking-widest px-4 py-2 rounded-r-full shadow-lg relative -left-2 flex items-center gap-2`}
                  >
                    <span
                      className="material-symbols-outlined text-xs"
                      style={{ fontVariationSettings: '"FILL" 1' }}
                    >
                      {icon}
                    </span>
                    {chapter}
                  </div>
                </div>
                <h3 className="font-headline text-2xl font-bold mb-2">{title}</h3>
                <p className="text-on-surface-variant text-sm mb-6 flex-grow font-light font-body">
                  {desc}
                </p>
                <div className="flex justify-between items-center pt-6 border-t border-surface-container-high">
                  <button className="text-primary font-bold flex items-center gap-1 group/btn w-fit">
                    {cta}{" "}
                    <span className="material-symbols-outlined text-lg group-hover/btn:translate-x-1 transition-transform">
                      arrow_forward
                    </span>
                  </button>
                </div>
                {i < 2 && (
                  <div className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 z-10">
                    <span className="material-symbols-outlined text-outline-variant/30 text-3xl">
                      chevron_right
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* The Method */}
        <section className="py-24 max-w-7xl mx-auto px-8 text-center mb-16 bg-surface-container-low/30 rounded-3xl">
          <h2 className="font-headline text-4xl md:text-5xl font-extrabold mb-16">
            A new way to grow together.
          </h2>
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 max-w-4xl mx-auto">
            {[
              { icon: "handshake", label: "Trust" },
              { icon: "forum", label: "Communication" },
              { icon: "directions_run", label: "Movement" },
              { icon: "all_inclusive", label: "Connection" },
              { icon: "sentiment_very_satisfied", label: "Joy" },
            ].map(({ icon, label }, i) => (
              <div key={label} className="flex flex-col items-center">
                {i > 0 && (
                  <>
                    <span className="material-symbols-outlined text-outline hidden md:block">
                      arrow_forward
                    </span>
                    <span className="material-symbols-outlined text-outline md:hidden rotate-90">
                      arrow_forward
                    </span>
                  </>
                )}
                <div className="w-20 h-20 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-3xl">{icon}</span>
                </div>
                <span className="font-bold text-lg">{label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Choose Your Track */}
        <section className="py-24 bg-surface-container-low/30 overflow-hidden mb-20">
          <div className="max-w-7xl mx-auto px-8">
            <div className="mb-16">
              <h2 className="font-headline text-4xl font-extrabold mb-4">
                See Your Journey
              </h2>
              <p className="text-on-surface-variant">
                Structured paths to take you from first steps to center stage.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {journeyTracks.map((track) => (
                <div key={track.num}>
                  <div className="flex items-center gap-3 mb-6">
                    <span
                      className={`${track.badgeClass} w-10 h-10 rounded-full flex items-center justify-center font-black`}
                    >
                      {track.num}
                    </span>
                    <h4 className="font-headline text-xl font-bold">
                      {track.title}
                    </h4>
                  </div>
                  <div className="space-y-3">
                    {track.lessons.map((lesson, i) => (
                      <div
                        key={lesson.slug}
                        className={`flex items-center gap-4 p-3 bg-surface-container-lowest rounded-md shadow-sm ${
                          i === 0 ? `border-l-4 ${track.firstBorder}` : ""
                        }`}
                      >
                        <div
                          className={`flex-shrink-0 w-12 h-12 rounded-full overflow-hidden flex items-center justify-center ${track.iconClass}`}
                        >
                          <img
                            src={`/sketches/${lesson.slug}.jpg`}
                            alt={lesson.label}
                            className="w-[112%] h-[112%] object-contain mix-blend-multiply"
                          />
                        </div>
                        <span className="font-medium">{lesson.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Meet Roni */}
        <section className="bg-surface-container-high py-24 mb-20">
          <div className="max-w-7xl mx-auto px-8 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div className="relative order-2 md:order-1">
              <div className="bg-white p-4 rounded-lg shadow-2xl rotate-2 relative z-10">
                <img
                  className="w-full h-auto rounded"
                  alt="Roni Sagi with her dog"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBP5m4MCqFjtUz0LP9gHzPCK7bbYli879S8PeoltJn8TakNfnvhBPGO3qS6KAetKHmIvoZ0_VHpoTylbRdhdQsd4yc-WontJWDL3cuGHqTWmTgXts0BzvZdARHwTCTlE85VXPuTc7yCnB3QGkeX9OlN1zD6V0m-qgExYtAWdBr_l4BWmv7jK3vg_ZkLnRFwrDqZxTLP7BW42Czi_CeIUbZZiqIX-hpNLPfSG5D5QKYbdCK9eXlJjJEclUUs7xodqeBgOeTQX54z0Jd7yb0"
                />
              </div>
              <div className="absolute -bottom-8 -left-8 bg-secondary-container p-6 rounded-lg shadow-xl z-20 max-w-[240px]">
                <p className="font-headline font-bold text-on-secondary-container italic">
                  "It's not about the tricks; it's about the conversation you have
                  with your dog."
                </p>
              </div>
            </div>
            <div className="order-1 md:order-2">
              <span className="text-primary font-bold uppercase tracking-widest text-sm mb-4 block">
                Meet Your Coach
              </span>
              <h2 className="font-headline text-4xl md:text-5xl font-extrabold mb-6">
                Meet the creator of BONDED.
              </h2>
              <p className="text-on-surface-variant text-lg font-light leading-relaxed mb-6">
                Millions discovered Roni through breathtaking performances. What
                they truly fell in love with was the relationship behind them.
                BONDED is the method she created to help every dog owner
                experience that connection.
              </p>
              <div className="flex flex-wrap md:flex-nowrap items-center gap-8 md:gap-12 mb-8">
                <div>
                  <p className="text-3xl font-headline font-black text-primary">AGT</p>
                  <p className="text-sm text-outline font-bold">Finalist</p>
                </div>
                <div>
                  <p className="text-3xl font-headline font-black text-primary">+1M</p>
                  <p className="text-sm text-outline font-bold">Social</p>
                </div>
                <div>
                  <p className="text-3xl font-headline font-black text-primary">Global</p>
                  <p className="text-sm text-outline font-bold">Education</p>
                </div>
              </div>
              <button className="inline-flex items-center justify-center px-8 py-3 rounded-full border-2 border-primary text-primary font-headline font-bold text-sm hover:bg-primary hover:text-on-primary transition-all duration-300 mt-4">
                Get To Know Roni
              </button>
            </div>
          </div>
        </section>

        {/* Success Stories */}
        <section className="py-24 max-w-7xl mx-auto px-8 mb-20 bg-surface-container-low/30 rounded-3xl">
          <div className="text-center mb-16">
            <h2 className="font-headline text-4xl md:text-5xl font-extrabold mb-4">
              Bonded Stories
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-surface p-12 rounded-2xl shadow-sm flex flex-col justify-between">
              <p className="text-xl font-light leading-relaxed mb-8 italic">
                I love the program! I am very much a beginner and I worried that
                the online format wouldn&apos;t work for me. I was WRONG. The
                courses are well planned and the videos are clear.
              </p>
              <div>
                <p className="font-bold text-lg text-primary">Shari Divone &amp; Linus</p>
                <p className="text-sm text-outline">Foundations</p>
              </div>
            </div>
            <div className="bg-surface p-12 rounded-2xl shadow-sm flex flex-col justify-between">
              <p className="text-xl font-light leading-relaxed mb-8 italic">
                I was working on the first lesson from your site and couldn&apos;t
                believe how quickly my dog responded. This method is unlike
                anything I&apos;ve tried before.
              </p>
              <div>
                <p className="font-bold text-lg text-primary">Marcus &amp; Toby</p>
                <p className="text-sm text-outline">Move Together Alumni</p>
              </div>
            </div>
          </div>
        </section>

        {/* Community */}
        <section className="relative py-32 overflow-hidden mb-20">
          <div className="absolute inset-0 z-0">
            <img
              className="w-full h-full object-cover opacity-20"
              alt="Community background"
              src={COMMUNITY_BG}
            />
            <div className="absolute inset-0 bg-surface-container-lowest/80 backdrop-blur-sm" />
          </div>
          <div className="max-w-4xl mx-auto px-8 relative z-10 text-center">
            <h2 className="font-headline text-4xl md:text-5xl font-extrabold mb-6">
              You&apos;re building this bond together.
            </h2>
            <p className="text-xl text-on-surface-variant font-light mb-10 max-w-2xl mx-auto">
              Join a global community of owners. Participate in challenges, live
              Q&amp;As with Roni, and share your most beautiful connection moments.
            </p>
            <button className="kinetic-gradient text-on-primary px-8 py-4 rounded-full font-headline font-bold text-lg shadow-xl shadow-primary/30">
              Join the Community
            </button>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-24 max-w-3xl mx-auto px-8 mb-20">
          <div className="text-center mb-16">
            <h2 className="font-headline text-4xl font-extrabold">
              Frequently Asked Questions
            </h2>
          </div>
          <div className="space-y-4">
            {[
              {
                q: "Can any dog learn?",
                a: "Absolutely. The BONDED method is built on connection, not breed-specific traits. Whether you have a puppy or a senior rescue, the focus is on building trust at your dog's pace.",
              },
              {
                q: "Do I need experience?",
                a: "No prior training experience is required. Our Foundation path starts from the very beginning, teaching you the fundamental language of positive reinforcement.",
              },
              {
                q: "How much time does it take?",
                a: "Just 10-15 minutes a day. Short, positive, and consistent sessions are far more effective for building a lasting bond than long, exhausting drills.",
              },
            ].map(({ q, a }) => (
              <details
                key={q}
                className="bg-surface-container-low p-6 rounded-2xl group cursor-pointer"
              >
                <summary className="font-headline font-bold text-lg flex justify-between items-center">
                  {q}
                  <span className="material-symbols-outlined transition-transform group-open:rotate-180">
                    expand_more
                  </span>
                </summary>
                <p className="mt-4 text-on-surface-variant font-light leading-relaxed">
                  {a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="max-w-7xl mx-auto px-8 mb-32">
          <div className="kinetic-gradient rounded-3xl overflow-hidden relative aspect-video md:aspect-[21/9] flex items-center justify-center text-center p-8 text-on-primary">
            <div className="absolute inset-0 z-0">
              <img
                className="w-full h-full object-cover opacity-20 mix-blend-overlay"
                alt="Background"
                src={COMMUNITY_BG}
              />
            </div>
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <span
                className="material-symbols-outlined text-[12rem]"
                style={{ fontVariationSettings: '"FILL" 1' }}
              >
                pets
              </span>
            </div>
            <div className="relative z-10 max-w-2xl">
              <h2 className="font-headline text-4xl md:text-6xl font-extrabold mb-6 leading-tight">
                Your dog is already speaking.
              </h2>
              <p className="text-xl md:text-2xl text-on-primary/90 font-light mb-10">
                It&apos;s time to learn the language.
              </p>
              <button className="bg-white text-primary px-10 py-4 rounded-full font-headline font-bold text-lg hover:bg-orange-50 transition-colors shadow-xl">
                Build Your Bond
              </button>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
