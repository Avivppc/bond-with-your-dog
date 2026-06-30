import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata = { title: "The BONDED Method" };

const stages = [
  {
    badge: "Chapter One",
    badgeBg: "bg-primary-container/20 text-primary-dim",
    badgeIcon: "favorite",
    title: "Build the relationship everything else depends on.",
    body: "Every extraordinary partnership starts with trust. In Foundations, you'll learn how to communicate with your dog, build engagement, and create the confidence that makes everything else possible.",
    learn: [
      "Understanding communication",
      "Building trust & engagement",
      "Positive reinforcement",
      "Focus & attention",
      "Everyday communication",
    ],
    learnColor: "text-primary",
    perfectFor: [
      { icon: "person", label: "First-time learners" },
      { icon: "pets", label: "Dogs of every age/breed" },
      { icon: "handshake", label: "Stronger everyday relationship" },
    ],
    perfectColor: "text-secondary",
    outcome: "Your dog chooses to connect with you.",
    outcomeColor: "text-primary",
    outcomeBg: "bg-surface-container-lowest border border-surface-variant/50",
    ctaLabel: "Start with Foundations",
    ctaBg: "bg-primary text-on-primary shadow-lg",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuDHyJiUzX8ER7NdiNymf4mETCdS4NFeR7yaGBcLcmlhWx7dXy0GNpP8EijGwky_Ow_lO49Y8bKJKXt9-o3sls5djDqLg0uZyD3kjXsSHveQuPD-sIiMtV8kD5wPMzoEWjW4AqC93iP9jle8O7gpYJaLI2EYhvNnlAB-0TTEbxbpjv4_JzX2wsclZ9AIDAhwB86wdkJqboInKaUW1QsRSGLVFCs68KfhwXip2nK7GBu12GyriEQmy0tdcKRgJByF-sfWYnRh6-8DVeXBGaM",
    imgAlt: "Handler and puppy building eye contact",
    sectionBg: "bg-surface-container-low",
    reverse: false,
  },
  {
    badge: "Chapter Two",
    badgeBg: "bg-secondary-container/30 text-secondary-dim",
    badgeIcon: "directions_run",
    title: "Turn connection into movement.",
    body: "Once trust is in place, movement becomes a powerful new way to communicate. Discover creative exercises, games, and techniques that help you and your dog move together with confidence and joy.",
    learn: [
      "Movement games",
      "Body awareness",
      "Trick foundations",
      "Confidence building",
      "Creative teamwork",
    ],
    learnColor: "text-secondary",
    perfectFor: [
      { icon: "school", label: "Graduates of Foundations" },
      { icon: "explore", label: "Owners looking for shared activities" },
      { icon: "group", label: "Teams ready for the next step" },
    ],
    perfectColor: "text-primary",
    outcome: "Move together naturally and confidently.",
    outcomeColor: "text-secondary",
    outcomeBg: "bg-surface-container-low",
    ctaLabel: "Start Your Journey",
    ctaBg: "bg-secondary text-on-secondary shadow-lg",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuAg9cBnR3Vj5iXAGBDAc-skHIoikiOoUpn0GVEc2SMvrdQAAHB-mfo2PMSdR5PL0XukAug3bB4KgjhMOi3PWh_igv5g0Do6cgOGuko2CEdn916IY3eqw5ZJQboBRyrsJzMIYqkxI-oTesZS3j_uyv9xFUYPBaN73XTFtksX2j274On5GG7tKBFi8QMcJ-adqcwWOE3dlgNWeAkZhLxZT5kpvnd2KmN9Frly12jSHb_YJQhX7P9yXf9NQBHPTXVzDoeXCHAwzEalIEogZwM",
    imgAlt: "Dog jumping with handler in golden hour",
    sectionBg: "bg-surface-container-lowest",
    reverse: true,
  },
  {
    badge: "Chapter Three",
    badgeBg: "bg-tertiary-container/30 text-tertiary-dim",
    badgeIcon: "stars",
    title: "Express everything you've built together.",
    body: "Dog dance isn't the goal. It's the celebration. Bring together everything you've learned to create beautiful routines that reflect the trust, communication, and connection you've built along the way.",
    learn: [
      "Musicality",
      "Choreography",
      "Creative expression",
      "Advanced communication",
      "Performance confidence",
    ],
    learnColor: "text-tertiary",
    perfectFor: [
      { icon: "school", label: "Graduates of Movement" },
      { icon: "music_note", label: "Dog dance enthusiasts" },
      { icon: "celebration", label: "Teams ready for something extraordinary" },
    ],
    perfectColor: "text-secondary",
    outcome: "Create something unforgettable together.",
    outcomeColor: "text-tertiary",
    outcomeBg: "bg-surface-container-lowest border border-surface-variant/50",
    ctaLabel: "Begin Your Masterpiece",
    ctaBg: "bg-tertiary text-on-tertiary shadow-lg",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuDX2wtzMc15U__HtwlCpM-8FTHeqECkpwYk9MgmdiDJbqhLMLRis_yL9lBi-nqwsSVTk5B2otcRYOZnQS2aSa78iIzxBBneO-d2hsTz2v5VsGzgUUUNhNu8rnsDkd6pPnjyv3sKeZGzU9Qa-TpS7ISKfgKcNdOJnE8fR-DDKxxzDW1VApOs3fLFH_-lxkcZFgTOSXxQRVp4C1Y5x2CfcUnWfcwvW15iBLK5IK4SnpLsvYa5LkQ9sSbUP7BB5icTzK_JLRxggrb7ikh71qg",
    imgAlt: "Woman and dog dancing in studio",
    sectionBg: "bg-surface-container-low",
    reverse: false,
  },
];

