import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";

export default function KineticBasicsPage() {
  return (
    <>
      <Navbar />
      <main className="pt-24">

        {/* Hero */}
        <section className="relative px-6 py-20 lg:py-32 overflow-hidden">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1 space-y-8 z-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary-container text-secondary text-sm font-bold tracking-wide">
                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                LEVEL 1: FUNDAMENTALS
              </div>
              <h1 className="text-5xl lg:text-7xl font-extrabold text-on-surface tracking-tighter leading-[1.1]">
                The Kinetic Basics: <span className="text-primary italic">First Steps</span> to Rhythm
              </h1>
              <p className="text-xl text-on-surface-variant max-w-xl leading-relaxed">
                Transform your daily walk into a synchronized performance. Build the foundational bond and physical cues required for the art of canine freestyle and dog dancing.
              </p>
              <div className="flex flex-wrap gap-4">
                <button className="bg-primary text-on-primary px-8 py-4 rounded-full font-bold text-lg flex items-center gap-3 active:scale-90 transition-all shadow-xl">
                  Buy Course <span className="material-symbols-outlined">arrow_forward</span>
                </button>
                <button className="bg-surface-container-high text-on-surface px-8 py-4 rounded-full font-bold text-lg hover:bg-surface-container-highest transition-colors">
                  Explore Curriculum
                </button>
              </div>
            </div>
            <div className="flex-1 relative w-full aspect-video rounded-xl overflow-hidden shadow-2xl group cursor-pointer">
              <img className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDwcpOSt4h8FZh2QL9I-WuNwyaQkfEQ_DTsmDfmtyyd1iSaFkjLvoHCaTAx3dzL_4O2QcB17Umicav9AvK35V1Tm3lkwB1LqVEqVb0Y9Q1gML8PWsQYK-RvYqQRKrnme1I3iV_DPVPgnVVCd8mH9yA84hKHrKmj4l_y1cnTWMhMmr0fyoRerBIAHC4hl8otVcZl_qbuTKzBqnRXyiHy8lmfhoq0DSbJ_7I9S4ia6FHfDuNpY4Lg1DGnR0wX5gLfF_uPSIIYc4HgNYgm" alt="A professional female trainer and her border collie in a sun-drenched training hall" />
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center transition-opacity group-hover:bg-black/10">
                <div className="w-20 h-20 bg-primary-container rounded-full flex items-center justify-center shadow-2xl animate-pulse">
                  <span className="material-symbols-outlined text-on-primary-container text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 -z-10 w-1/3 h-full bg-gradient-to-l from-primary-container/10 to-transparent blur-3xl opacity-50"></div>
        </section>

        {/* Learning Outcomes */}
        <section className="py-24 bg-surface-container-low">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-on-surface mb-4">What You&apos;ll Master</h2>
              <div className="h-1.5 w-24 bg-primary mx-auto rounded-full"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
              <div className="bg-surface-container-lowest p-8 rounded-lg hover:bg-surface-bright transition-all duration-300 hover:scale-[1.02] flex flex-col items-start gap-4 shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-secondary-container flex items-center justify-center text-secondary">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>visibility</span>
                </div>
                <h3 className="text-xl font-bold text-on-surface">Eye Contact</h3>
                <p className="text-on-surface-variant text-sm leading-relaxed">Establish unbreakable focus that remains steady even amidst rhythmic music and environmental distractions.</p>
              </div>
              <div className="bg-surface-container-lowest p-8 rounded-lg hover:bg-surface-bright transition-all duration-300 hover:scale-[1.02] flex flex-col items-start gap-4 shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-primary-container/20 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>step_over</span>
                </div>
                <h3 className="text-xl font-bold text-on-surface">Footwork Cues</h3>
                <p className="text-on-surface-variant text-sm leading-relaxed">Translate complex handler leg movements into silent commands for precise canine positioning.</p>
              </div>
              <div className="bg-surface-container-lowest p-8 rounded-lg hover:bg-surface-bright transition-all duration-300 hover:scale-[1.02] flex flex-col items-start gap-4 shadow-sm md:col-span-2">
                <div className="w-12 h-12 rounded-2xl bg-tertiary-container/30 flex items-center justify-center text-tertiary">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>sync</span>
                </div>
                <h3 className="text-xl font-bold text-on-surface">Basic Pivots</h3>
                <p className="text-on-surface-variant text-sm leading-relaxed">Master the 180 and 360-degree rotations in tight formation, maintaining the perfect &apos;heel&apos; distance during every transition.</p>
              </div>
              <div className="bg-surface-container-lowest p-8 rounded-lg hover:bg-surface-bright transition-all duration-300 hover:scale-[1.02] flex flex-col items-start gap-4 shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-secondary-container flex items-center justify-center text-secondary">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
                </div>
                <h3 className="text-xl font-bold text-on-surface">Handling Basics</h3>
                <p className="text-on-surface-variant text-sm leading-relaxed">Learn the editorial art of posture and energy control to lead your partner with silent confidence.</p>
              </div>
              <div className="bg-surface-container-lowest p-8 rounded-lg hover:bg-surface-bright transition-all duration-300 hover:scale-[1.02] flex flex-col items-start gap-4 shadow-sm lg:col-span-2">
                <div className="w-12 h-12 rounded-2xl bg-primary-container/20 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>music_note</span>
                </div>
                <h3 className="text-xl font-bold text-on-surface">Beat Recognition</h3>
                <p className="text-on-surface-variant text-sm leading-relaxed">Develop the internal clock required to synchronize your dog&apos;s gait with any tempo, from slow waltzes to upbeat pop.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Curriculum */}
        <section className="py-24">
          <div className="max-w-4xl mx-auto px-6">
            <div className="flex items-center justify-between mb-12">
              <h2 className="text-4xl font-bold text-on-surface">Course Curriculum</h2>
              <span className="text-on-surface-variant font-medium">12 Lessons • 4.5 Hours Content</span>
            </div>
            <div className="space-y-4">
              <div className="bg-surface-container p-1 rounded-lg">
                <details className="group">
                  <summary className="flex items-center justify-between p-6 bg-surface-container-lowest rounded-lg cursor-pointer list-none">
                    <div className="flex items-center gap-4">
                      <span className="bg-secondary text-on-secondary w-10 h-10 rounded-full flex items-center justify-center font-bold">01</span>
                      <h3 className="text-xl font-bold text-on-surface">Module 1: The Connection</h3>
                    </div>
                    <span className="material-symbols-outlined group-open:rotate-180 transition-transform">expand_more</span>
                  </summary>
                  <div className="p-8 space-y-6 bg-surface-container-lowest/50">
                    <div className="flex items-start gap-4">
                      <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>play_circle</span>
                      <div>
                        <h4 className="font-bold text-on-surface">Lesson 1: The Silent Dialogue</h4>
                        <p className="text-sm text-on-surface-variant">Understanding body language and &apos;pre-cues&apos; that signal movement before it happens.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>play_circle</span>
                      <div>
                        <h4 className="font-bold text-on-surface">Lesson 2: Focus Foundations</h4>
                        <p className="text-sm text-on-surface-variant">Building duration in eye contact while the handler is in motion.</p>
                      </div>
                    </div>
                  </div>
                </details>
              </div>
              <div className="bg-surface-container p-1 rounded-lg">
                <details className="group" open>
                  <summary className="flex items-center justify-between p-6 bg-surface-container-lowest rounded-lg cursor-pointer list-none">
                    <div className="flex items-center gap-4">
                      <span className="bg-secondary text-on-secondary w-10 h-10 rounded-full flex items-center justify-center font-bold">02</span>
                      <h3 className="text-xl font-bold text-on-surface">Module 2: Rhythm &amp; Beats</h3>
                    </div>
                    <span className="material-symbols-outlined group-open:rotate-180 transition-transform">expand_more</span>
                  </summary>
                  <div className="p-8 space-y-6 bg-surface-container-lowest/50">
                    <div className="flex items-start gap-4">
                      <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>play_circle</span>
                      <div>
                        <h4 className="font-bold text-on-surface">Lesson 1: Finding Your Internal Pulse</h4>
                        <p className="text-sm text-on-surface-variant">Techniques for handlers to keep a steady tempo regardless of the dog&apos;s speed.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>play_circle</span>
                      <div>
                        <h4 className="font-bold text-on-surface">Lesson 2: Matching the Paws</h4>
                        <p className="text-sm text-on-surface-variant">Selecting music that matches your dog&apos;s natural walk, trot, and pace.</p>
                      </div>
                    </div>
                  </div>
                </details>
              </div>
              <div className="bg-surface-container p-1 rounded-lg">
                <details className="group">
                  <summary className="flex items-center justify-between p-6 bg-surface-container-lowest rounded-lg cursor-pointer list-none">
                    <div className="flex items-center gap-4">
                      <span className="bg-secondary text-on-secondary w-10 h-10 rounded-full flex items-center justify-center font-bold">03</span>
                      <h3 className="text-xl font-bold text-on-surface">Module 3: Movement Fundamentals</h3>
                    </div>
                    <span className="material-symbols-outlined group-open:rotate-180 transition-transform">expand_more</span>
                  </summary>
                  <div className="p-8 space-y-6 bg-surface-container-lowest/50">
                    <div className="flex items-start gap-4">
                      <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>play_circle</span>
                      <div>
                        <h4 className="font-bold text-on-surface">Lesson 1: The Forward Flow</h4>
                        <p className="text-sm text-on-surface-variant">Maintaining position through accelerations and decelerations.</p>
                      </div>
                    </div>
                  </div>
                </details>
              </div>
            </div>
          </div>
        </section>

        {/* Instructor */}
        <section className="py-24 bg-surface-container-low">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col lg:flex-row items-center gap-16">
              <div className="lg:w-1/2 relative">
                <div className="absolute -inset-4 bg-primary-container/20 rounded-xl rotate-3"></div>
                <img className="rounded-xl shadow-2xl relative z-10 w-full object-cover aspect-[4/5]" src="https://d2a0gza273xfgz.cloudfront.net/698869/uploads/6f351a90-27c0-11ef-b216-0b0450ae7774_1200_630.jpeg" alt="Roni Sagi, dog dancing coach, kneeling beside her performance dog in a bright studio" />
              </div>
              <div className="lg:w-1/2 space-y-8">
                <h2 className="text-4xl lg:text-5xl font-bold text-on-surface leading-tight">Meet Roni Sagi</h2>
                <p className="text-lg text-on-surface-variant leading-relaxed italic">
                  &ldquo;Dog dancing isn&apos;t about control; it&apos;s about a conversation where two species speak one language: rhythm.&rdquo;
                </p>
                <div className="space-y-4 text-on-surface-variant">
                  <p>Roni Sagi has redefined canine freestyle through her &ldquo;Kinetic Duet&rdquo; philosophy. As a world-class competitor and choreographer, she believes every dog has a unique rhythm waiting to be discovered.</p>
                  <p>Her approach emphasizes the partnership over the trick, ensuring that the bond between handler and dog is the most beautiful part of the performance.</p>
                </div>
                <div className="pt-6 flex gap-12">
                  <div>
                    <p className="text-3xl font-black text-primary">15+</p>
                    <p className="text-sm font-bold text-on-surface-variant">Years Exp.</p>
                  </div>
                  <div>
                    <p className="text-3xl font-black text-primary">5k+</p>
                    <p className="text-sm font-bold text-on-surface-variant">Students</p>
                  </div>
                  <div>
                    <p className="text-3xl font-black text-primary">World</p>
                    <p className="text-sm font-bold text-on-surface-variant">Finalist</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Enrollment & Pricing */}
        <section className="py-24">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-on-surface mb-4">Start Your Journey Today</h2>
              <p className="text-on-surface-variant">Choose the path that fits your training goals.</p>
            </div>
            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              <div className="bg-surface-container-lowest p-10 rounded-lg shadow-lg flex flex-col items-center text-center hover:scale-[1.02] transition-transform">
                <h3 className="text-2xl font-bold text-on-surface mb-2">Individual Course</h3>
                <p className="text-on-surface-variant mb-6 text-sm">Lifetime access to The Kinetic Basics only.</p>
                <p className="text-5xl font-black text-on-surface mb-8">$89</p>
                <ul className="text-left space-y-4 mb-10 w-full">
                  <li className="flex items-center gap-3 text-on-surface-variant text-sm">
                    <span className="material-symbols-outlined text-primary text-xl">check_circle</span>
                    All 12 high-definition video lessons
                  </li>
                  <li className="flex items-center gap-3 text-on-surface-variant text-sm">
                    <span className="material-symbols-outlined text-primary text-xl">check_circle</span>
                    Downloadable training logs &amp; music lists
                  </li>
                  <li className="flex items-center gap-3 text-on-surface-variant text-sm">
                    <span className="material-symbols-outlined text-primary text-xl">check_circle</span>
                    Final assessment &amp; Certificate
                  </li>
                </ul>
                <button className="w-full bg-surface-container-high text-on-surface py-4 rounded-full font-bold hover:bg-surface-container-highest transition-colors">
                  Purchase Single Course
                </button>
              </div>
              <div className="bg-secondary-container p-10 rounded-lg shadow-xl flex flex-col items-center text-center relative overflow-hidden transform scale-105">
                <div className="absolute top-6 right-6 bg-secondary text-on-secondary px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest">Best Value</div>
                <h3 className="text-2xl font-bold text-secondary mb-2">Full Membership</h3>
                <p className="text-on-secondary-container mb-6 text-sm">Unlimited access to the entire Keta Tov Academy.</p>
                <p className="text-5xl font-black text-secondary mb-8">$39<span className="text-lg font-bold text-on-secondary-container">/mo<br />billed annually</span></p>
                <ul className="text-left space-y-4 mb-10 w-full">
                  <li className="flex items-center gap-3 text-on-secondary-container text-sm">
                    <span className="material-symbols-outlined text-secondary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                    Access ALL current and future courses
                  </li>
                  <li className="flex items-center gap-3 text-on-secondary-container text-sm">
                    <span className="material-symbols-outlined text-secondary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                    Weekly live Q&amp;A sessions with Roni
                  </li>
                  <li className="flex items-center gap-3 text-on-secondary-container text-sm">
                    <span className="material-symbols-outlined text-secondary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                    Exclusive community forum access
                  </li>
                </ul>
                <button className="w-full bg-primary text-on-primary py-4 rounded-full font-bold shadow-lg active:scale-95 transition-transform">
                  Join Academy Now
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-24 bg-surface-container-high/30">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-on-surface">Success Stories</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { quote: "I never thought my energetic spaniel could sit still, let alone dance. These basics gave us a focus we never had before.", author: "Sarah & Bella", role: "Course Graduate", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuD2Vslo1ILzy27eDZhVJ_GHFi7lftUvJ4T0Jfshrl2JET5EnOJtpeB0KjscXruw0yDCJXWGF0gl4eexd3iBDZiOzTTXVJhJ148q8B9-3l1pcjxG220bqfJCwRWRyzifWddr0zUNOGA8rTXzW9tWfQHxVfmP9mWFpGYRKQd-fbTMmrxZYdr88jypV6NyZzmCZRZ_ESpqlPMDJmE9KVh4d-Bf7iBZzuKw2onvnuS_sKV2BQdg07f6tEEGB-eEcu2trIIl3jxzJw5zw2hk" },
                { quote: "The rhythm module was a game changer. It completely changed how I communicate with my dog on walks. Truly rhythmic!", author: "Mark & Cooper", role: "Course Graduate", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuC8wmreoWXAhPqtwxN8H39pz0xA88TBcGC0ghEw5ksJgF6l7ECbXxAk9TLNoEWDT2rR-rRaEFP0CKO6D7b2JbJC3xPZGCzJZecAwkx1KxWu1V_pmnY0Yb_r8QjYKVrXTjlb2SeA-3vGW0_grloejhHAx67zuEcEJoxcYzkXjjfj5d27XiSRUbBUJdlKssvomUvZGsX470nynJtvb5WtIuk9dSEwYwih2leFwtyt0Cz7FWNUEVkk_P4bzyApVOAN3cGo83_92RKg9E-Z" },
                { quote: "Roni's eye for detail is incredible even in video format. The footwork cues section is the most thorough I've seen.", author: "Elena & Ghost", role: "Professional Trainer", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBeOdRVuoQOAwNXHyThciPftG6c0gQlWu-JXWQYN16K7RAcjvGsgPgMt-GKVmVehEGTGCIUQ_9s24nbJtz_viqJi2z30yp4X8uxtQndqfYUoVPoNxjPx-dSLEFDls7bSmcYNElTwx48JX6Ey7q_EIe8e3NA21b8RxKKIrrGi4YSimffn1x0SwLtCjz1gxtINdlcHXGeuAi3NYXiJuTm2DgyqWHsSR2sCbjdlh3-YwIMPO3WNsOyid8S__GqY6J7VgFgPezQM96nWRgG" },
              ].map(({ quote, author, role, img }) => (
                <div key={author} className="bg-surface-container-lowest p-8 rounded-lg relative">
                  <span className="material-symbols-outlined absolute top-6 right-8 text-primary/10 text-6xl">format_quote</span>
                  <div className="flex gap-1 text-primary-container mb-4">
                    {[1,2,3,4,5].map(i => <span key={i} className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>)}
                  </div>
                  <p className="text-on-surface-variant leading-relaxed mb-6 italic">&ldquo;{quote}&rdquo;</p>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full overflow-hidden">
                      <img className="w-full h-full object-cover" src={img} alt={author} />
                    </div>
                    <div>
                      <p className="font-bold text-on-surface">{author}</p>
                      <p className="text-xs text-on-surface-variant">{role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
