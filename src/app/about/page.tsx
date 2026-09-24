import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata = { title: "About Roni" };

const AGT_FINALS_URL = "https://www.youtube.com/watch?v=hNUWEknZ2xs";

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main className="pt-24 overflow-x-hidden">

        {/* Hero */}
        <section className="relative min-h-[90vh] flex items-center px-8 md:px-20 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center max-w-7xl mx-auto">
            <div className="z-10">
              <h1 className="font-display font-extrabold text-5xl md:text-7xl lg:text-8xl tracking-tight leading-[0.9] mb-8">
                It was never just about{" "}
                <span className="text-primary italic">teaching dogs</span> to dance.
              </h1>
              <p className="font-body text-xl md:text-2xl text-on-surface-variant leading-relaxed max-w-xl">
                It was about discovering what becomes possible when a dog and
                human truly understand each other.
              </p>
            </div>
            <div className="relative">
              <div className="image-reveal-wrapper kinetic-shadow aspect-[4/5] md:aspect-square">
                <img
                  alt="Roni hugging her border collie over her shoulder"
                  className="w-full h-full object-cover object-top"
                  src="/images/photos/borderonis-21.jpg"
                />
              </div>
              <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-tertiary-container rounded-full mix-blend-multiply opacity-20 animate-pulse" />
            </div>
          </div>
        </section>

        {/* Introduction */}
        <section className="px-8 md:px-20 pb-24">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="font-display font-bold text-3xl md:text-4xl tracking-tight mb-4">
              Hi, I&apos;m Roni.
            </h2>
            <p className="font-body text-xl text-on-surface-variant leading-relaxed">
              I&apos;m a professional dog trainer, dog dance performer and educator
              from Israel.
            </p>
          </div>
        </section>

        {/* The Beginning */}
        <section className="bg-surface-container-low py-32 px-8 md:px-20">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div className="order-2 lg:order-1">
              <div className="image-reveal-wrapper kinetic-shadow aspect-video">
                <img
                  alt="Roni sitting on a staircase surrounded by her five dogs"
                  className="w-full h-full object-cover"
                  src="/images/photos/borderonis-17.jpg"
                />
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <h2 className="font-display font-bold text-3xl md:text-5xl tracking-tight leading-tight mb-8">
                I fell in love with what dog dancing{" "}
                <span className="text-secondary">made possible</span>.
              </h2>
              <div className="space-y-6 font-body text-lg text-on-surface-variant leading-relaxed">
                <p>
                  Over the years, I&apos;ve performed on some of the world&apos;s
                  biggest stages, taught thousands of dog lovers and built a global
                  community around the relationship between dogs and their people.
                </p>
                <p>
                  But everything I teach comes back to the same idea: the most
                  beautiful movements begin long before the music starts.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* The Belief */}
        <section className="py-32 px-8 md:px-20 bg-surface">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-secondary-container text-on-secondary-container rounded-full font-label font-semibold text-sm mb-8 uppercase tracking-widest">
              <span className="material-symbols-outlined text-sm">visibility</span>{" "}
              Our Philosophy
            </div>
            <h2 className="font-display font-bold text-4xl md:text-6xl tracking-tight mb-12">
              Every dog is already communicating. Most of us simply haven&apos;t
              learned the <span className="text-primary">language</span> yet.
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 text-left items-center">
              <div className="image-reveal-wrapper kinetic-shadow aspect-square">
                <img
                  alt="Roni kneeling in a corridor, two border collies watching her"
                  className="w-full h-full object-cover"
                  src="/images/photos/borderonis-10.jpg"
                />
              </div>
              <div className="space-y-6 font-body text-lg text-on-surface-variant leading-relaxed">
                <p>
                  I don&apos;t believe in forcing dogs to obey. I believe in
                  creating a relationship where communication comes naturally. When
                  trust comes first, everything else becomes easier.
                </p>
                <p>
                  Learning becomes play. Training becomes quality time. Movement
                  becomes conversation. And suddenly, you&apos;re no longer teaching
                  your dog… You&apos;re growing together.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Why BONDED Exists */}
        <section className="bg-surface-container-highest py-32 px-8 md:px-20 relative overflow-hidden">
          <div className="max-w-7xl mx-auto flex flex-col items-center">
            <h2 className="font-display font-extrabold text-4xl md:text-6xl text-center mb-16 tracking-tight">
              I wanted everyone to{" "}
              <span className="text-primary italic">experience</span> this feeling.
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-5 space-y-8 font-body text-lg text-on-surface-variant">
                <p className="text-xl font-medium text-on-surface italic">
                  Over the years, people kept asking me, &ldquo;How can I create
                  this kind of relationship with my dog?&rdquo;
                </p>
                <p>
                  My dogs taught me that tricks alone are not enough. Real
                  connection comes from giving your dog a reason to choose you,
                  building trust and putting the relationship before the results.
                </p>
                <p>That is why I created Bonded.</p>
              </div>
              <div className="lg:col-span-7">
                <div className="image-reveal-wrapper kinetic-shadow aspect-[16/9]">
                  <img
                    alt="Roni kneeling and rewarding two border collies"
                    className="w-full h-full object-cover"
                    src="/images/photos/borderonis-12.jpg"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* AGT / Stage vs Real Life */}
        <section className="py-32 px-8 md:px-20">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-20">
              <h2 className="font-display font-bold text-4xl md:text-6xl tracking-tight mb-8">
                Millions watched us dance. What made it possible happened{" "}
                <span className="text-secondary">long before the stage</span>.
              </h2>
              <p className="font-body text-xl text-on-surface-variant max-w-3xl mx-auto">
                When Rhythm and I appeared on America&apos;s Got Talent, people saw
                the tricks, choreography and music. But behind every movement was
                the trust and communication we had built long before the
                performance began.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16">
              <div className="space-y-6">
                <a
                  href={AGT_FINALS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="image-reveal-wrapper kinetic-shadow aspect-video group block"
                >
                  <img
                    alt="Roni Sagi and Rhythm performing in the America's Got Talent finals"
                    className="w-full h-full object-cover"
                    src="/images/photos/agt-spotlight.jpg"
                  />
                  <div className="absolute bottom-4 left-4 bg-white/90 px-4 py-2 rounded-full font-label font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">play_circle</span>
                    Watch the AGT finals
                  </div>
                </a>
                <p className="font-body text-on-surface-variant">
                  <span className="font-label font-bold uppercase tracking-widest text-xs block mb-1">
                    The Performance
                  </span>
                  Tricks, choreography and spectacle.
                </p>
              </div>
              <div className="space-y-6">
                <div className="image-reveal-wrapper kinetic-shadow aspect-video">
                  <img
                    alt="Roni and her dog in a quiet everyday moment"
                    className="w-full h-full object-cover"
                    src="/images/photos/real-life.jpg"
                  />
                </div>
                <p className="font-body text-on-surface-variant">
                  <span className="font-label font-bold uppercase tracking-widest text-xs block mb-1">
                    Real Life
                  </span>
                  Trust, communication and all the quiet moments in between.
                </p>
              </div>
            </div>
            <div className="mt-16 text-center max-w-2xl mx-auto">
              <p className="font-body text-lg text-on-surface-variant">
                A performance lasts only a few minutes. The relationship behind it
                is built every day.
              </p>
            </div>
          </div>
        </section>

        {/* Promise */}
        <section className="bg-primary text-on-primary py-32 px-8 md:px-20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-1/3 h-full bg-primary-dim opacity-10 -skew-x-12 translate-x-1/2" />
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div>
              <h2 className="font-display font-extrabold text-4xl md:text-6xl mb-8 tracking-tighter">
                I want this journey to{" "}
                <span className="italic text-tertiary-container">feel different</span>.
              </h2>
              <div className="space-y-8 font-body text-lg md:text-xl opacity-90 leading-relaxed">
                <p>
                  You&apos;ll never hear me talk about perfect dogs. Because
                  that&apos;s not what I&apos;m here to help you create. I&apos;m
                  here to help you build a relationship filled with trust, curiosity,
                  confidence, and joy.
                </p>
                <p className="font-semibold">
                  Wherever you are starting, Bonded gives you and your dog a clear
                  path forward.
                </p>
              </div>
            </div>
            <div>
              <div className="image-reveal-wrapper border-4 border-primary-container shadow-2xl aspect-square rotate-2 hover:rotate-0 transition-transform duration-700">
                <img
                  alt="Roni sitting on a staircase with her dog resting beside her"
                  className="w-full h-full object-cover"
                  src="/images/photos/borderonis-03.jpg"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-40 px-8 text-center bg-surface-container-lowest">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-display font-black text-5xl md:text-7xl mb-8 tracking-tight">
              Let&apos;s build something{" "}
              <span className="text-primary italic underline decoration-tertiary-container decoration-8 underline-offset-8">
                extraordinary
              </span>{" "}
              together.
            </h2>
            <p className="font-body text-xl md:text-2xl text-on-surface-variant mb-12">
              Your dog is already speaking. I&apos;d love to help you learn the
              language.
            </p>
            <Link
              href="/chapter/foundations"
              className="group bg-primary text-on-primary px-12 py-5 rounded-full font-headline font-bold text-xl hover:shadow-xl hover:shadow-primary/20 hover:-translate-y-1 transition-all duration-300 inline-flex items-center gap-4 mx-auto"
            >
              Start with Foundations
              <span className="material-symbols-outlined group-hover:translate-x-2 transition-transform">
                arrow_forward
              </span>
            </Link>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
