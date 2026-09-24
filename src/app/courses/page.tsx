import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata = { title: "The Bonded Journey" };

interface PerfectFor {
  icon: string;
  label: string;
}

interface Stage {
  badge: string;
  badgeBg: string;
  badgeIcon: string;
  title: string;
  body: string;
  learn: string[];
  learnColor: string;
  perfectFor: PerfectFor[];
  perfectColor: string;
  outcome: string;
  outcomeColor: string;
  outcomeBg: string;
  ctaLabel: string;
  ctaHref: string;
  ctaBg: string;
  img: string;
  imgAlt: string;
  sectionBg: string;
  reverse: boolean;
}

// Copy per Roni's brief (Sept 2026).
const stages: Stage[] = [
  {
    badge: "Chapter One · Foundations",
    badgeBg: "bg-primary-container/20 text-primary-dim",
    badgeIcon: "favorite",
    title: "Build the foundation everything else grows from.",
    body: "Foundations is where you and your dog learn how to learn together. You'll build trust, communication and engagement, then turn them into everyday skills, confident movement and your first experiences of dancing as one.",
    learn: [
      "A clear shared language",
      "Engagement & focus",
      "Calm, practical everyday skills",
      "Understanding prey drive and how to play with your dog",
      "Confident movement and body awareness",
      "Tricks, the idea of sequences and mini dances",
    ],
    learnColor: "text-primary",
    perfectFor: [
      { icon: "pets", label: "New dogs and new partnerships" },
      { icon: "diversity_1", label: "Dogs of every age and experience" },
      { icon: "handshake", label: "Anyone ready to build a stronger bond" },
    ],
    perfectColor: "text-secondary",
    outcome: "A dog who understands you, chooses you and is ready to learn with you.",
    outcomeColor: "text-primary",
    outcomeBg: "bg-surface-container-lowest border border-surface-variant/50",
    ctaLabel: "Start with Foundations",
    ctaHref: "/chapter/foundations",
    ctaBg: "bg-primary text-on-primary shadow-lg",
    img: "/images/photos/borderonis-02.jpg",
    imgAlt: "Roni sitting on a staircase, her dog resting a paw on her knee",
    sectionBg: "bg-surface-container-low",
    reverse: false,
  },
  {
    badge: "Chapter Two · Moves",
    badgeBg: "bg-secondary-container/30 text-secondary-dim",
    badgeIcon: "directions_run",
    title: "Discover how much your dog is capable of.",
    body: "Moves expands the language you built in Foundations. You'll teach your dog a varied movement vocabulary, from expressive and contact tricks to backwards, sideways and jumping skills while building confidence, coordination and understanding.",
    learn: [
      "How to break down complex tricks",
      "Ground, balance and expressive tricks",
      "Backwards and sideways movement",
      "Contact tricks performed together",
      "Confident and carefully prepared jumps",
    ],
    learnColor: "text-secondary",
    perfectFor: [
      { icon: "school", label: "Teams who completed Bonded: Foundations" },
      { icon: "explore", label: "Dogs ready to expand their movement vocabulary" },
      { icon: "music_note", label: "Anyone preparing for the journey into dance" },
    ],
    perfectColor: "text-primary",
    outcome: "A confident dog with a growing vocabulary of movements you can perform together.",
    outcomeColor: "text-secondary",
    outcomeBg: "bg-surface-container-low",
    ctaLabel: "Learn the Moves",
    ctaHref: "/chapter/moves",
    ctaBg: "bg-secondary text-on-secondary shadow-lg",
    img: "/images/photos/borderonis-06.jpg",
    imgAlt: "Border collie standing on a stair rail, nose to nose with Roni",
    sectionBg: "bg-surface-container-lowest",
    reverse: true,
  },
  {
    badge: "Chapter Three · Let's Dance",
    badgeBg: "bg-tertiary-container/30 text-tertiary-dim",
    badgeIcon: "music_note",
    title: "Turn your movements into a dance.",
    body: "Let's Dance brings the pieces together. You'll prepare your dog's tricks for performance, develop your own movement and learn how to combine both with flow, expression and music—without losing your dog's confidence or connection.",
    learn: [
      "How to prepare tricks for dancing",
      "Human movement and musical expression",
      "How to move without distracting your dog",
      "Distance, independence and delayed reward",
      "Sequences that flow with the music",
    ],
    learnColor: "text-tertiary",
    perfectFor: [
      { icon: "school", label: "Teams who completed Bonded: Moves" },
      { icon: "person", label: "Handlers ready to become part of the movement" },
      {
        icon: "celebration",
        label: "Anyone ready to build their first dance or take their dog dancing to the next level",
      },
    ],
    perfectColor: "text-secondary",
    outcome: "A dance where you, your dog and the music move as one.",
    outcomeColor: "text-tertiary",
    outcomeBg: "bg-surface-container-lowest border border-surface-variant/50",
    ctaLabel: "Build Your Dance",
    ctaHref: "/chapter/lets-dance",
    ctaBg: "bg-tertiary text-on-tertiary shadow-lg",
    img: "/images/photos/borderonis-19.jpg",
    imgAlt: "Roni in a dance pose with her border collie leaning on her leg",
    sectionBg: "bg-surface-container-low",
    reverse: false,
  },
];

