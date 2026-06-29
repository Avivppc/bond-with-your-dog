import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata = { title: "About Roni | BONDED" };

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
                It was never about{" "}
                <span className="text-primary italic">teaching dogs</span> to dance.
              </h1>
              <p className="font-body text-xl md:text-2xl text-on-surface-variant leading-relaxed max-w-xl">
                It was always about helping people build a relationship they never
                thought was possible.
              </p>
            </div>
            <div className="relative">
              <div className="image-reveal-wrapper kinetic-shadow aspect-[4/5] md:aspect-square">
                <img
                  alt="Roni with River"
                  className="w-full h-full object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDf4lHpA98PPIK6lbQ-K40aO5tWSQEmq2mEYRjtfGLh1nmycPuLjAJTLvwHuKiVaXXla6biiyB3zG8CE9V6T10aWVEWl8Bqw30-njyiPVY_sdB8-Xio5vXkqJ9u-eIk21uYAa_z-xqrvc5msR2zfoSLjLSHca6iR5lGc6HvczU8vmZ69JQ2Ak2X-fkpsf0ye7BDms476vSq0vQ6d8ihTZ6QkV_pMI1PvK1yoDAX9cAdRkso9npNlyW_itYfRR2HlLDp-D4MuMA8uM0iYeU"
                />
              </div>
              <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-tertiary-container rounded-full mix-blend-multiply opacity-20 animate-pulse" />
            </div>
          </div>
        </section>

        {/* The Beginning */}
        <section className="bg-surface-container-low py-32 px-8 md:px-20">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div className="order-2 lg:order-1">
              <div className="image-reveal-wrapper kinetic-shadow aspect-video">
                <img
                  alt="Training in nature"
                  className="w-full h-full object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuB8hHtMr6pyJa6z_c6eXXaAAmB_emy6jKLcIv5NnNHaKkjK9chk4VWdZYMm9JUo-GP7mg_iht43Cw_LFEw5DyQdiqoNFsBGquucV6DPge3OBI0PK9m_QNrn3EjcuLsUl1OyUa5ESBnwhyALhPfqn4VkNlsSuVpivX8HIk-JHD8M_Yl3gtKvK89P07YGQxMuHzmu1XaBSabVhs3l99DpntDWuoz-8tTn7fibqhmDXTSczjCFZr98pZG_7DMzIhRbjVfFABL5SdGuvgzNCvk"
                />
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <h2 className="font-display font-bold text-3xl md:text-5xl tracking-tight leading-tight mb-8">
                I didn&apos;t fall in love with dog dancing. I fell in love with
                what it{" "}
                <span className="text-secondary">made possible</span>.
              </h2>
              <div className="space-y-6 font-body text-lg text-on-surface-variant leading-relaxed">
                <p>
                  For years, I&apos;ve worked with dogs and their people, helping
                  them discover something that goes far beyond tricks or routines.
                </p>
                <p>
                  The most meaningful moments never happened on stage. They happened
                  long before the music started. A glance. A choice. A shared
                  understanding. That&apos;s when I realized… Dog dancing was never
                  the goal. It was simply proof of an extraordinary relationship.
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
                  alt="Close-up eye contact between dog and owner"
                  className="w-full h-full object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuALuOqFY9xeeE8vXOlCUXbn0MkITA6DDaYJM_mD2mYbC4Mv_wZVVQLo_G1y5YmBrD9dho_j7VvmOUwu8piMHA6i6s1k17MLwg4_f9u73joGlYtOGloIUikz5EzSUsS6lV2SmxPQBuKZcWoemYbPpH1lodkAFbTCNsZSSVrhFN4CKlayki916asJYr44eqSoTaQ1YOa_np8uTJ7hd3-kg0ZbdNV_oWJ0cZ2essYYXdtihsbnnL0jZTOmBsK7xnSE9j7cWsJEURDJkxlWDsE"
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
                  "How can I have the kind of relationship you have with your dogs?"
                </p>
                <p>
                  Over the years, thousands of people asked me the same question.
                  The answer was never one trick. Or one routine. It was a way of
                  thinking. A way of communicating. A way of growing together.
                </p>
                <p>
                  That&apos;s why I created BONDED. Not as another online course.
                  But as a step-by-step method that helps people build extraordinary
                  relationships with their dogs.
                </p>
              </div>
              <div className="lg:col-span-7">
                <div className="image-reveal-wrapper kinetic-shadow aspect-[16/9]">
                  <img
                    alt="Diverse student community"
                    className="w-full h-full object-cover"
                    src="https://lh3.googleusercontent.com/aida/AP1WRLvEm1PsMzO-ivUj-GHxD79lNdavsASqD1mNlBjNXGHFfjLzIWlpq__LT3H3tBsTez75WDSeyH9cGvhGFgPFeqydq46T6hbrNQjKLySjzMc47CGH0xVdYzjRShZqB3ZnnYsAr1BF9huDgiulcqXgt7OFvni4NyflGLpEZFwCDKFtG_KnpyZ5d-LZa6FZBCMV6Px7kfa2K1X7cflsjBBDHNOUltJdb7dqmwUYRWyT9aE71rxeu1SYqlTFEsfH"
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
                Millions watched us dance. But that wasn&apos;t what they{" "}
                <span className="text-secondary">remembered</span>.
              </h2>
              <p className="font-body text-xl text-on-surface-variant max-w-3xl mx-auto">
                When River and I appeared on America&apos;s Got Talent, people
                talked about the choreography. But what they truly connected
                with… Was the relationship.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16">
              <div className="space-y-6">
                <div className="image-reveal-wrapper kinetic-shadow aspect-video group">
                  <img
                    alt="AGT Performance"
                    className="w-full h-full object-cover"
                    src="https://lh3.googleusercontent.com/aida/AP1WRLvWCiTpe12vy2sIIEZYWr6EH7qmUb_8zOv7YtUSv41LQgTBi60VdLKrGdHACjwSqWaCLeXBOu1h1Bh6WG1hj3UFWIMSRJjuWqNy4KDJ8HsCKl06JcaMc8Garo34Ue56UUTwqk5ARrqgsBF-Aoe885GN8YAFQIi43LQ5kphpVrBgqfj1es9rHXkK1De85pfMVkq_mM3pB-7R0NkGFcnBm-hDraS7LJ719zEBEVaAzxXqFuhAEdNR_61MsUQ"
                  />
                  <div className="absolute bottom-4 left-4 bg-white/90 px-4 py-2 rounded-full font-label font-bold text-xs uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                    The Spotlight
                  </div>
                </div>
                <p className="font-body text-on-surface-variant italic">
                  The Performance: Choreography and spectacle.
                </p>
              </div>
              <div className="space-y-6">
                <div className="image-reveal-wrapper kinetic-shadow aspect-video group">
                  <img
                    alt="Quiet home moment"
                    className="w-full h-full object-cover"
                    src="https://lh3.googleusercontent.com/aida/AP1WRLsR2IhoRqm2IQzpEA5-03EUB1Wq_4VYDtcOxT5uMQwx7nmoIhiSaivl3aPxR60FvMafl8WLuqnhZMZg8hhvpKzuUra1P5SEMlJe0dh5UEPzWcoAATVhNB11P7OoDGKzb798Q28CkRWau2n1_2JyRjKz1bwJSKi2-DUmyql1it7twBOEF_Z-UtOnID03q_z8Q8Ty_sCqzaodjYyOPjcnTgy1M4MQ7C8bFGxvKn1bp6aNSGekAj1WbNzhqdWL"
                  />
                  <div className="absolute bottom-4 left-4 bg-white/90 px-4 py-2 rounded-full font-label font-bold text-xs uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                    The Soul
                  </div>
                </div>
                <p className="font-body text-on-surface-variant italic">
                  Real Life: Genuine connection and quiet trust.
                </p>
              </div>
            </div>
            <div className="mt-16 text-center max-w-2xl mx-auto">
              <p className="font-body text-lg text-on-surface-variant">
                That experience reminded me that what inspires people isn&apos;t
                perfect performance. It&apos;s genuine connection. And that&apos;s
                exactly what BONDED is built to teach.
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
                <p>
                  One that grows stronger every single day. No matter your
                  experience. No matter your dog&apos;s breed. No matter where
                  you&apos;re starting today.
                </p>
              </div>
            </div>
            <div>
              <div className="image-reveal-wrapper border-4 border-primary-container shadow-2xl aspect-square rotate-2 hover:rotate-0 transition-transform duration-700">
                <img
                  alt="Wins and smiles"
                  className="w-full h-full object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuA5flj39yr03KXRY3gPuYmstWTwDohlHI2hi4q_JsHT1GdgOfAqOxWlyGDHefjeaHE-N1RFZXq_D32zE50qb1ELphzumQ5ubMrfWGryT5Ak7WF8nlHpn8NLwq_1kZv_9WQsXmIS4kK8DN1Fztn41cW_57r5xPB7Hw_0xtSPWtbJrBybA4sRphDWrbgvEgNBl1jBuL77Au8PorY12in4wNx76QDOHwOIAqoM6B-6IcvfXV6Fp3mZqBgwXFtVQ5ArbJwXG43RIjxrW05mRaU"
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
            <button className="group bg-primary text-on-primary px-12 py-5 rounded-full font-headline font-bold text-xl hover:shadow-xl hover:shadow-primary/20 hover:-translate-y-1 transition-all duration-300 flex items-center gap-4 mx-auto">
              Start with BONDED Foundations
              <span className="material-symbols-outlined group-hover:translate-x-2 transition-transform">
                arrow_forward
              </span>
            </button>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
