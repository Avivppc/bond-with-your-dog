import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";

export const metadata = { title: "About Roni | Keta Tov" };

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main className="pt-24 overflow-hidden">

        {/* Hero */}
        <section className="relative px-8 py-12 md:py-24 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-12 items-end">
          <div className="md:col-span-6 z-10">
            <span className="inline-block mb-6 px-4 py-1.5 bg-secondary-container text-on-secondary-container rounded-full text-xs font-bold uppercase tracking-[0.18em]">
              About Roni
            </span>
            <h1 className="font-headline text-5xl md:text-7xl font-extrabold text-on-surface leading-[1.05] tracking-tight mb-6">
              The trainer who doesn&apos;t &ldquo;fix&rdquo; dogs
            </h1>
            <p className="text-lg md:text-xl text-on-surface-variant max-w-xl leading-relaxed">
              Roni Sagi has been training dogs since 2017, since then she stopped trying to make them perform and started teaching humans to listen instead.
            </p>
          </div>
          <div className="md:col-span-6 relative">
            <div className="absolute -top-12 -right-12 w-64 h-64 bg-tertiary-container rounded-full blur-3xl opacity-30"></div>
            <div className="relative rounded-xl overflow-hidden aspect-[4/5] bg-surface-container-low rotate-2">
              <img
                className="w-full h-full object-cover"
                alt="Roni Sagi with her dog"
                src="https://static.wixstatic.com/media/4da84e_3db2d7a75a0547adaec16edddd0c2a43~mv2.jpg/v1/fill/w_730,h_690,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/Frame%20536.jpg"
              />
            </div>
            <div className="absolute -bottom-8 -left-8 bg-secondary-container p-6 rounded-lg shadow-xl z-20 max-w-[280px]">
              <p className="font-headline font-bold text-on-secondary-container italic leading-snug">
                &ldquo;If you&apos;re not having fun, you&apos;re doing it wrong.&rdquo;
              </p>
            </div>
          </div>
        </section>

        {/* Quick facts */}
        <section className="bg-surface-container-low py-16 mb-24">
          <div className="max-w-7xl mx-auto px-8 grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <p className="text-4xl font-headline font-black text-primary mb-2">2017</p>
              <p className="text-sm text-outline font-bold">Training since</p>
            </div>
            <div>
              <p className="text-4xl font-headline font-black text-primary mb-2">2019</p>
              <p className="text-sm text-outline font-bold">Dancing since</p>
            </div>
            <div>
              <p className="text-4xl font-headline font-black text-primary mb-2">Top&nbsp;10</p>
              <p className="text-sm text-outline font-bold">AGT finalist</p>
            </div>
            <div>
              <p className="text-4xl font-headline font-black text-primary mb-2">5,000+</p>
              <p className="text-sm text-outline font-bold">Handlers taught</p>
            </div>
          </div>
        </section>

        {/* Origin story */}
        <section className="max-w-7xl mx-auto px-8 mb-32 grid grid-cols-1 md:grid-cols-12 gap-12 items-start">
          <div className="md:col-span-5 md:col-start-2 md:sticky md:top-32">
            <span className="text-primary font-bold uppercase tracking-widest text-sm mb-4 block">The origin</span>
            <h2 className="font-headline text-4xl md:text-5xl font-extrabold leading-tight">
              A trainer who fell in love with the wrong half of the job.
            </h2>
          </div>
          <div className="md:col-span-6 space-y-6 text-on-surface-variant text-lg leading-relaxed">
            <p>
              Roni started where most trainers start: teaching obedience. Sit, stay, leave-it. And for a while it worked — dogs got &ldquo;well-behaved,&rdquo; owners got their evenings back, everyone went home happy.
            </p>
            <p>
              But the dogs who came back for more advanced work weren&apos;t the obedient ones. They were the dogs who had figured out that <em>Roni was listening</em>. The relationship was the addictive part, not the commands.
            </p>
            <p>
              By 2019 she&apos;d built a different kind of practice. Not obedience. <strong>Translation.</strong> Teaching humans to read the small signals their dog had been broadcasting all along — and to answer back.
            </p>
          </div>
        </section>

        {/* AGT moment */}
        <section className="bg-secondary-container py-24 mb-32 overflow-hidden relative">
          <div className="max-w-7xl mx-auto px-8 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div className="md:order-2">
              <span className="text-secondary font-bold uppercase tracking-widest text-sm mb-4 block">The AGT moment</span>
              <h2 className="font-headline text-4xl md:text-5xl font-extrabold mb-6 text-on-secondary-container">
                A stage 11 million people watched.
              </h2>
              <p className="text-on-secondary-container/90 text-lg leading-relaxed mb-6">
                On America&apos;s Got Talent, Roni and her dog made the Top 10 doing a routine no other act could replicate: not because the tricks were harder, but because the trust was visible. The judges felt it. The audience felt it. You can feel it on a phone screen.
              </p>
              <p className="text-on-secondary-container/90 text-lg leading-relaxed">
                That visibility is what the academy is here to bottle and pass on. Not the stage. The trust.
              </p>
            </div>
            <div className="md:order-1 relative">
              <div
                className="aspect-video rounded-xl shadow-xl"
                style={{
                  background: "repeating-linear-gradient(-45deg,#e4f3fc,#e4f3fc 12px,#d4e5ef 12px,#d4e5ef 24px)",
                  transform: "rotate(-2deg)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#515d64",
                  fontFamily: "ui-monospace, monospace",
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                }}
              >
                <span className="bg-white/90 px-3 py-1.5 rounded-full">AGT performance clip / photo</span>
              </div>
            </div>
          </div>
        </section>

        {/* Three principles */}
        <section className="max-w-7xl mx-auto px-8 mb-32">
          <div className="mb-16">
            <span className="text-primary font-bold uppercase tracking-widest text-sm mb-4 block">The method</span>
            <h2 className="font-headline text-4xl md:text-5xl font-extrabold leading-tight max-w-3xl">
              Three things Roni won&apos;t compromise on.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-surface-container-lowest p-8 rounded-lg">
              <span className="text-6xl font-headline font-black text-primary/20 block leading-none mb-4">01</span>
              <h3 className="font-headline text-2xl font-bold mb-3">Positive reinforcement. Always.</h3>
              <p className="text-on-surface-variant">
                No corrections, no leash pops, no &ldquo;dominance.&rdquo; Every behavior we want, we shape. Every behavior we don&apos;t want, we redirect or ignore. Slower at first. Permanent in the end.
              </p>
            </div>
            <div className="bg-surface-container-lowest p-8 rounded-lg md:translate-y-8">
              <span className="text-6xl font-headline font-black text-primary/20 block leading-none mb-4">02</span>
              <h3 className="font-headline text-2xl font-bold mb-3">The human goes first.</h3>
              <p className="text-on-surface-variant">
                Most &ldquo;dog problems&rdquo; are signal problems. Your dog already speaks; we teach you to hear them. Then half the so-called problems aren&apos;t problems anymore.
              </p>
            </div>
            <div className="bg-surface-container-lowest p-8 rounded-lg">
              <span className="text-6xl font-headline font-black text-primary/20 block leading-none mb-4">03</span>
              <h3 className="font-headline text-2xl font-bold mb-3">Fun is the metric.</h3>
              <p className="text-on-surface-variant">
                If your dog isn&apos;t wagging, we&apos;re doing it wrong. Same goes for you. Joyful sessions stick. Stressful ones backfire. That&apos;s the whole science of it.
              </p>
            </div>
          </div>
        </section>

        {/* Featured quote */}
        <section className="max-w-5xl mx-auto px-8 mb-32 text-center">
          <p className="font-headline text-3xl md:text-5xl font-extrabold leading-tight text-on-surface">
            &ldquo;We don&apos;t only teach dogs to dance. We teach humans and dogs to choose each other.&rdquo;
          </p>
          <p className="mt-8 text-sm font-bold uppercase tracking-widest text-outline">— Roni Sagi</p>
        </section>

        {/* CTA */}
        <section className="max-w-7xl mx-auto px-8 mb-20">
          <div className="kinetic-gradient rounded-xl p-8 md:p-16 flex flex-col md:flex-row items-center gap-12 text-on-primary overflow-hidden relative">
            <div className="flex-grow z-10">
              <h2 className="font-headline text-3xl md:text-5xl font-black mb-4">
                Want to feel what they&apos;re talking about?
              </h2>
              <p className="text-lg text-on-primary/80 max-w-lg">
                Start with the free mini-class. Fifteen minutes. One conversation with your dog you won&apos;t forget.
              </p>
            </div>
            <div className="flex flex-wrap gap-4 z-10">
              <Link
                href="/enroll"
                className="bg-white text-primary px-8 py-4 rounded-full font-headline font-bold text-lg inline-block"
                style={{ textDecoration: "none" }}
              >
                Start the free class
              </Link>
              <Link
                href="/courses"
                className="border-2 border-white/40 text-white px-8 py-4 rounded-full font-headline font-bold text-lg inline-block"
                style={{ textDecoration: "none" }}
              >
                See the full library
              </Link>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