const overviewSteps = [
  { icon: "pets", iconBg: "bg-primary-container", iconColor: "text-on-primary-container", label: "Foundations" },
  { icon: "directions_run", iconBg: "bg-secondary-container", iconColor: "text-on-secondary-container", label: "Moves" },
  { icon: "music_note", iconBg: "bg-tertiary-container", iconColor: "text-on-tertiary-container", label: "Let's Dance" },
];

// Sentences are Roni's draft suggestions — pending her final approval.
const principles = [
  {
    icon: "handshake",
    iconBg: "bg-primary-container/20 text-primary",
    title: "1. Trust Comes First",
    body: "A dog who feels safe is ready to connect, explore and learn.",
  },
  {
    icon: "psychology",
    iconBg: "bg-secondary-container/20 text-secondary",
    title: "2. Learn Together",
    body: "Training becomes a conversation where both ends of the leash take part.",
  },
  {
    icon: "all_inclusive",
    iconBg: "bg-tertiary-container/20 text-tertiary",
    title: "3. Bond Through It All",
    body: "From everyday moments to new challenges, every experience becomes an opportunity to strengthen your bond.",
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
              <Link
                href="/chapter/foundations"
                className="bg-gradient-to-r from-primary to-primary-container text-on-primary font-label text-base font-semibold px-8 py-4 rounded-full shadow-lg shadow-primary/20 hover:scale-105 transition-transform flex items-center justify-center gap-2"
              >
                Start with Foundations
                <span
                  className="material-symbols-outlined text-sm"
                  style={{ fontVariationSettings: '"FILL" 1' }}
                >
                  arrow_forward
                </span>
              </Link>
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
              className="relative z-10 w-full h-[600px] object-cover object-top rounded-xl shadow-2xl"
              alt="Roni's dog jumping up to greet her in a lit corridor"
              src="/images/photos/borderonis-15.jpg"
            />
          </div>
        </section>

        {/* Method Overview */}
        <section className="max-w-7xl mx-auto px-6 py-24 text-center">
          <div className="max-w-3xl mx-auto mb-16 space-y-6">
            <h2 className="font-display text-4xl lg:text-5xl font-bold text-on-background">
              One journey. Three chapters.{" "}
              <br />
              A lifetime of possibilities.
            </h2>
            <p className="font-body text-lg text-on-surface-variant">
              Each chapter builds on the one before it—starting with
              communication, expanding into movement, and bringing everything
              together through dance.
            </p>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 relative">
            <div className="hidden md:block absolute top-1/2 left-[10%] right-[10%] h-1 bg-surface-container -z-10 rounded-full" />
            {overviewSteps.map(({ icon, iconBg, iconColor, label }) => (
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

        {/* Three Chapter Sections */}
        {stages.map(
          ({
            badge, badgeBg, badgeIcon, title, body, learn, learnColor, perfectFor, perfectColor,
            outcome, outcomeColor, outcomeBg, ctaLabel, ctaHref, ctaBg, img, imgAlt, sectionBg, reverse,
          }) => (
            <section key={badge} className="max-w-7xl mx-auto px-6 py-24">
              <div
                className={`${sectionBg} rounded-[3rem] p-8 lg:p-16 flex flex-col ${reverse ? "lg:flex-row-reverse" : "lg:flex-row"} items-center gap-16 relative overflow-hidden`}
              >
                {!reverse && (
                  <div className="absolute top-0 right-0 w-96 h-96 bg-secondary-container/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
                )}
                {badge.startsWith("Chapter Three") && (
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
                  <Link
                    href={ctaHref}
                    className={`${ctaBg} font-label text-base font-semibold px-8 py-4 rounded-full hover:scale-105 transition-transform inline-flex items-center justify-center gap-2`}
                  >
                    {ctaLabel}
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </Link>
                </div>
                <div className="lg:w-1/2 relative h-full min-h-[500px] w-full">
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
                chapter for you and your dog.
              </p>
              <Link
                href="/quiz"
                className="bg-on-secondary-container text-secondary-container font-label text-base font-bold px-8 py-4 rounded-full w-max hover:bg-secondary transition-colors shadow-md"
              >
                Take the Quiz
              </Link>
            </div>
            <div className="md:w-1/2 h-64 md:h-auto relative">
              <img
                className="absolute inset-0 w-full h-full object-cover"
                alt="Roni kneeling with two of her dogs"
                src="/images/photos/borderonis-10.jpg"
              />
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="max-w-3xl mx-auto px-6 pb-24 text-center">
          <h2 className="font-display text-5xl font-extrabold text-on-background mb-6">
            Every great relationship starts with one step.
          </h2>
          <p className="font-body text-xl text-on-surface-variant mb-4">
            Your dog is already speaking. Let&apos;s learn the language together.
          </p>
          {/* Roni's suggested addition ("maybe?") — pending her approval. */}
          <p className="font-body text-lg text-on-surface-variant mb-10">
            Begin with Foundations and progress through the journey at your own pace.
          </p>
          <Link
            href="/chapter/foundations"
            className="inline-block bg-gradient-to-r from-primary to-primary-container text-on-primary font-label text-lg font-bold px-10 py-5 rounded-full shadow-xl hover:scale-105 transition-transform"
          >
            Start with Foundations
          </Link>
        </section>

      </main>
      <Footer />
    </>
  );
}
