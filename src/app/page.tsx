"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function HomePage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  return (
    <>
      <Navbar />
      <main className="pt-24 overflow-hidden">

        {/* Hero */}
        <section className="relative px-8 py-12 md:py-24 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
          <div className="md:col-span-7 z-10">
            <h1 className="font-headline text-5xl md:text-7xl font-extrabold text-on-surface leading-[1.1] tracking-tight mb-6">
              Train. Connect. <span className="text-primary italic">Dance.</span>
            </h1>
            <p className="text-lg md:text-xl text-on-surface-variant max-w-xl mb-10 leading-relaxed">
              Unlock a deeper bond with your dog through the magic of creative movement. Professional choreography meets heart-centered training for every skill level.
            </p>
            <div className="flex flex-wrap gap-4">
              <button className="kinetic-gradient text-on-primary px-8 py-4 rounded-full font-headline font-bold text-lg shadow-xl flex items-center gap-2 group">
                Try a Free Lesson
                <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </button>
              <button className="bg-surface-container-high text-on-surface-variant px-8 py-4 rounded-full font-headline font-bold text-lg hover:bg-surface-container-highest transition-colors">
                View Curriculum
              </button>
            </div>
          </div>
          <div className="md:col-span-5 relative">
            <div className="absolute -top-12 -right-12 w-64 h-64 bg-tertiary-container rounded-full blur-3xl opacity-30 animate-pulse"></div>
            <div className="relative rounded-xl overflow-visible aspect-[4/5] bg-surface-container-low">
              <img
                className="absolute inset-0 w-full h-full object-cover rounded-xl shadow-2xl scale-110 -rotate-3 hover:rotate-0 transition-transform duration-700"
                src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSkba9npVM471qL_2rdh3r-dFcajGIBtJRGdg&s"
                alt="Dynamic shot of a Border Collie and trainer performing a dance move in a sunlit studio"
              />
            </div>
          </div>
        </section>

        {/* Social Proof */}
        <section className="bg-surface-container-low/50 py-12 mb-20">
          <div className="max-w-7xl mx-auto px-8">
            <p className="text-center font-label text-xs uppercase tracking-[0.2em] text-outline mb-10 font-bold">As Seen On &amp; Featured In</p>
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
        <section className="px-8 max-w-7xl mx-auto mb-32">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-4">
            <div>
              <h2 className="font-headline text-4xl md:text-5xl font-extrabold text-on-surface mb-4">Master Every Move</h2>
              <p className="text-on-surface-variant max-w-md">Structured learning paths designed by world-class dog dance finalists.</p>
            </div>
            <span className="bg-secondary-container text-on-secondary-container px-4 py-2 rounded-full text-sm font-bold self-start md:self-auto">New Courses Weekly</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="group bg-surface-container-lowest p-6 rounded-lg shadow-sm hover:scale-[1.02] transition-all duration-500 flex flex-col h-full">
              <div className="aspect-video rounded-md overflow-hidden mb-6 relative">
                <img className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBWOgbk8odkZzkr8eKug_CAPKV-svhMt6uGDPcWec7tABMDoyT2BkylzFa9cQS8MJA3EYTTqu27veOTpLElPgt-ySXZDkD79juGhgmHLmfbi_F7QYSRqGcwtf88-ZQ3Ape6nz7IzbNisIuEwKVSJSS_UMm9RfLvsgefSYDn0GXFLz_KUQ-9slQaHZRRj99yQlECNXU6Ysi-sVKOgGe0CaGVGRaJrbFWZYJ6_Ln5hGvqiAjRHNsjALrIM4gMGHdl-osZLcxaabTiILlM" alt="A golden retriever sitting attentively during a training session" />
                <span className="absolute top-4 right-4 bg-primary text-on-primary text-xs font-bold px-3 py-1 rounded-full">Bestseller</span>
              </div>
              <h3 className="font-headline text-2xl font-bold mb-2">Foundations</h3>
              <p className="text-on-surface-variant text-sm mb-6 flex-grow">The essential building blocks of connection, focus, and basic footwork for any breed.</p>
              <div className="flex justify-between items-center pt-6 border-t border-surface-container-high">
                <div>
                  <span className="block text-xs font-label text-outline uppercase font-bold">12 Lessons</span>
                  <span className="text-xl font-headline font-extrabold text-secondary">$49</span>
                </div>
                <button className="text-primary font-bold flex items-center gap-1 group/btn">
                  Enroll <span className="material-symbols-outlined text-lg group-hover/btn:translate-x-1 transition-transform">chevron_right</span>
                </button>
              </div>
            </div>
            <div className="group bg-surface-container-lowest p-6 rounded-lg shadow-sm hover:scale-[1.02] transition-all duration-500 md:translate-y-8 flex flex-col h-full">
              <div className="aspect-video rounded-md overflow-hidden mb-6">
                <img className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB2qNU5-M8_HzKmXyFkpebGwHxfnIsaBKYV60GPiuQjMVPd4KOKsFVmhHRvGoI8TqasWoFQbpvsgAYguf0Hq6Rzl_qObycemoP1rnGjS2741xvEaHzLMIaJekxYS941nJ3pAdD06KJ8_7_qPI7nb_lyatV0FsogISeRzzxgmnNlUMdekwDDX1bQRFsF3yCvuhYnUZVrhqFedC_3K0M-5aWCPoLBgGiJNaVjUScTRXVI-Jq_t5PH25GN_50ZPCpjSpuhIXUwVHBCU35u" alt="Close up of a dog and trainer feet in sync during a complex trick" />
              </div>
              <h3 className="font-headline text-2xl font-bold mb-2">Precision &amp; Flow</h3>
              <p className="text-on-surface-variant text-sm mb-6 flex-grow">Laser-focused deep dives into specific tricks like backing up, weaving, and leg circles.</p>
              <div className="flex justify-between items-center pt-6 border-t border-surface-container-high">
                <div>
                  <span className="block text-xs font-label text-outline uppercase font-bold">5 Lessons</span>
                  <span className="text-xl font-headline font-extrabold text-secondary">$29</span>
                </div>
                <button className="text-primary font-bold flex items-center gap-1 group/btn">
                  Enroll <span className="material-symbols-outlined text-lg group-hover/btn:translate-x-1 transition-transform">chevron_right</span>
                </button>
              </div>
            </div>
            <div className="group bg-surface-container-lowest p-6 rounded-lg shadow-sm hover:scale-[1.02] transition-all duration-500 flex flex-col h-full">
              <div className="aspect-video rounded-md overflow-hidden mb-6">
                <img className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAShQgUCFYClDx5Gtnp8kziitAOUcAEcQjhoTIrHcBNZpAcwJPIlhjRY6zuabCDHTYzDjwj-E8IQqcucJh58jSNpQ6DTs4mX49CBaO4G9_cyrct3IgI46dDLQq7M86YlVpZSepG10BSWYmxtYZUheJ4D3lBHhY21DAyhWrUROoVJ0LZ1UrUCn_MNee6Ie_8jkQh6kKbtG1fGT-Pswo9fUZ5QY-DtANCh6AXqvOgmB-3kBFG1zatGDAYXFqr_TPkj0PoxRpHEv0dWe91" alt="Border collie jumping over a trainer's back in a theatrical stage setting" />
              </div>
              <h3 className="font-headline text-2xl font-bold mb-2">The Masterpiece</h3>
              <p className="text-on-surface-variant text-sm mb-6 flex-grow">Put it all together into a show-stopping routine with music and narrative flow.</p>
              <div className="flex justify-between items-center pt-6 border-t border-surface-container-high">
                <div>
                  <span className="block text-xs font-label text-outline uppercase font-bold">20 Lessons</span>
                  <span className="text-xl font-headline font-extrabold text-secondary">$129</span>
                </div>
                <button className="text-primary font-bold flex items-center gap-1 group/btn">
                  Enroll <span className="material-symbols-outlined text-lg group-hover/btn:translate-x-1 transition-transform">chevron_right</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* About Roni */}
        <section className="bg-surface-container-high py-24 mt-20">
          <div className="max-w-7xl mx-auto px-8 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div className="relative order-2 md:order-1">
              <div className="bg-white p-4 rounded-lg shadow-2xl rotate-2 relative z-10">
                <img className="w-full h-auto rounded" src="https://static.wixstatic.com/media/4da84e_b3eaefd5248241eaa3b1905ff9ba6fea~mv2.jpg/v1/fill/w_865,h_737,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/4da84e_b3eaefd5248241eaa3b1905ff9ba6fea~mv2.jpg" alt="Roni Sagi smiling with her dog" />
              </div>
              <div className="absolute -bottom-8 -left-8 bg-secondary-container p-6 rounded-lg shadow-xl z-20 max-w-[240px]">
                <p className="font-headline font-bold text-on-secondary-container italic">&ldquo;It&apos;s not about the tricks; it&apos;s about the conversation you have with your dog.&rdquo;</p>
              </div>
            </div>
            <div className="order-1 md:order-2">
              <span className="text-primary font-bold uppercase tracking-widest text-sm mb-4 block">Meet Your Coach</span>
              <h2 className="font-headline text-4xl md:text-5xl font-extrabold mb-6">Roni Sagi: The Art of Partnership</h2>
              <p className="text-on-surface-variant text-lg leading-relaxed mb-6">
                From the world stage of <strong>America&apos;s Got Talent</strong> to your living room, Roni brings a revolutionary approach to dog training. Her philosophy centers on &ldquo;The Kinetic Duet&rdquo;&mdash;a method where handler and dog move as one.
              </p>
              <p className="text-on-surface-variant text-lg leading-relaxed mb-8">
                With over a decade of competitive experience, Roni focuses on positive reinforcement, body awareness, and the pure joy of performance.
              </p>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-3xl font-headline font-black text-primary">Top 10</p>
                  <p className="text-sm text-outline font-bold">AGT Finalist</p>
                </div>
                <div>
                  <p className="text-3xl font-headline font-black text-primary">5,000+</p>
                  <p className="text-sm text-outline font-bold">Students Globally</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Membership Tiers */}
        <section id="membership" className="py-24 max-w-7xl mx-auto px-8">
          <div className="text-center mb-16">
            <h2 className="font-headline text-4xl md:text-5xl font-extrabold mb-4">Dance Together, Always</h2>
            <p className="text-on-surface-variant max-w-xl mx-auto">Get unlimited access to every course, live sessions, and our exclusive community.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-surface-container-low p-8 rounded-lg flex flex-col">
              <h3 className="font-headline text-xl font-bold mb-2">Monthly</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-headline font-black text-on-surface">$49</span>
                <span className="text-on-surface-variant">/mo</span>
              </div>
              <ul className="space-y-4 mb-10 flex-grow">
                <li className="flex items-center gap-3 text-sm"><span className="material-symbols-outlined text-secondary text-sm">check_circle</span> All basic courses</li>
                <li className="flex items-center gap-3 text-sm"><span className="material-symbols-outlined text-secondary text-sm">check_circle</span> Community Forum access</li>
                <li className="flex items-center gap-3 text-sm"><span className="material-symbols-outlined text-secondary text-sm">check_circle</span> Monthly Q&amp;A</li>
              </ul>
              <button className="w-full border-2 border-primary text-primary py-3 rounded-full font-bold hover:bg-primary hover:text-on-primary transition-all">Get Started</button>
            </div>
            <div className="bg-secondary-container p-8 rounded-lg shadow-2xl relative scale-105 flex flex-col border-4 border-secondary/20">
              <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-secondary text-on-secondary px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Most Popular</span>
              <h3 className="font-headline text-xl font-bold mb-2">Yearly Academy</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-headline font-black text-on-secondary-container">$480</span>
                <span className="text-on-secondary-container/70">/yr</span>
              </div>
              <ul className="space-y-4 mb-10 flex-grow">
                <li className="flex items-center gap-3 text-sm font-medium"><span className="material-symbols-outlined text-secondary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span> All Premium Content</li>
                <li className="flex items-center gap-3 text-sm font-medium"><span className="material-symbols-outlined text-secondary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span> Personal Video Feedback</li>
                <li className="flex items-center gap-3 text-sm font-medium"><span className="material-symbols-outlined text-secondary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span> Live Performance Reviews</li>
                <li className="flex items-center gap-3 text-sm font-medium"><span className="material-symbols-outlined text-secondary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span> Expert Workshop Library</li>
              </ul>
              <button className="w-full bg-secondary text-on-secondary py-4 rounded-full font-bold shadow-lg">Join the Academy</button>
            </div>
            <div className="bg-surface-container-low p-8 rounded-lg flex flex-col">
              <h3 className="font-headline text-xl font-bold mb-2">3-Month Sprint</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-headline font-black text-on-surface">$99</span>
                <span className="text-on-surface-variant">/quarter</span>
              </div>
              <ul className="space-y-4 mb-10 flex-grow">
                <li className="flex items-center gap-3 text-sm"><span className="material-symbols-outlined text-secondary text-sm">check_circle</span> Intensive foundations</li>
                <li className="flex items-center gap-3 text-sm"><span className="material-symbols-outlined text-secondary text-sm">check_circle</span> Access to 3 mini-courses</li>
                <li className="flex items-center gap-3 text-sm"><span className="material-symbols-outlined text-secondary text-sm">check_circle</span> Peer review groups</li>
              </ul>
              <button className="w-full border-2 border-primary text-primary py-3 rounded-full font-bold hover:bg-primary hover:text-on-primary transition-all">Start Sprint</button>
            </div>
          </div>
        </section>

        {/* Growth Tracks */}
        <section className="py-24 bg-surface-container-low/30 overflow-hidden">
          <div className="max-w-7xl mx-auto px-8">
            <div className="mb-16">
              <h2 className="font-headline text-4xl font-extrabold mb-4">Choose Your Track</h2>
              <p className="text-on-surface-variant">Structured paths to take you from first steps to center stage.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <span className="bg-tertiary-container text-on-tertiary-container w-10 h-10 rounded-full flex items-center justify-center font-black">01</span>
                  <h4 className="font-headline text-xl font-bold">Starter Track</h4>
                </div>
                <div className="space-y-3">
                  <div className="p-4 bg-surface-container-lowest rounded-md shadow-sm border-l-4 border-tertiary">Intro to Rhythm</div>
                  <div className="p-4 bg-surface-container-lowest rounded-md shadow-sm opacity-70">Focus &amp; Eye Contact</div>
                  <div className="p-4 bg-surface-container-lowest rounded-md shadow-sm opacity-70">Luring Techniques</div>
                  <div className="p-4 bg-surface-container-lowest rounded-md shadow-sm opacity-70">The First Spin</div>
                  <div className="p-4 bg-surface-container-lowest rounded-md shadow-sm opacity-70">Heel Work Essentials</div>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <span className="bg-primary-container text-on-primary-container w-10 h-10 rounded-full flex items-center justify-center font-black">02</span>
                  <h4 className="font-headline text-xl font-bold">Intermediate Track</h4>
                </div>
                <div className="space-y-3">
                  <div className="p-4 bg-surface-container-lowest rounded-md shadow-sm border-l-4 border-primary">Distance Work</div>
                  <div className="p-4 bg-surface-container-lowest rounded-md shadow-sm opacity-70">Reverse Weaving</div>
                  <div className="p-4 bg-surface-container-lowest rounded-md shadow-sm opacity-70">Cues at Speed</div>
                  <div className="p-4 bg-surface-container-lowest rounded-md shadow-sm opacity-70">Lateral Movement</div>
                  <div className="p-4 bg-surface-container-lowest rounded-md shadow-sm opacity-70">Prop Integration</div>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <span className="bg-secondary-container text-on-secondary-container w-10 h-10 rounded-full flex items-center justify-center font-black">03</span>
                  <h4 className="font-headline text-xl font-bold">Expert Track</h4>
                </div>
                <div className="space-y-3">
                  <div className="p-4 bg-surface-container-lowest rounded-md shadow-sm border-l-4 border-secondary">Narrative Staging</div>
                  <div className="p-4 bg-surface-container-lowest rounded-md shadow-sm opacity-70">Syncopated Rhythm</div>
                  <div className="p-4 bg-surface-container-lowest rounded-md shadow-sm opacity-70">Aerial Tricks</div>
                  <div className="p-4 bg-surface-container-lowest rounded-md shadow-sm opacity-70">Full Performance Flow</div>
                  <div className="p-4 bg-surface-container-lowest rounded-md shadow-sm opacity-70">Showmanship Mastery</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-24 max-w-7xl mx-auto px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div>
              <span className="bg-tertiary-container text-on-tertiary-container text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-6 inline-block">Student Spotlight</span>
              <h2 className="font-headline text-4xl md:text-5xl font-extrabold mb-8 leading-tight">&ldquo;The most clear, structured, and joyful training we&apos;ve ever done.&rdquo;</h2>
              <div className="flex items-center gap-4">
                <img className="w-16 h-16 rounded-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDps2UDcOtJtPGT5UGKBffn_YtzUFxS7Q8hXx9RYig92kgX3WKspQaA86SJfyioqvAr3krjS2MKBMQSocu44WWiSc84O7u5zzbweC_biYhAqPzslWOPDeA_gcHSs-xzxh3rQMLNsXbjs4mgey9ZjjWzVfhVAiIV4H7_tpXQiV2r9IZwuu0KgSQjcxJLCx4yBe6E-fXA7DfZl5F_SGUnp87s60FWQ7mXCDL5-vJqxaXNy0JhvQeJcDTxDJJPZo0Scph8fkdo0lsMqoKI" alt="Portrait of a smiling young woman student" />
                <div>
                  <p className="font-bold">Sarah &amp; Bella</p>
                  <p className="text-sm text-outline font-medium">Foundations &amp; Expert Graduate</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-lg shadow-sm mt-8">
                <p className="text-sm italic mb-4">&ldquo;My dog literally waits by the laptop for Roni&apos;s voice. We&apos;ve built so much trust.&rdquo;</p>
                <p className="font-bold text-xs">- Marcus &amp; Toby</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <p className="text-sm italic mb-4">&ldquo;I never thought my senior rescue dog could dance. These mini-courses are magic.&rdquo;</p>
                <p className="font-bold text-xs">- Elena &amp; Luna</p>
              </div>
            </div>
          </div>
        </section>

        {/* Lead Capture */}
        <section className="max-w-7xl mx-auto px-8 mb-20">
          <div className="kinetic-gradient rounded-xl p-8 md:p-16 flex flex-col md:flex-row items-center gap-12 text-on-primary overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <span className="material-symbols-outlined text-[12rem]" style={{ fontVariationSettings: "'FILL' 1" }}>pets</span>
            </div>
            <div className="flex-grow z-10">
              <h2 className="font-headline text-3xl md:text-5xl font-black mb-4">Start Your First Dance Today</h2>
              <p className="text-lg text-on-primary/80 max-w-lg">Sign up for our &apos;Free Mini-Class&apos; and learn 3 foundational moves in under 15 minutes.</p>
            </div>
            <div className="w-full md:w-auto z-10">
              {submitted ? (
                <p className="text-white font-bold text-lg text-center">Check your inbox!</p>
              ) : (
                <form
                  className="bg-white/10 p-2 rounded-full flex backdrop-blur-md"
                  onSubmit={(e) => { e.preventDefault(); if (email) setSubmitted(true); }}
                >
                  <input
                    className="bg-transparent border-none focus:ring-0 placeholder:text-white/60 text-white px-6 w-full"
                    placeholder="Email address"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <button className="bg-white text-primary px-8 py-3 rounded-full font-bold whitespace-nowrap hover:bg-orange-50 transition-colors" type="submit">
                    Free Class
                  </button>
                </form>
              )}
              <p className="text-[10px] mt-3 opacity-60 text-center">No credit card required. Instant access.</p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
