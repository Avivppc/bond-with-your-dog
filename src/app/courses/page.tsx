import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PlanCtaLink from "@/components/analytics/PlanCtaLink";
import { ChapterStage } from "@/components/chapters/ChapterStage";
import { STAGES } from "@/components/chapters/stages";

export const metadata = { title: "The Bonded Journey" };

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
        <section className="relative max-w-7xl mx-auto px-6 py-10 lg:py-16 flex flex-col lg:flex-row items-center gap-16">
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
              <PlanCtaLink
                href="/chapter/foundations"
                label="Start with Foundations"
                plan="foundations"
                location="courses_hero"
                className="bg-gradient-to-r from-primary to-primary-container text-on-primary font-label text-base font-semibold px-8 py-4 rounded-full shadow-lg shadow-primary/20 hover:scale-105 transition-transform flex items-center justify-center gap-2"
              >
                <span
                  className="material-symbols-outlined text-sm"
                  style={{ fontVariationSettings: '"FILL" 1' }}
                >
                  arrow_forward
                </span>
              </PlanCtaLink>
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
              className="relative z-10 w-full max-w-md mx-auto lg:max-w-none aspect-[3/4] object-cover object-top rounded-xl shadow-2xl"
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
        {STAGES.map((stage) => (
          <ChapterStage
            key={stage.badge}
            stage={stage}
            cta={
              <PlanCtaLink
                href={stage.ctaHref}
                label={stage.ctaLabel}
                plan={stage.plan}
                location="courses_stage"
                className={`${stage.ctaBg} font-label text-base font-semibold px-8 py-4 rounded-full hover:scale-105 transition-transform inline-flex items-center justify-center gap-2 w-full sm:w-auto`}
              >
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </PlanCtaLink>
            }
          />
        ))}

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
            Ready when you are.
          </p>
          {/* Roni's suggested addition ("maybe?") — pending her approval. */}
          <p className="font-body text-lg text-on-surface-variant mb-10">
            Begin with Foundations and progress through the journey at your own pace.
          </p>
          <PlanCtaLink
            href="/chapter/foundations"
            label="Start with Foundations"
            plan="foundations"
            location="courses_final"
            className="inline-block bg-gradient-to-r from-primary to-primary-container text-on-primary font-label text-lg font-bold px-10 py-5 rounded-full shadow-xl hover:scale-105 transition-transform"
          />
        </section>

      </main>
      <Footer />
    </>
  );
}