const principles = [
  {
    icon: "handshake",
    iconBg: "bg-primary-container/20 text-primary",
    title: "1. Trust Comes First",
    body: "Connection before correction. We build an unbreakable bond based on mutual understanding.",
  },
  {
    icon: "psychology",
    iconBg: "bg-secondary-container/20 text-secondary",
    title: "2. Learn Together",
    body: "Lessons strengthen both ends of the leash, making you a better partner for your dog.",
  },
  {
    icon: "trending_up",
    iconBg: "bg-tertiary-container/20 text-tertiary",
    title: "3. Progress That Lasts",
    body: "Small moments become lifelong habits, ensuring sustainable and joyous results.",
  },
];

export default function CoursesPage() {
  return (
    <>
      <Navbar />
      <main className="pt-24 pb-20">

        {/* Hero */}
        <section className="relative max-w-7xl mx-auto px-6 py-20 lg:py-32 flex flex-col lg:flex-row items-center gap-16">
          <div className="lg:w-1/2 z-10 space-y-8">
            <h1 className="font-display text-5xl lg:text-7xl font-extrabold tracking-tight text-on-background leading-[1.1]">
              Every extraordinary relationship{" "}
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-container">
                follows a path.
              </span>
            </h1>
            <p className="font-body text-lg lg:text-xl text-on-surface-variant max-w-xl leading-relaxed">
              The BONDED Method is a step-by-step journey designed to help you
              build trust, communication, and a lifelong bond with your dog.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button className="bg-gradient-to-r from-primary to-primary-container text-on-primary font-label text-base font-semibold px-8 py-4 rounded-full shadow-lg shadow-primary/20 hover:scale-105 transition-transform flex items-center justify-center gap-2">
                Start with Foundations
                <span
                  className="material-symbols-outlined text-sm"
                  style={{ fontVariationSettings: '"FILL" 1' }}
                >
                  arrow_forward
                </span>
              </button>
              <Link
                href="/quiz"
                className="bg-surface-container text-on-surface font-label text-base font-semibold px-8 py-4 rounded-full hover:bg-surface-container-high transition-colors flex items-center justify-center gap-2"
              >
                Find Your Journey
              </Link>
            </div>
          </div>
          <div className="lg:w-1/2 relative">
            <div className="absolute -inset-4 bg-secondary-container/30 rounded-[3rem] -rotate-3 transform scale-105" />
            <img
              className="relative z-10 w-full h-[600px] object-cover rounded-xl shadow-2xl"
              alt="Woman and golden retriever in a sunlit living room"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDpCqKqvd7rImrkJRY-yza3uxNGPUMw0mL6bjosRa8CREeU4gCBKBt1Uk3Vv5I2InEiqjwU49coEUofaTqd5soW3d04WEAm1Bvf5mRve0YWXGwXdl7ufYscOBdMUQ63Hgjhy1eRNgiv4abzvxAEb4hcAK8QOFbT20_zvAEMeYdoS03ZRGmjCSGuh6wgJNdkNjYFB6slw12JWeQfQEx0wA23VdGgRurNsmKB8ky679apPVFXbIqw9VQjmFPX6Fqo-JuwxOf5oR0QMyy8"
            />
          </div>
        </section>

        {/* Method Overview */}
        <section className="max-w-7xl mx-auto px-6 py-24 text-center">
          <div className="max-w-3xl mx-auto mb-16 space-y-6">
            <h2 className="font-display text-4xl lg:text-5xl font-bold text-on-background">
              One method. Three stages.{" "}
              <br />
              One incredible relationship.
            </h2>
            <p className="font-body text-lg text-on-surface-variant">
              Every stage builds on the one before it, helping you create a
              stronger connection with your dog through trust, movement, and
              shared experiences.
            </p>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 relative">
            <div className="hidden md:block absolute top-1/2 left-[10%] right-[10%] h-1 bg-surface-container -z-10 rounded-full" />
            {[
              { icon: "favorite", iconBg: "bg-primary-container", iconColor: "text-on-primary-container", label: "Foundation" },
              { icon: "directions_run", iconBg: "bg-secondary-container", iconColor: "text-on-secondary-container", label: "Movement" },
              { icon: "stars", iconBg: "bg-tertiary-container", iconColor: "text-on-tertiary-container", label: "Masterpiece" },
            ].map(({ icon, iconBg, iconColor, label }) => (
              <div
                key={label}
                className="flex-1 flex flex-col items-center gap-4 bg-surface-container-lowest p-8 rounded-xl hover:scale-[1.02] hover:bg-surface-bright transition-all duration-500 shadow-sm z-10 w-full md:w-auto mt-4 md:mt-0 first:mt-0"
              >
                <div className={`w-16 h-16 rounded-full ${iconBg} ${iconColor} flex items-center justify-center mb-2`}>
                  <span
                    className="material-symbols-outlined text-3xl"
                    style={{ fontVariationSettings: '"FILL" 1' }}
                  >
                    {icon}
                  </span>
                </div>
                <h3 className="font-display text-xl font-bold text-on-surface">{label}</h3>
              </div>
            ))}
          </div>
        </section>

        {/* Three Stage Sections */}
        {stages.map(
          ({
            badge, badgeBg, badgeIcon, title, body, learn, learnColor, perfectFor, perfectColor,
            outcome, outcomeColor, outcomeBg, ctaLabel, ctaBg, img, imgAlt, sectionBg, reverse,
          }) => (
            <section key={badge} className={`max-w-7xl mx-auto px-6 py-24`}>
              <div
                className={`${sectionBg} rounded-[3rem] p-8 lg:p-16 flex flex-col ${reverse ? "lg:flex-row-reverse" : "lg:flex-row"} items-center gap-16 relative overflow-hidden`}
              >
                {!reverse && (
                  <div className="absolute top-0 right-0 w-96 h-96 bg-secondary-container/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
                )}
                {badge === "Chapter Three" && (
                  <div className="absolute bottom-0 left-0 w-96 h-96 bg-tertiary-container/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
                )}
                <div className="lg:w-1/2 relative z-10">
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${badgeBg} font-label text-sm font-bold mb-6`}>
                    <span
                      className="material-symbols-outlined text-sm"
                      style={{ fontVariationSettings: '"FILL" 1' }}
                    >
                      {badgeIcon}
                    </span>
                    {badge}
                  </div>
                  <h2 className="font-display text-4xl lg:text-5xl font-bold text-on-background mb-6">
                    {title}
                  </h2>
                  <p className="font-body text-lg text-on-surface-variant mb-8">{body}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                    <div>
                      <h4 className="font-display text-lg font-bold text-on-surface mb-4">
                        You&apos;ll Learn:
                      </h4>
                      <ul className="space-y-3 font-body text-on-surface-variant">
                        {learn.map((item) => (
                          <li key={item} className="flex items-start gap-2">
                            <span className={`material-symbols-outlined ${learnColor} text-xl`}>
                              check_circle
                            </span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-display text-lg font-bold text-on-surface mb-4">
                        Perfect For:
                      </h4>
                      <ul className="space-y-3 font-body text-on-surface-variant">
                        {perfectFor.map(({ icon, label }) => (
                          <li key={label} className="flex items-start gap-2">
                            <span className={`material-symbols-outlined ${perfectColor} text-xl`}>
                              {icon}
                            </span>
                            {label}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className={`${outcomeBg} p-6 rounded-2xl shadow-sm mb-8`}>
                    <p className="font-display font-semibold text-on-surface">
                      <span className={`${outcomeColor} mr-2`}>Outcome:</span>
                      {outcome}
                    </p>
                  </div>
                  <button className={`${ctaBg} font-label text-base font-semibold px-8 py-4 rounded-full hover:scale-105 transition-transform flex items-center justify-center gap-2`}>
                    {ctaLabel}
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                </div>
                <div className="lg:w-1/2 relative h-full min-h-[500px]">
                  {reverse && (
                    <div className="absolute -inset-4 bg-primary-container/20 rounded-2xl rotate-3 transform scale-105" />
                  )}
                  <img
                    className="absolute inset-0 w-full h-full object-cover rounded-2xl shadow-xl z-10"
                    alt={imgAlt}
                    src={img}
                  />
                </div>
              </div>
            </section>
          )
        )}

        {/* Why It Works */}
        <section className="max-w-7xl mx-auto px-6 py-24 bg-surface rounded-[3rem]">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="font-display text-4xl lg:text-5xl font-bold text-on-background mb-4">
              Built on connection.{" "}
              <br />
              Backed by experience.
            </h2>
            <p className="font-body text-lg text-on-surface-variant">
              Combining professional training, positive reinforcement, and
              real-world success.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {principles.map(({ icon, iconBg, title, body }, i) => (
              <div
                key={title}
                className={`bg-surface-container-lowest p-8 rounded-2xl hover:scale-[1.02] hover:bg-surface-bright transition-all duration-500 shadow-sm border border-surface-variant/30 text-center${i > 0 ? " mt-8 md:mt-0" : ""}`}
              >
                <div className={`w-16 h-16 mx-auto ${iconBg} rounded-full flex items-center justify-center mb-6`}>
                  <span className="material-symbols-outlined text-3xl">{icon}</span>
                </div>
                <h3 className="font-display text-xl font-bold text-on-surface mb-3">{title}</h3>
                <p className="font-body text-on-surface-variant">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Quiz CTA */}
        <section className="max-w-7xl mx-auto px-6 py-24">
          <div className="bg-secondary-container rounded-[3rem] overflow-hidden flex flex-col md:flex-row shadow-lg">
            <div className="md:w-1/2 p-12 lg:p-20 flex flex-col justify-center">
              <h2 className="font-display text-4xl font-bold text-on-secondary-container mb-4">
                Not Sure Where To Start?
              </h2>
              <p className="font-body text-lg text-on-secondary-container/80 mb-8">
                Answer a few quick questions and we&apos;ll recommend the best
                stage for you and your dog.
              </p>
              <button className="bg-on-secondary-container text-secondary-container font-label text-base font-bold px-8 py-4 rounded-full w-max hover:bg-secondary transition-colors shadow-md">
                Take the Quiz
              </button>
            </div>
            <div className="md:w-1/2 h-64 md:h-auto relative">
              <img
                className="absolute inset-0 w-full h-full object-cover"
                alt="Dog owner with tablet and dog"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCOgff1QCm6gC1Bhp-u12qqaWQ185Eg2VflcxmFIi36CJyticRFNHctHQmDihgK2BEzVFe793MBT_bnMQ8tz3i4AgRz89GsS-N3jcw_zniNRaNnAh0LwS7fB9APV0E0yNYC-nwnUDDK3LTkymnppydBzdTJqAtWLwdAgBrjwIGLqXh2FQT_waJGkkQj9aHDqtpGFG4b8zbDDGRL8uTGHBgGT4Z6ovAXE_-OnXeaJEIEV7xm2MsDDnNs8kZIVStadtb911CYbnc5ACyV"
              />
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="max-w-3xl mx-auto px-6 pb-24 text-center">
          <h2 className="font-display text-5xl font-extrabold text-on-background mb-6">
            Every great relationship starts with one step.
          </h2>
          <p className="font-body text-xl text-on-surface-variant mb-10">
            Your dog is already speaking. Let&apos;s learn the language together.
          </p>
          <button className="bg-gradient-to-r from-primary to-primary-container text-on-primary font-label text-lg font-bold px-10 py-5 rounded-full shadow-xl hover:scale-105 transition-transform">
            Start with Foundations
          </button>
        </section>

      </main>
      <Footer />
    </>
  );
}
