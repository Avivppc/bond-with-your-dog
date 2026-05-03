import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";

export default function CommunityPage() {
  return (
    <>
      <Navbar />
      <main className="pt-24 space-y-32">

        {/* Hero */}
        <section className="relative px-8 overflow-hidden">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-16 py-12">
            <div className="w-full md:w-1/2 space-y-6 relative z-10">
              <span className="inline-block py-1 px-4 bg-secondary-container text-on-secondary-container rounded-full text-sm font-bold tracking-wider uppercase">Academy Hub</span>
              <h1 className="text-5xl md:text-7xl font-headline font-extrabold text-on-surface tracking-tight leading-[1.1]">
                The bonding<br /><span className="text-primary italic">Community.</span>
              </h1>
              <p className="text-lg text-on-surface-variant max-w-lg leading-relaxed">
                Step onto the stage with a global network of dog dancers. Share your rhythm, refine your flow, and grow with world-class resources.
              </p>
              <div className="flex flex-wrap gap-4 pt-4">
                <button className="px-8 py-4 bg-primary text-on-primary rounded-full font-bold font-headline flex items-center gap-2 hover:bg-primary-dim transition-colors group">
                  Explore Resources <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </button>
                <button className="px-8 py-4 bg-surface-container-highest text-on-surface rounded-full font-bold font-headline hover:bg-surface-container-high transition-colors">
                  Watch More
                </button>
              </div>
            </div>
            <div className="w-full md:w-1/2 relative">
              <div className="absolute -top-12 -left-12 w-64 h-64 bg-primary-container/20 rounded-full blur-3xl"></div>
              <div className="relative rounded-xl overflow-hidden rotate-2" style={{ boxShadow: "0 32px 64px -12px rgba(139,75,0,0.06)" }}>
                <img className="w-full h-[500px] object-cover rounded-xl" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAIJHPmfbwDOxsn7Re6-S54afK-IjF6HHlN0IMkTK627h3Fkbh5x6dMDzu9b4MUXNDwYa8Pt6jDHBJmuj5PzDCtl-8CQq0Hr5xA6glMloRtl_DXPS4G5WXehzB6OtGrRzRCJ-KbDtCEaWgjAWJNtzC7MOEw0bhCXmXootH62RtxA9V8OCG8XMLjDOTGTCRB7Z0qZZUx6Hn50gkrSmS1Qk14QmDfat4B8t3kWCZGtknIihZSfKzvdrqaXPFBCvhORXz3SvIQ876waD9F" alt="Happy golden retriever performing a synchronized dance move with its handler" />
                <div className="absolute bottom-6 right-6 bg-white/90 backdrop-blur p-4 rounded-lg shadow-xl flex items-center gap-3">
                  <div className="flex -space-x-2">
                    <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-200"></div>
                    <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-300"></div>
                    <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-400"></div>
                  </div>
                  <span className="text-xs font-bold text-on-surface">+1.2k Students Dancing</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Inner Circle */}
        <section className="bg-surface-container-low py-32">
          <div className="max-w-7xl mx-auto px-8">
            <div className="text-center mb-20 space-y-4">
              <h2 className="text-4xl md:text-5xl font-headline font-extrabold text-on-surface tracking-tight">The Inner Circle</h2>
              <p className="text-on-surface-variant max-w-2xl mx-auto">Beyond the tutorials, find the real soul of dog dancing in our private collaborative space.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-surface-container-lowest p-10 rounded-lg hover:scale-[1.02] transition-transform duration-300 flex flex-col items-center text-center space-y-6" style={{ boxShadow: "0 32px 64px -12px rgba(139,75,0,0.06)" }}>
                <div className="w-16 h-16 bg-primary-container/20 text-primary rounded-2xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-4xl">video_library</span>
                </div>
                <h3 className="text-2xl font-headline font-bold text-on-surface">Progress Videos</h3>
                <p className="text-on-surface-variant leading-relaxed">Submit your training clips for personalized feedback from Roni. Watch your transformation week by week.</p>
              </div>
              <div className="bg-surface-container-lowest p-10 rounded-lg hover:scale-[1.02] transition-transform duration-300 flex flex-col items-center text-center space-y-6 relative md:-translate-y-8" style={{ boxShadow: "0 32px 64px -12px rgba(139,75,0,0.06)" }}>
                <div className="w-16 h-16 bg-secondary-container/30 text-secondary rounded-2xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-4xl">forum</span>
                </div>
                <h3 className="text-2xl font-headline font-bold text-on-surface">Expert Q&amp;A</h3>
                <p className="text-on-surface-variant leading-relaxed">Direct access to professional insights. Get answers on choreography, behavior, and technical movement.</p>
                <div className="absolute -top-4 -right-4 bg-primary text-on-primary text-[10px] font-black uppercase px-3 py-1 rounded-full tracking-widest">Live Monthly</div>
              </div>
              <div className="bg-surface-container-lowest p-10 rounded-lg hover:scale-[1.02] transition-transform duration-300 flex flex-col items-center text-center space-y-6" style={{ boxShadow: "0 32px 64px -12px rgba(139,75,0,0.06)" }}>
                <div className="w-16 h-16 bg-tertiary-container/30 text-tertiary rounded-2xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-4xl">trophy</span>
                </div>
                <h3 className="text-2xl font-headline font-bold text-on-surface">Monthly Challenges</h3>
                <p className="text-on-surface-variant leading-relaxed">Push your limits with themed prompts. Win academy credits and spotlight features in our newsletter.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Blog / Resources */}
        <section className="max-w-7xl mx-auto px-8">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
            <div className="space-y-4">
              <h2 className="text-4xl md:text-5xl font-headline font-extrabold text-on-surface tracking-tight leading-tight">
                Resources &amp; <br /><span className="text-secondary">Insights</span>
              </h2>
            </div>
            <div className="flex gap-4">
              <button className="p-3 rounded-full border border-outline-variant hover:bg-surface-container transition-colors">
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              <button className="p-3 rounded-full bg-secondary text-on-secondary hover:bg-secondary-dim transition-colors">
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <article className="group bg-surface-container-lowest rounded-lg overflow-hidden" style={{ boxShadow: "0 32px 64px -12px rgba(139,75,0,0.06)" }}>
              <div className="relative h-64 overflow-hidden">
                <img className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBF5FefwcEfjeBsnUiameOMKnadqNvIuUzo5NTApjfhXLa9rlirc9KhP-yyJd2YnJKu76EgJ0dJ6yyuU48HU3k_L1hVer4OC9zDfI3oUUHlOw5V32IJD_Mjl_Cu5B4InBqhx6rW2PWgsLlUAOQp-nyym-Bk3qVXtcSA_4sgXu6-pSe4Fixv1grKG6HC6ihdVVPJQBvqdDN-92wY4hFYN8xZiob7QDCgg22prXGOpv0GDN4Z6kFogAAbYo-o9lGTaPKkV-YEsyvVtvp4" alt="Cinematic shot of a dog jumping through a hoop" />
                <div className="absolute top-4 left-4 bg-white/90 px-3 py-1 rounded-full text-xs font-bold text-secondary tracking-wide">Technique</div>
              </div>
              <div className="p-8 space-y-4">
                <div className="flex justify-between items-start">
                  <h3 className="text-2xl font-headline font-bold text-on-surface group-hover:text-primary transition-colors">5 Tips for Better Flow</h3>
                  <button className="text-outline hover:text-secondary transition-colors">
                    <span className="material-symbols-outlined">share</span>
                  </button>
                </div>
                <p className="text-on-surface-variant text-sm line-clamp-3 leading-relaxed">Master the invisible transition between cues to make your routine look like a seamless dance performance.</p>
                <Link href="/blog/5-tips-for-better-flow" className="inline-flex items-center gap-2 text-primary font-bold font-headline text-sm group/link">
                  Read Article <span className="material-symbols-outlined text-sm group-hover/link:translate-x-1 transition-transform">arrow_forward</span>
                </Link>
              </div>
            </article>
            <article className="group bg-surface-container-lowest rounded-lg overflow-hidden" style={{ boxShadow: "0 32px 64px -12px rgba(139,75,0,0.06)" }}>
              <div className="relative h-64 overflow-hidden">
                <img className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDHpnUfUEUEYPUCxOiWhlaWxWuRlnkqLNre4ZlLbQJwIj3FTei5ET6wvce4dkvdhZcJXPArLQBk_V90CuyipixJEOyF8XIuN1_qok2_2wZRLfbRQhU59QxpiZeGAIdBrSuz8yKJoD-13lEecfe4hw9d5W99GFpIIweV_uPZh7lZeVBkgD2w15eHIOWOOxWZ5wGOv63Hc1QFeKrKg8mjqj8Yr8U14rULQWa7ZhHOrclCoRJe3_LZnvLCVUXMNmyr6KAWaWtLmyalNIzd" alt="Professional soundboard and headphones in a dimly lit studio" />
                <div className="absolute top-4 left-4 bg-white/90 px-3 py-1 rounded-full text-xs font-bold text-secondary tracking-wide">Music</div>
              </div>
              <div className="p-8 space-y-4">
                <div className="flex justify-between items-start">
                  <h3 className="text-2xl font-headline font-bold text-on-surface group-hover:text-primary transition-colors">Choosing the Right Music</h3>
                  <button className="text-outline hover:text-secondary transition-colors">
                    <span className="material-symbols-outlined">share</span>
                  </button>
                </div>
                <p className="text-on-surface-variant text-sm line-clamp-3 leading-relaxed">Learn how to match your dog&apos;s natural gait to BPM and choose tracks that highlight their unique personality.</p>
                <a href="#" className="inline-flex items-center gap-2 text-primary font-bold font-headline text-sm group/link">
                  Read Article <span className="material-symbols-outlined text-sm group-hover/link:translate-x-1 transition-transform">arrow_forward</span>
                </a>
              </div>
            </article>
            <article className="group bg-surface-container-lowest rounded-lg overflow-hidden" style={{ boxShadow: "0 32px 64px -12px rgba(139,75,0,0.06)" }}>
              <div className="relative h-64 overflow-hidden">
                <img className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCvtvQhNgxPHSSFjQG6fWjgDbyOitp0n1AXS8XdDu9HfdysyYMoYOfPVxC89Fz6CsRmflkAOitt-F1J08xhmubhWhNDBTbnI6zz66JrfVUEtg1m5EbNsmJNURzBOzeq9rsXD1yK7H5_o5gUsXqDZvb6OLfkC8Vn86R55DrUyPYe4TZDIUuJJXmb35_NXpYMtiOGMZD0WoWT3e85OCRG5JY8IIN-L34tDkskYsP8FLOKSjk_BOF_6rQ6MJRBBDqt7P0YDtWuoO7bh_Td" alt="Candid portrait of a smiling woman hugging her border collie after a performance" />
                <div className="absolute top-4 left-4 bg-white/90 px-3 py-1 rounded-full text-xs font-bold text-secondary tracking-wide">Stories</div>
              </div>
              <div className="p-8 space-y-4">
                <div className="flex justify-between items-start">
                  <h3 className="text-2xl font-headline font-bold text-on-surface group-hover:text-primary transition-colors">Student Spotlights</h3>
                  <button className="text-outline hover:text-secondary transition-colors">
                    <span className="material-symbols-outlined">share</span>
                  </button>
                </div>
                <p className="text-on-surface-variant text-sm line-clamp-3 leading-relaxed">Meet Sarah and Luna, our team of the month, who mastered their first &apos;Heelwork to Music&apos; routine in 30 days.</p>
                <a href="#" className="inline-flex items-center gap-2 text-primary font-bold font-headline text-sm group/link">
                  Read Article <span className="material-symbols-outlined text-sm group-hover/link:translate-x-1 transition-transform">arrow_forward</span>
                </a>
              </div>
            </article>
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-7xl mx-auto px-8 mb-[-4rem] relative z-20">
          <div className="bg-secondary p-12 md:p-20 rounded-lg relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-12">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/20 rounded-full translate-y-1/2 -translate-x-1/4"></div>
            <div className="space-y-6 max-w-xl text-center md:text-left">
              <h2 className="text-4xl md:text-6xl font-headline font-extrabold text-on-secondary tracking-tight">Ready to Dance?</h2>
              <p className="text-on-secondary/80 text-lg">Join 1,000+ handlers worldwide. Start your journey with the Private Community today and get your first week for free.</p>
            </div>
            <div className="flex flex-col gap-4 min-w-[280px]">
              <button className="w-full py-5 bg-primary-container text-on-primary-container rounded-full font-black text-xl font-headline hover:scale-105 transition-transform flex items-center justify-center gap-3">
                Join the Community <span className="material-symbols-outlined">pets</span>
              </button>
              <p className="text-on-secondary/60 text-center text-sm font-medium">Cancel anytime. Professional support guaranteed.</p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
