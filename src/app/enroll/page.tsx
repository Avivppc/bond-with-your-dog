import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";

export default function EnrollPage() {
  return (
    <>
      <Navbar />
      <main>

        {/* Hero */}
        <section className="relative min-h-[870px] flex items-center pt-20 overflow-hidden">
          <div className="max-w-7xl mx-auto px-8 grid md:grid-cols-2 gap-12 items-center relative z-10">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 bg-secondary-container text-on-secondary-container px-4 py-2 rounded-full font-label font-semibold text-sm">
                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                World-Class Choreography
              </div>
              <h1 className="font-headline font-extrabold text-6xl md:text-7xl text-on-surface leading-[1.1] tracking-tight">
                Find Your <span className="text-primary italic">Rhythm</span>. <br />Master the Duet.
              </h1>
              <p className="text-xl text-on-surface-variant max-w-lg leading-relaxed">
                Whether you&apos;re starting with your first puppy or preparing for the spotlight, our expert-led tracks guide you every step of the way.
              </p>
              <div className="flex flex-wrap gap-4 pt-4">
                <Link href="/courses" className="bg-primary text-on-primary px-10 py-5 rounded-full font-bold text-lg shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3">
                  Explore the Tracks
                  <span className="material-symbols-outlined">arrow_forward</span>
                </Link>
                <button className="bg-surface-container-lowest border border-outline-variant/20 px-8 py-5 rounded-full font-bold text-lg text-secondary hover:bg-surface-bright transition-all">
                  Watch Trailer
                </button>
              </div>
            </div>
            <div className="relative lg:scale-110">
              <div className="absolute inset-0 bg-primary-container/20 rounded-full blur-3xl -z-10"></div>
              <img className="rounded-[3rem] shadow-2xl object-cover w-full h-[600px] -rotate-2 hover:rotate-0 transition-transform duration-700" src="https://static.wixstatic.com/media/4da84e_a0a1b15a92f44c7ab5cf86f708589c1f~mv2.jpg/v1/fill/w_1680,h_737,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/4da84e_a0a1b15a92f44c7ab5cf86f708589c1f~mv2.jpg" alt="A professional dog trainer and a golden retriever in a mid-performance dynamic pose" />
              <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-2xl shadow-xl flex items-center gap-4 max-w-xs">
                <div className="bg-tertiary-container p-3 rounded-xl">
                  <span className="material-symbols-outlined text-on-tertiary-container" style={{ fontVariationSettings: "'FILL' 1" }}>pets</span>
                </div>
                <div>
                  <div className="text-xl font-bold font-headline">12k+</div>
                  <div className="text-sm text-on-surface-variant">Active Dancers Globally</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Social Proof */}
        <section className="py-16 bg-surface-container-low/50">
          <div className="max-w-7xl mx-auto px-8">
            <p className="text-center font-label text-sm font-semibold text-outline tracking-widest uppercase mb-10">As Seen On</p>
            <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
              <span className="text-2xl font-black font-headline text-on-surface">AGT</span>
              <span className="text-2xl font-black font-headline text-on-surface">NBC SPORTS</span>
              <span className="text-2xl font-black font-headline text-on-surface">DOG SHOW</span>
              <span className="text-2xl font-black font-headline text-on-surface">MASTER CLASS</span>
            </div>
          </div>
        </section>

        {/* Tier Comparison */}
        <section className="py-24 px-8 max-w-7xl mx-auto">
          <div className="text-center mb-20 space-y-4">
            <h2 className="font-headline font-extrabold text-5xl text-on-surface tracking-tight">Choose Your Training Stage</h2>
            <p className="text-on-surface-variant text-lg max-w-2xl mx-auto">Structured learning paths designed to take you from a curious novice to a performance-ready maestro.</p>
          </div>
          <div className="grid lg:grid-cols-3 gap-8 items-stretch">
            <div className="bg-surface-container-lowest p-10 rounded-lg shadow-sm border border-outline-variant/10 flex flex-col hover:scale-[1.02] transition-transform">
              <div className="mb-8">
                <span className="bg-surface-container text-secondary px-4 py-1 rounded-full font-label text-xs font-bold uppercase tracking-wider">Level 1</span>
                <h3 className="font-headline font-bold text-3xl mt-4 mb-2">The Essential Bond</h3>
                <p className="text-on-surface-variant leading-relaxed">Focus on the basics, building profound connection, and pure joy.</p>
              </div>
              <div className="mb-8">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black font-headline">$49</span>
                  <span className="text-on-surface-variant font-medium">/mon</span>
                </div>
              </div>
              <ul className="space-y-4 mb-10 flex-grow">
                <li className="flex items-center gap-3 text-on-surface-variant font-medium">
                  <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  5 Foundations Lessons
                </li>
                <li className="flex items-center gap-3 text-on-surface-variant font-medium">
                  <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  Access to Community Forum
                </li>
                <li className="flex items-center gap-3 text-on-surface-variant font-medium">
                  <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  Weekly Focus Challenges
                </li>
              </ul>
              <button className="w-full py-4 rounded-full border-2 border-primary text-primary font-bold hover:bg-primary hover:text-on-primary transition-all">Get Started</button>
            </div>
            <div className="bg-secondary-container p-10 rounded-lg shadow-2xl flex flex-col relative z-10 lg:-translate-y-4 lg:scale-105">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-on-primary px-6 py-2 rounded-full font-bold text-sm">MOST POPULAR</div>
              <div className="mb-8 pt-4">
                <span className="bg-secondary text-on-secondary px-4 py-1 rounded-full font-label text-xs font-bold uppercase tracking-wider">Level 2</span>
                <h3 className="font-headline font-bold text-3xl mt-4 mb-2 text-on-secondary-container">Precision &amp; Flow</h3>
                <p className="text-on-secondary-container opacity-80 leading-relaxed">Master the technicality: spins, pivots, and seamless transitions.</p>
              </div>
              <div className="mb-8">
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-black font-headline text-on-secondary-container">$65</span>
                  <span className="text-on-secondary-container opacity-80 font-medium">/mon</span>
                </div>
              </div>
              <ul className="space-y-4 mb-10 flex-grow">
                <li className="flex items-center gap-3 text-on-secondary-container font-semibold">
                  <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  12 Advanced Flow Modules
                </li>
                <li className="flex items-center gap-3 text-on-secondary-container font-semibold">
                  <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  Live Q&amp;A with Roni Sagi
                </li>
                <li className="flex items-center gap-3 text-on-secondary-container font-semibold">
                  <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  Detailed Precision Feedback
                </li>
              </ul>
              <button className="w-full py-4 rounded-full bg-secondary text-on-secondary font-bold shadow-lg hover:scale-[1.02] active:scale-95 transition-all">Get Started</button>
            </div>
            <div className="bg-surface-container-lowest p-10 rounded-lg shadow-sm border border-outline-variant/10 flex flex-col hover:scale-[1.02] transition-transform">
              <div className="mb-8">
                <span className="bg-surface-container text-secondary px-4 py-1 rounded-full font-label text-xs font-bold uppercase tracking-wider">Mastery</span>
                <h3 className="font-headline font-bold text-3xl mt-4 mb-2">The Masterpiece</h3>
                <p className="text-on-surface-variant leading-relaxed">Artistry unleashed: focus on musicality, props, and performance.</p>
              </div>
              <div className="mb-8">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black font-headline">$89</span>
                  <span className="text-on-surface-variant font-medium">/mon</span>
                </div>
              </div>
              <ul className="space-y-4 mb-10 flex-grow">
                <li className="flex items-center gap-3 text-on-surface-variant font-medium">
                  <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  Full Performance Planning
                </li>
                <li className="flex items-center gap-3 text-on-surface-variant font-medium">
                  <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  Musicality Workshops
                </li>
                <li className="flex items-center gap-3 text-on-surface-variant font-medium">
                  <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  Unlimited Video Reviews
                </li>
              </ul>
              <button className="w-full py-4 rounded-full border-2 border-primary text-primary font-bold hover:bg-primary hover:text-on-primary transition-all">Get Started</button>
            </div>
          </div>
        </section>

        {/* Curriculum Deep Dive */}
        <section className="py-24 bg-surface-container-low overflow-hidden">
          <div className="max-w-7xl mx-auto px-8 grid lg:grid-cols-2 gap-20 items-center">
            <div className="relative">
              <img className="rounded-xl shadow-2xl relative z-10 w-full h-[500px] object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBiZym8_AznLQWHguaZ5Gif_YAttECBQZ0qZY16F3umb8Aq5jt6GirlVkB3NO4zA2D2gnMgLmBCS9T0AWFw3I3CQFCxbxzx3ScQhf0X4tgq7J1jPJbq4WLXJouElowycjy0M31tVaXJ5oKxpU98BJ0G742FkQZmDXBmz2T996pVB-KcrIzPcdCzCA6TTL_smFkTVM96IWMsONiV_OFNlA6gDo7MkdTmxwZdAmn5xyOu2G7ttkFVVWdudxeTeiGR6f7SUqHf43hBXqPJ" alt="A happy dog performing a precision paw-target trick on a professional training mat" />
              <div className="absolute -top-10 -right-10 w-64 h-64 bg-primary-container/20 rounded-full blur-3xl"></div>
            </div>
            <div className="space-y-12">
              <h2 className="font-headline font-extrabold text-5xl leading-tight">Inside the <br /><span className="text-secondary">Curriculum</span></h2>
              <div className="space-y-8">
                <div className="flex gap-6 items-start group">
                  <div className="bg-surface-container-highest p-4 rounded-2xl group-hover:bg-primary-container transition-colors duration-300">
                    <span className="material-symbols-outlined text-3xl text-on-surface-variant group-hover:text-on-primary-container">music_note</span>
                  </div>
                  <div>
                    <h4 className="font-headline font-bold text-xl mb-2">Musical Literacy</h4>
                    <p className="text-on-surface-variant leading-relaxed">Learn to count beats and match your dog&apos;s gait to different musical genres and tempos.</p>
                  </div>
                </div>
                <div className="flex gap-6 items-start group">
                  <div className="bg-surface-container-highest p-4 rounded-2xl group-hover:bg-primary-container transition-colors duration-300">
                    <span className="material-symbols-outlined text-3xl text-on-surface-variant group-hover:text-on-primary-container">psychology</span>
                  </div>
                  <div>
                    <h4 className="font-headline font-bold text-xl mb-2">Canine Psychology</h4>
                    <p className="text-on-surface-variant leading-relaxed">Understand the &apos;why&apos; behind the dance, ensuring your dog is always motivated and happy.</p>
                  </div>
                </div>
                <div className="flex gap-6 items-start group">
                  <div className="bg-surface-container-highest p-4 rounded-2xl group-hover:bg-primary-container transition-colors duration-300">
                    <span className="material-symbols-outlined text-3xl text-on-surface-variant group-hover:text-on-primary-container">theater_comedy</span>
                  </div>
                  <div>
                    <h4 className="font-headline font-bold text-xl mb-2">Showmanship</h4>
                    <p className="text-on-surface-variant leading-relaxed">Techniques for the handler to project confidence and grace on any stage.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonial */}
        <section className="py-24 max-w-7xl mx-auto px-8">
          <div className="bg-white rounded-xl shadow-xl overflow-hidden grid md:grid-cols-5 items-center">
            <div className="md:col-span-2 h-full">
              <img className="w-full h-full object-cover min-h-[400px]" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCuqu3-FKPyAYnDIWait8eb94ByYrpgYC_iTF1hVu4WAW_6qDmzFb_F-wVUdHvOIAyXyU08FE3lADZMjlzuD5IiPe6OpJg7VlAyeliSpSRNxNOmsYfK7QllPY1mJqmBIzZzeuVBDyi9rkZJ3AmJj4FqwuhIYo9znKPmYmJ1N3hFPBXHtJm9Zy9IFj2J86iZ-uaJGasCzDrv_fgk-YhiKguefAvdy58DIBMV-Xh1AH-uJzHbztCnI2zipgNzJzxQvR7KgpO3gZbSzBYn" alt="A smiling young woman and her border collie after a successful dance routine" />
            </div>
            <div className="md:col-span-3 p-12 md:p-20 relative">
              <span className="material-symbols-outlined text-6xl text-primary opacity-20 absolute top-10 right-10">format_quote</span>
              <blockquote className="relative z-10">
                <p className="text-3xl font-headline font-medium leading-relaxed text-on-surface italic">
                  &ldquo;I never knew my bond with Cooper could go this deep. The Academy didn&apos;t just teach us tricks; they taught us how to speak the same language through rhythm.&rdquo;
                </p>
                <footer className="mt-8 flex items-center gap-4">
                  <div className="h-1 w-12 bg-primary"></div>
                  <div>
                    <div className="font-headline font-bold text-xl">Elena Richardson</div>
                    <div className="text-on-surface-variant">Advanced Track Graduate</div>
                  </div>
                </footer>
              </blockquote>
            </div>
          </div>
        </section>

        {/* About Roni */}
        <section className="py-24 bg-surface-container overflow-hidden">
          <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row items-center gap-16">
            <div className="md:w-1/2 space-y-8">
              <h2 className="font-headline font-extrabold text-5xl">Meet <span className="text-primary">Roni Sagi</span></h2>
              <p className="text-xl text-on-surface-variant leading-relaxed">
                With over a decade of international performance and training experience, Roni&apos;s mission is to redefine canine companionship through the art of dance. Her unique methodology focuses on mutual respect, kinetic awareness, and shared joy.
              </p>
              <div className="flex items-center gap-8">
                <div>
                  <div className="text-3xl font-black font-headline text-secondary">15+</div>
                  <div className="text-sm font-label uppercase font-bold text-outline">Awards Won</div>
                </div>
                <div className="w-px h-12 bg-outline-variant/30"></div>
                <div>
                  <div className="text-3xl font-black font-headline text-secondary">5k+</div>
                  <div className="text-sm font-label uppercase font-bold text-outline">Students Trained</div>
                </div>
              </div>
            </div>
            <div className="md:w-1/2 relative">
              <div className="absolute -z-10 w-[120%] h-[120%] -top-10 -left-10 border-[20px] border-secondary/5 rounded-[4rem]"></div>
              <img className="rounded-[3rem] shadow-2xl relative z-10 w-full h-[550px] object-cover" src="https://d2a0gza273xfgz.cloudfront.net/698869/uploads/6f351a90-27c0-11ef-b216-0b0450ae7774_1200_630.jpeg" alt="Instructor Roni Sagi interacting joyfully with a trained dog" />
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-24 relative overflow-hidden bg-primary">
          <div className="absolute inset-0 opacity-20">
            <img className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD9H6p6Ty1cUrggrPZiGOb3nlBg0at23p3QeouEXWBm3IHlmS80YoZTnJe99lUWhW9hLY3axBcMAAUVsB4_nlAGjXlsYzB7ndKK1WgwhbC77swcsLkSIdXgPJLun21OetOvQs1CH8R6TcOE9SwBbEYpaf7ibod9gykYdit9sdb4i9XcczK3nHto0Vh0Q1mZT0IIvX_4EWMQXZ7wuJ5ao6eIPb1bzkpEsnyiWICpCGq7QJkHZdPuSehvUnVjx5Av5YoFifIHK7H39eVl" alt="Dog and handler silhouetted against a setting sun in a beautiful dance posture" />
          </div>
          <div className="relative z-10 max-w-4xl mx-auto text-center px-8 text-on-primary">
            <h2 className="font-headline font-black text-6xl md:text-7xl mb-8 tracking-tighter">Ready to Dance?</h2>
            <p className="text-2xl opacity-90 mb-12 max-w-2xl mx-auto">
              Your journey to the spotlight begins today. Join thousands of handlers worldwide in the Keta Tov family.
            </p>
            <button className="bg-on-primary text-primary px-12 py-6 rounded-full font-black text-2xl shadow-2xl hover:scale-105 active:scale-95 transition-all">
              Join the Academy
            </button>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
