import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";

export default function BlogPost5TipsPage() {
  return (
    <>
      <Navbar />
      <main className="pt-20">

        {/* Breadcrumb */}
        <nav className="max-w-7xl mx-auto px-6 py-8">
          <ol className="flex items-center space-x-2 text-xs uppercase tracking-widest text-on-surface-variant font-medium">
            <li><Link href="/community" className="hover:text-primary transition-colors">Blog</Link></li>
            <li className="flex items-center space-x-2">
              <span className="material-symbols-outlined text-sm">chevron_right</span>
              <a href="#" className="hover:text-primary transition-colors">Technique</a>
            </li>
            <li className="flex items-center space-x-2">
              <span className="material-symbols-outlined text-sm">chevron_right</span>
              <span className="text-primary font-bold">5 Tips for Better Flow</span>
            </li>
          </ol>
        </nav>

        {/* Hero Image */}
        <header className="max-w-7xl mx-auto px-6 mb-16">
          <div className="relative rounded-xl overflow-hidden aspect-[21/9] group">
            <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCQruzojD9DS5dRaVpicaNDyX2RzyTNJ9VQ9i2eo_rFUKnHDtMyDbZVIRs7mnpluNGKXYNUCYcBhrjGo1JPlevoejV0CdEwesdyCB8Avsy6UjSrd3vlx1fo-yNwHYe5yEvrwEAIyqCWIqFCeUurAcvNRR8m_DKpgey6nefttIsvrdiH7N0xBZ6OVRF98aXUqQTjZ1bD9RagGPgqFigig7PkI2qBHcVPFt-ZtD8P2bnMZAMprsjbUIdfZL6vuhgbshO_eFoFfwBZEJU7" alt="A professional female handler and her border collie performing a synchronized dance move" />
            <div className="absolute inset-0 bg-gradient-to-t from-on-surface/80 via-transparent to-transparent"></div>
            <div className="absolute bottom-0 left-0 p-8 md:p-12 w-full">
              <div className="flex flex-wrap items-center gap-4 mb-4 text-primary-container font-semibold tracking-wide uppercase text-xs">
                <span className="bg-primary/20 backdrop-blur-md px-3 py-1 rounded-full">Technique</span>
                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">schedule</span> 5 mins read</span>
                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">calendar_today</span> Oct 24, 2024</span>
              </div>
              <h1 className="text-white text-4xl md:text-6xl font-extrabold tracking-tighter mb-4 max-w-4xl leading-tight">
                5 Tips for Better Flow: Mastering the Kinetic Duet
              </h1>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary-fixed border-2 border-white overflow-hidden">
                  <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuBA3V31OjYFoOPLRsF1YdGy0hFSWdUyxYmuGk0mhFif9z9VGL09r2Z8IypIHyg44j-_hgHA8sXPaD60PdvAxzGWwnmROnhOTTe9-PQmKyWLVTdkfRwmvGUZtQGdDumqFVLVx5M7U6G3XKhwVqZ6DupXc-0OX-nrRJO_WQyoOKMWmffEEC87YdoxCA0jDp-a-guWfgN4reebXoifC07751n-_i-dJMB9JWJCuUp9m59DH0ia2jHmQdr17PPJUdYZl-gTFqxkE2BreoED" alt="Roni Sagi instructor headshot" />
                </div>
                <span className="text-white font-medium">By Roni Sagi</span>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-16">

          {/* Article Body */}
          <article className="lg:col-span-8 space-y-12">
            <section className="text-on-surface-variant leading-relaxed">
              <p className="text-xl font-medium text-on-surface mb-8 italic border-l-4 border-primary pl-6">
                In the world of dog dancing, &ldquo;Flow&rdquo; isn&apos;t just about moving; it&apos;s about the invisible thread that binds handler and dog in a single, seamless expression of joy and rhythm.
              </p>
              <p>
                When we watch a world-class performance, we don&apos;t see commands and responses. We see a conversation. Achieving this level of synchronicity requires more than just knowing the tricks; it requires a deep understanding of momentum, cues, and the emotional energy that flows between six legs.
              </p>
            </section>

            <section className="space-y-6">
              <div className="flex items-start gap-4">
                <span className="text-5xl font-black text-primary/20">01</span>
                <div>
                  <h2 className="text-3xl font-bold text-on-surface tracking-tight mb-4">Eye Contact &amp; Connection</h2>
                  <p className="text-on-surface-variant mb-6 leading-relaxed">
                    True flow begins long before the music starts. It starts in the eyes. Constant eye contact ensures that your dog is waiting for the next subtle shift in your body weight rather than just a verbal command.
                  </p>
                  <div className="bg-surface-container-low p-6 rounded-lg border-l-4 border-secondary">
                    <h4 className="flex items-center gap-2 font-bold text-secondary mb-2 uppercase text-xs tracking-widest">
                      <span className="material-symbols-outlined">lightbulb</span> Pro Tip
                    </h4>
                    <p className="text-on-secondary-container text-sm">Practice &ldquo;soft eyes&rdquo; during training. Staring too hard can create pressure; look at your dog with the warmth you&apos;d give a dance partner to keep the mood light and playful.</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <div className="flex items-start gap-4">
                <span className="text-5xl font-black text-primary/20">02</span>
                <div>
                  <h2 className="text-3xl font-bold text-on-surface tracking-tight mb-4">Consistent Footwork Cues</h2>
                  <p className="text-on-surface-variant mb-6">
                    Your feet are the primary steering wheel. In dog dancing, your dog often tracks your movement based on your lead foot. If your footwork is sloppy, your dog&apos;s transitions will be hesitant.
                  </p>
                  <img className="w-full rounded-xl mb-6 aspect-video object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBlAziDUfbjX8cyetPZ0nR2hsIwvx_vR_CJkNlyp7JbbBPTZg8JTs_I8TdQ2gNy3O3aMAw2vPUI9cPFfu54Q7apzR_0i4NmG5783oVlK5Ao0iueTUGb2NV01dunTN2yhJkvHDERcjYh4FetArfHUKCytIb6ViZnQ4w3Q1D0_kufCZAy5CJ9q7vbaRAVFGtV2BjSwpyDitnNjfh_zI6xVm58cukpInu5M_7pokNneKknNztV1UYoEzh1lHrbuBTC5eSc9xnZQmKojcOc" alt="Close-up of handler feet and dog paws in sync on a polished floor" />
                </div>
              </div>
            </section>

            {/* Video */}
            <section className="relative bg-on-surface rounded-xl overflow-hidden aspect-video flex items-center justify-center group cursor-pointer">
              <img className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:scale-105 transition-transform duration-1000" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBL6clGvu34mNL_9wUZMnqf_4aT_QpcLsk6w_jkoHaFLsL8XqdxAuruDYvN9By_cwLv3QG8oPBl9JfRv5jYhuKr9ZFVctRAV9ZOr-qC6F7dkLtmv8R4OMs7zjkqk1_DBmHR-Ki0z1LYOtSBJoqhwNAM_GgO3kOxfK9wEeLh-MNycc1A5NsmiybAwCys6OLBryjfC_QNgSoiMu7U0lmoTUCOx2BdXP8cgx163G4iIyO6CG73iNvJBg9S4LBPZO-iJLpa-eiDkkMjSBtA" alt="Dance studio training session" />
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-20 h-20 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container shadow-2xl group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
                </div>
                <span className="mt-4 text-white font-bold uppercase tracking-widest text-sm">Watch: Transition Drill #1</span>
              </div>
            </section>

            {/* Tips 3-5 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-surface-container-lowest p-8 rounded-lg shadow-sm border border-outline-variant/10">
                <span className="text-2xl font-black text-primary/30 mb-4 block">03</span>
                <h3 className="text-xl font-bold mb-4">Managing Momentum</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  Don&apos;t fight physics. Use the dog&apos;s natural speed to fuel the next turn. If a dog is coming out of a fast weave, use that energy for a broad circle rather than an immediate halt.
                </p>
              </div>
              <div className="bg-surface-container-lowest p-8 rounded-lg shadow-sm border border-outline-variant/10">
                <span className="text-2xl font-black text-primary/30 mb-4 block">04</span>
                <h3 className="text-xl font-bold mb-4">Emotional Synchronicity</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  Your dog feels your nerves. Flow happens when both parties are in a state of &apos;relaxed alertness.&apos; Keep your breathing steady to keep your dog calm.
                </p>
              </div>
              <div className="md:col-span-2 bg-secondary-container/30 p-8 rounded-lg border-2 border-dashed border-secondary/20">
                <span className="text-2xl font-black text-secondary/30 mb-4 block">05</span>
                <h3 className="text-2xl font-bold mb-4 text-on-secondary-container">Transition Drills</h3>
                <p className="text-on-secondary-container mb-6">
                  The &ldquo;flow&rdquo; lives in the gaps between the tricks. Practice the 5-second window before and after a movement. That is where the choreography is won or lost.
                </p>
                <ul className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <li className="flex items-center gap-2 text-sm font-semibold text-secondary"><span className="material-symbols-outlined text-xs">check_circle</span> The 8-Figure</li>
                  <li className="flex items-center gap-2 text-sm font-semibold text-secondary"><span className="material-symbols-outlined text-xs">check_circle</span> Reverse Pivot</li>
                  <li className="flex items-center gap-2 text-sm font-semibold text-secondary"><span className="material-symbols-outlined text-xs">check_circle</span> Side-Step Loop</li>
                </ul>
              </div>
            </div>

            {/* CTA */}
            <section className="bg-primary p-12 rounded-xl text-center text-on-primary shadow-xl overflow-hidden relative">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <span className="material-symbols-outlined text-9xl">pets</span>
              </div>
              <h2 className="text-3xl font-black mb-4 relative z-10">Ready to master the duet?</h2>
              <p className="text-on-primary/80 mb-8 max-w-lg mx-auto relative z-10">
                Join our &ldquo;Foundations of Flow&rdquo; online course and get step-by-step video coaching from Roni Sagi.
              </p>
              <Link href="/courses/kinetic-basics" className="inline-block bg-white text-primary px-10 py-4 rounded-full font-bold text-lg hover:bg-on-primary-container hover:text-white transition-all transform hover:-translate-y-1">
                Enroll in Foundations
              </Link>
            </section>

            {/* Comments */}
            <section className="space-y-8 pt-12">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold">Student Discussion (12)</h3>
                <button className="text-primary font-bold flex items-center gap-2 hover:underline">
                  <span className="material-symbols-outlined">add_comment</span> Post a Comment
                </button>
              </div>
              <div className="space-y-6">
                <div className="flex gap-4 p-6 bg-surface-container-lowest rounded-lg">
                  <div className="w-12 h-12 rounded-full bg-surface-container-highest flex-shrink-0"></div>
                  <div>
                    <h4 className="font-bold text-on-surface">Or Aviv <span className="text-xs font-normal text-on-surface-variant ml-2">2 days ago</span></h4>
                    <p className="text-on-surface-variant mt-2">The tip about &ldquo;soft eyes&rdquo; changed everything for my Border Collie. He&apos;s much less anxious during our heelwork now. Thank you Roni!</p>
                  </div>
                </div>
              </div>
            </section>
          </article>

          {/* Sidebar */}
          <aside className="lg:col-span-4 space-y-12">
            <div className="bg-surface-container-high p-8 rounded-lg">
              <h4 className="font-bold text-primary mb-6 uppercase text-xs tracking-widest">About the Author</h4>
              <div className="text-center">
                <img className="w-32 h-32 rounded-full mx-auto mb-4 border-4 border-white shadow-md object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAUhPgkfgiB7IQeD7sW-lQLjYTygMy1S_xYART2lYOk4_aV_3AJjvYr9Q3k7Hnug1CevP9N28F0dqhT-lf1MGIvJqxVD6sik1KFt9qOpGikfIjkuyHPIvam0vuwGgXW7G_r3tTknK5RcMb1fCBpUqKDyVAKsI7K4RNrHJML3lq1CAidkT4lnf_hR1oAjLAznXB9QIyseV0XD4Zx9GRfWI5cMfIUDfiMdBxJUtVcXeUIvQ2AfZvSWwAEhZqtIrFuwBygqFMrYuy9Lz1Q" alt="Roni Sagi professional portrait" />
                <h5 className="text-xl font-bold text-on-surface mb-2">Roni Sagi</h5>
                <p className="text-sm text-on-surface-variant leading-relaxed mb-6">
                  World-renowned dog dancing competitor and founder of Keta Tov. Roni has spent over a decade perfecting the art of the kinetic duet.
                </p>
                <div className="flex justify-center gap-4">
                  <a href="#" className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-colors shadow-sm">
                    <span className="material-symbols-outlined text-xl">share</span>
                  </a>
                  <a href="#" className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-colors shadow-sm">
                    <span className="material-symbols-outlined text-xl">person</span>
                  </a>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="font-bold text-on-surface-variant uppercase text-xs tracking-widest">Share this lesson</h4>
              <div className="grid grid-cols-2 gap-4">
                <button className="bg-white border border-outline-variant/30 py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-surface-bright transition-colors">
                  <span className="material-symbols-outlined text-xl">social_leaderboard</span> <span className="text-sm font-bold">Facebook</span>
                </button>
                <button className="bg-white border border-outline-variant/30 py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-surface-bright transition-colors">
                  <span className="material-symbols-outlined text-xl">post_add</span> <span className="text-sm font-bold">X / Twitter</span>
                </button>
              </div>
            </div>
            <div className="space-y-6">
              <h4 className="font-bold text-on-surface-variant uppercase text-xs tracking-widest border-b border-outline-variant/20 pb-4">More from Technique</h4>
              <div className="space-y-6">
                <a href="#" className="group flex gap-4">
                  <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                    <img className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCkmmvu0gcdh1cSwnoEkHQTAYf6cDmeBxOkNTaNTTsYKmDXqvicZxzXtyLhTbtCvxw0KgZzvT84RqShTuQxR9hWk9bnYxaarwl1Ug6VawKZTM0gfCvnfJ38kZnBx1TYQWs_4lhI05RhFobRwNguAz8k7V_UGYq_IJwdj6rwBQ9VAyGSXMSdVfDszJxmjRPG9QbwFYkqJVNSS39Xhbjp_cOGA2RRQEkPN1rsWp9e_aY2XNOwEWq-M2LabJUWrDHcywQD3yOoOGuKXH0n" alt="A focused close-up of a dog's face looking up at its owner" />
                  </div>
                  <div>
                    <h6 className="font-bold group-hover:text-primary transition-colors leading-tight">Mastering the Spin: A Speed Guide</h6>
                    <span className="text-xs text-on-surface-variant">3 min read</span>
                  </div>
                </a>
                <a href="#" className="group flex gap-4">
                  <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                    <img className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD4KR2NA9R1AqctZWduQlxtLPmQRmP8LBW7vb1b-icAUr6bZpHPjhPAstMIwsrMQLxp3Rf7D_j3hBjfsAAGTalWBktObjzclQOmtplMWE1CIWP7NTdpgeHKXKSsbrXY9UdLjITRwJ907n8TlICmAZCMQyrR2t3qxTGiOc6t2XQqQlCmPNI1SZoxsoIWmu1QVJ2gxgM6I2P5zMyNRiCxYze1aprYKkRXQP7WdRsjYbI83cffD29J4K7c-kXP1UQGM7glM-yGUoRuMK0J" alt="A dog performing a high jump through a hoop" />
                  </div>
                  <div>
                    <h6 className="font-bold group-hover:text-primary transition-colors leading-tight">Selecting Music for Your Performance</h6>
                    <span className="text-xs text-on-surface-variant">7 min read</span>
                  </div>
                </a>
              </div>
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}
