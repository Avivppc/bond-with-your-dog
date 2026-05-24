"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";

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
            <span className="inline-block mb-6 px-4 py-1.5 bg-secondary-container text-on-secondary-container rounded-full text-xs font-bold uppercase tracking-[0.18em]">
              A relationship-first academy
            </span>
            <h1 className="font-headline text-5xl md:text-7xl font-extrabold text-on-surface leading-[1.05] tracking-tight mb-6">
              Learn the secret <br />
              <span className="text-primary italic">language</span> of your dog.
            </h1>
            <p className="text-lg md:text-xl text-on-surface-variant max-w-xl mb-4 leading-relaxed">
              We don&apos;t teach dogs to dance. We teach humans and dogs to choose each other.
            </p>
            <p className="text-base text-on-surface-variant/80 max-w-xl mb-10 leading-relaxed">
              Online courses and a community from Roni Sagi — trainer since 2017, AGT finalist. The work is movement but the point is connection.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/courses"
                className="kinetic-gradient text-on-primary px-8 py-4 rounded-full font-headline font-bold text-lg shadow-xl shadow-primary/30 inline-flex items-center gap-2 group"
                style={{ textDecoration: "none" }}
              >
                Try a free mini-class
                <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </Link>
              <Link
                href="/courses"
                className="bg-surface-container-high text-on-surface-variant px-8 py-4 rounded-full font-headline font-bold text-lg hover:bg-surface-container-highest transition-colors inline-block"
                style={{ textDecoration: "none" }}
              >
                Browse the library
              </Link>
            </div>
          </div>
          <div className="md:col-span-5 relative">
            <div className="absolute -top-12 -right-12 w-64 h-64 bg-tertiary-container rounded-full blur-3xl opacity-30 animate-pulse"></div>
            <div className="relative rounded-xl overflow-visible aspect-[4/5] bg-surface-container-low">
              <img
                className="absolute inset-0 w-full h-full object-cover rounded-xl shadow-2xl scale-110 -rotate-3 hover:rotate-0 transition-transform duration-700"
                src="https://static.wixstatic.com/media/4da84e_d83277594941460ea2856398fe559225~mv2.jpg/v1/fill/w_580,h_360,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/Keta%20Tov1030%20(1)-1.jpg"
                alt="Dynamic shot of a Border Collie and trainer Roni Sagi performing a dance move in a sunlit studio"
              />
            </div>
          </div>
        </section>

        {/* Social Proof */}
        <section className="bg-surface-container-low/50 py-12 mb-20">
          <div className="max-w-7xl mx-auto px-8">
            <p className="text-center font-label text-xs uppercase tracking-[0.2em] text-outline mb-10 font-bold">As Seen On &amp; Featured In</p>
            <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
              <span className="font-headline text-2xl font-black">AMERICA&apos;S GOT TALENT</span>
              <span className="font-headline text-2xl font-bold">NBC</span>
              <span className="font-headline text-2xl font-black">FINALIST · TOP 10</span>
            </div>
          </div>
        </section>

        {/* Course Overview */}
        <section className="px-8 max-w-7xl mx-auto mb-32">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-4">
            <div>
              <h2 className="font-headline text-4xl md:text-5xl font-extrabold text-on-surface mb-4">
                A shared <span className="italic text-primary">language</span>, one lesson at a time.
              </h2>
              <p className="text-on-surface-variant max-w-md">
                Three pathways into the work. Pick where you are, not where you think you should be.
              </p>
            </div>
            <div className="flex gap-2">
              <span className="bg-secondary-container text-on-secondary-container px-4 py-2 rounded-full text-sm font-bold">Our Courses</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div className="group bg-surface-container-lowest p-6 rounded-lg shadow-sm hover:scale-[1.02] transition-all duration-500 flex flex-col h-full">
              <div className="aspect-video rounded-md overflow-hidden mb-6 relative">
                <img
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  src="https://static.wixstatic.com/media/4da84e_c31b57ea3f544c65b80f89227da062d3~mv2.jpg/v1/fill/w_698,h_526,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/1E1A9746.jpg"
                  alt="A golden retriever sitting attentively during a training session"
                />
                <span className="absolute top-4 right-4 bg-primary text-on-primary text-xs font-bold px-3 py-1 rounded-full">Bestseller</span>
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-secondary mb-2">Where everyone starts</span>
              <h3 className="font-headline text-2xl font-bold mb-2">Foundations</h3>
              <p className="text-on-surface-variant text-sm mb-6 flex-grow">
                The basics most trainers skip — eye contact, engagement, and reading your dog. Before any movement, before any music.
              </p>
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
            {/* Card 2 */}
            <div className="group bg-surface-container-lowest p-6 rounded-lg shadow-sm hover:scale-[1.02] transition-all duration-500 md:translate-y-8 flex flex-col h-full">
              <div className="aspect-video rounded-md overflow-hidden mb-6 relative">
                <img
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  src="https://static.wixstatic.com/media/4da84e_b3eaefd5248241eaa3b1905ff9ba6fea~mv2.jpg/v1/fill/w_865,h_737,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/4da84e_b3eaefd5248241eaa3b1905ff9ba6fea~mv2.jpg"
                  alt="Close up of a dog's paws and trainer's feet in sync during a complex trick move"
                />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-secondary mb-2">Build a vocabulary</span>
              <h3 className="font-headline text-2xl font-bold mb-2">Trick courses</h3>
              <p className="text-on-surface-variant text-sm mb-6 flex-grow">
                Jumping Tricks, Photo Tricks, Human Movement. Short, focused courses that each end in a single, clear &ldquo;yes we did it&rdquo; moment.
              </p>
              <div className="flex justify-between items-center pt-6 border-t border-surface-container-high">
                <div>
                  <span className="block text-xs font-label text-outline uppercase font-bold">5 Lessons</span>
                  <span className="text-xl font-headline font-extrabold text-secondary">$129</span>
                </div>
                <button className="text-primary font-bold flex items-center gap-1 group/btn">
                  Enroll <span className="material-symbols-outlined text-lg group-hover/btn:translate-x-1 transition-transform">chevron_right</span>
                </button>
              </div>
            </div>
            {/* Card 3 */}
            <div className="group bg-surface-container-lowest p-6 rounded-lg shadow-sm hover:scale-[1.02] transition-all duration-500 flex flex-col h-full">
              <div className="aspect-video rounded-md overflow-hidden mb-6 relative">
                <img
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAShQgUCFYClDx5Gtnp8kziitAOUcAEcQjhoTIrHcBNZpAcwJPIlhjRY6zuabCDHTYzDjwj-E8IQqcucJh58jSNpQ6DTs4mX49CBaO4G9_cyrct3IgI46dDLQq7M86YlVpZSepG10BSWYmxtYZUheJ4D3lBHhY21DAyhWrUROoVJ0LZ1UrUCn_MNee6Ie_8jkQh6kKbtG1fGT-Pswo9fUZ5QY-DtANCh6AXqvOgmB-3kBFG1zatGDAYXFqr_TPkj0PoxRpHEv0dWe91"
                  alt="Border collie jumping over a trainer's back in a theatrical stage setting"
                />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-secondary mb-2">Put it together</span>
              <h3 className="font-headline text-2xl font-bold mb-2">Technical Dance</h3>
              <p className="text-on-surface-variant text-sm mb-6 flex-grow">
                Choreography is the side effect of a real conversation. Music, narrative, and the freedom to play together.
              </p>
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
        <section id="about" className="bg-surface-container-high py-24 mt-20">
          <div className="max-w-7xl mx-auto px-8 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div className="relative order-2 md:order-1">
              <div className="bg-white p-4 rounded-lg shadow-2xl rotate-2 relative z-10">
                <img
                  className="w-full h-auto rounded"
                  src="https://static.wixstatic.com/media/4da84e_329430c4ba7a4fceaed03233d4672603~mv2.jpg/v1/fill/w_519,h_590,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/1E1A9651.jpg"
                  alt="Roni Sagi smiling with her dog"
                />
              </div>
              <div className="absolute -bottom-8 -left-8 bg-secondary-container p-6 rounded-lg shadow-xl z-20 max-w-[240px]">
                <p className="font-headline font-bold text-on-secondary-container italic">
                  &ldquo;If you&apos;re not having fun, you&apos;re doing it wrong.&rdquo;
                </p>
              </div>
            </div>
            <div className="order-1 md:order-2">
              <span className="text-primary font-bold uppercase tracking-widest text-sm mb-4 block">Meet Your Coach</span>
              <h2 className="font-headline text-4xl md:text-5xl font-extrabold mb-6">
                Roni Sagi.<br />
                <span className="text-primary italic">Trainer. Performer. &ldquo;Translator&rdquo;.</span>
              </h2>
              <p className="text-on-surface-variant text-lg leading-relaxed mb-6">
                Dog trainer since 2017, and an America&apos;s Got Talent finalist. Roni&apos;s work isn&apos;t only about turning dogs into performers — it&apos;s about teaching humans to listen so dogs feel safe enough to play.
              </p>
              <p className="text-on-surface-variant text-lg leading-relaxed mb-8">
                Every lesson is built on positive reinforcement, body awareness, and the radical idea that your dog doesn&apos;t need to be &ldquo;fixed.&rdquo; They need to be heard.
              </p>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-3xl font-headline font-black text-primary">AGT</p>
                  <p className="text-sm text-outline font-bold">Top-10 Finalist</p>
                </div>
                <div>
                  <p className="text-3xl font-headline font-black text-primary">5,000+</p>
                  <p className="text-sm text-outline font-bold">Handlers Worldwide</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Membership Tiers */}
        <section id="membership" className="py-24 max-w-7xl mx-auto px-8">
          <div className="text-center mb-16">
            <h2 className="font-headline text-4xl md:text-5xl font-extrabold mb-4">Membership, not just access.</h2>
            <p className="text-on-surface-variant max-w-xl mx-auto">
              A weekly rhythm of new lessons, live coaching with Roni, and a community of people who get it. Cancel anytime.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Monthly */}
            <div className="bg-surface-container-low p-8 rounded-lg flex flex-col">
              <h3 className="font-headline text-xl font-bold mb-2">Monthly</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-headline font-black text-on-surface">$49</span>
                <span className="text-on-surface-variant">/month</span>
              </div>
              <p className="text-sm text-on-surface-variant mb-6">Month-to-month. Try the work, cancel any time.</p>
              <ul className="space-y-4 mb-10 flex-grow">
                <li className="flex items-center gap-3 text-sm">
                  <span className="material-symbols-outlined text-secondary text-sm">check_circle</span> Full course library
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <span className="material-symbols-outlined text-secondary text-sm">check_circle</span> Private community
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <span className="material-symbols-outlined text-secondary text-sm">check_circle</span> Monthly Webinar
                </li>
              </ul>
              <Link
                href="/enroll"
                className="w-full text-center inline-block border-2 border-primary text-primary py-3 rounded-full font-bold hover:bg-primary hover:text-on-primary transition-all"
                style={{ textDecoration: "none" }}
              >
                Start Monthly
              </Link>
            </div>
            {/* Yearly (highlighted) */}
            <div className="bg-secondary-container p-8 rounded-lg shadow-2xl relative scale-105 flex flex-col border-4 border-secondary/20">
              <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-secondary text-on-secondary px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                Best value
              </span>
              <h3 className="font-headline text-xl font-bold mb-2">Yearly</h3>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-4xl font-headline font-black text-on-secondary-container">$380</span>
                <span className="text-on-secondary-container/70">/year</span>
              </div>
              <p className="text-sm text-on-secondary-container/80 mb-6">That&apos;s $31.67 a month. Two months free vs. monthly.</p>
              <ul className="space-y-4 mb-10 flex-grow">
                <li className="flex items-center gap-3 text-sm font-medium">
                  <span className="material-symbols-outlined text-secondary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span> Everything in Monthly
                </li>
                <li className="flex items-center gap-3 text-sm font-medium">
                  <span className="material-symbols-outlined text-secondary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span> Personal video feedback from Roni
                </li>
                <li className="flex items-center gap-3 text-sm font-medium">
                  <span className="material-symbols-outlined text-secondary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span> Every new course as it drops
                </li>
                <li className="flex items-center gap-3 text-sm font-medium">
                  <span className="material-symbols-outlined text-secondary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span> Workshop archive
                </li>
              </ul>
              <Link
                href="/enroll"
                className="w-full text-center inline-block bg-secondary text-on-secondary py-4 rounded-full font-bold shadow-lg shadow-secondary/30"
                style={{ textDecoration: "none" }}
              >
                Start Yearly
              </Link>
            </div>
            {/* 3-Month Sprint */}
            <div className="bg-surface-container-low p-8 rounded-lg flex flex-col">
              <h3 className="font-headline text-xl font-bold mb-2">3-Month Sprint</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-headline font-black text-on-surface">$109</span>
                <span className="text-on-surface-variant">/quarter</span>
              </div>
              <p className="text-sm text-on-surface-variant mb-6">A focused 12-week window. Save vs. month-to-month.</p>
              <ul className="space-y-4 mb-10 flex-grow">
                <li className="flex items-center gap-3 text-sm">
                  <span className="material-symbols-outlined text-secondary text-sm">check_circle</span> Full library for 90 days
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <span className="material-symbols-outlined text-secondary text-sm">check_circle</span> 1 office hours call
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <span className="material-symbols-outlined text-secondary text-sm">check_circle</span> Pause anytime
                </li>
              </ul>
              <Link
                href="/enroll"
                className="w-full text-center inline-block border-2 border-primary text-primary py-3 rounded-full font-bold hover:bg-primary hover:text-on-primary transition-all"
                style={{ textDecoration: "none" }}
              >
                Start Sprint
              </Link>
            </div>
          </div>
        </section>

        {/* Growth Tracks */}
        <section className="py-24 bg-surface-container-low/30 overflow-hidden">
          <div className="max-w-7xl mx-auto px-8">
            <div className="mb-16">
              <h2 className="font-headline text-4xl font-extrabold mb-4">Pick a starting line.</h2>
              <p className="text-on-surface-variant max-w-xl">
                Three tracks, same destination: a dog who watches you because they want to, not because they have to.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {/* Track 1: Free */}
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <span className="bg-tertiary-container text-on-tertiary-container w-10 h-10 rounded-full flex items-center justify-center font-black">01</span>
                  <h4 className="font-headline text-xl font-bold">Free</h4>
                </div>
                <div className="space-y-3">
                  <div className="p-4 bg-surface-container-lowest rounded-md shadow-sm border-l-4 border-tertiary">Free mini-class</div>
                  <div className="p-4 bg-surface-container-lowest rounded-md shadow-sm opacity-70">PDF: 5 foundational moves</div>
                  <div className="p-4 bg-surface-container-lowest rounded-md shadow-sm opacity-70">Monthly community challenge</div>
                  <div className="p-4 bg-surface-container-lowest rounded-md shadow-sm opacity-70">YouTube tutorials</div>
                  <div className="p-4 bg-surface-container-lowest rounded-md shadow-sm opacity-70">Newsletter from Roni</div>
                </div>
              </div>
              {/* Track 2: Membership */}
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <span className="bg-primary-container text-on-primary-container w-10 h-10 rounded-full flex items-center justify-center font-black">02</span>
                  <h4 className="font-headline text-xl font-bold">Membership</h4>
                </div>
                <div className="space-y-3">
                  <div className="p-4 bg-surface-container-lowest rounded-md shadow-sm border-l-4 border-primary">Foundations</div>
                  <div className="p-4 bg-surface-container-lowest rounded-md shadow-sm opacity-70">Dog Dance Foundations</div>
                  <div className="p-4 bg-surface-container-lowest rounded-md shadow-sm opacity-70">Jumping Tricks</div>
                  <div className="p-4 bg-surface-container-lowest rounded-md shadow-sm opacity-70">Human Movement</div>
                  <div className="p-4 bg-surface-container-lowest rounded-md shadow-sm opacity-70">Photo Tricks &amp; Mini-Courses</div>
                </div>
              </div>
              {/* Track 3: Inner Circle */}
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <span className="bg-secondary-container text-on-secondary-container w-10 h-10 rounded-full flex items-center justify-center font-black">03</span>
                  <h4 className="font-headline text-xl font-bold">Inner Circle</h4>
                </div>
                <div className="space-y-3">
                  <div className="p-4 bg-surface-container-lowest rounded-md shadow-sm border-l-4 border-secondary">Technical Dance</div>
                  <div className="p-4 bg-surface-container-lowest rounded-md shadow-sm opacity-70">Live monthly office hours</div>
                  <div className="p-4 bg-surface-container-lowest rounded-md shadow-sm opacity-70">Personal video feedback</div>
                  <div className="p-4 bg-surface-container-lowest rounded-md shadow-sm opacity-70">Workshop archive</div>
                  <div className="p-4 bg-surface-container-lowest rounded-md shadow-sm opacity-70">Private community</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-24 max-w-7xl mx-auto px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div>
              <span className="bg-tertiary-container text-on-tertiary-container text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-6 inline-block">
                Student Spotlight
              </span>
              <h2 className="font-headline text-4xl md:text-5xl font-extrabold mb-8 leading-tight">
                &ldquo;Clear, structured, and my dog loves them. It reignited my passion for dog dancing.&rdquo;
              </h2>
              <div className="flex items-center gap-4">
                <img
                  className="w-16 h-16 rounded-full object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDps2UDcOtJtPGT5UGKBffn_YtzUFxS7Q8hXx9RYig92kgX3WKspQaA86SJfyioqvAr3krjS2MKBMQSocu44WWiSc84O7u5zzbweC_biYhAqPzslWOPDeA_gcHSs-xzxh3rQMLNsXbjs4mgey9ZjjWzVfhVAiIV4H7_tpXQiV2r9IZwuu0KgSQjcxJLCx4yBe6E-fXA7DfZl5F_SGUnp87s60FWQ7mXCDL5-vJqxaXNy0JhvQeJcDTxDJJPZo0Scph8fkdo0lsMqoKI"
                  alt="Portrait of a smiling young woman student"
                />
                <div>
                  <p className="font-bold">Sarah &amp; Bella</p>
                  <p className="text-sm text-outline font-medium">Foundations &amp; Expert Graduate</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-lg shadow-sm mt-8">
                <p className="text-sm italic mb-4">
                  &ldquo;The first time Toby looked up at me during a routine — not for the treat, for me — I cried. We&apos;ve never had that before.&rdquo;
                </p>
                <p className="font-bold text-xs">— Marcus &amp; Toby</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <p className="text-sm italic mb-4">
                  &ldquo;I never thought my senior rescue could dance. We&apos;re not winning competitions; we&apos;re winning evenings.&rdquo;
                </p>
                <p className="font-bold text-xs">— Elena &amp; Luna</p>
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
              <h2 className="font-headline text-3xl md:text-5xl font-black mb-4">Your first free lesson.</h2>
              <p className="text-lg text-on-primary/80 max-w-lg">
                Three foundational moves in under fifteen minutes. No credit card. You&apos;ll feel the shift on day one.
              </p>
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
                  <button
                    className="bg-white text-primary px-8 py-3 rounded-full font-bold whitespace-nowrap hover:bg-orange-50 transition-colors"
                    type="submit"
                  >
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
