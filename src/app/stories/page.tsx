import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata = { title: "Stories | BONDED" };

const storyCards = [
  {
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuDoIw8cItjvL8QlB6hX53kv165jiF0ItlXEcuPueo7359gyspPIUAauEXEFIaJdlc-JfDXT5j48ytAKHFOQ9EAOkOvOu5Y69OZ8MQ5rWywOKmi6OyuItZsFv2JqjvfI79J8swFva5IYgfO7bVCtzIxIIsenF3l-dMzOKk4NgjL0meiH2WlALeUpKW7ebYwyX1PDbBSlMwKPX80FQEU5Y01wI_AzQqN4zuS-2fHwpe-uWFbZzdawhnz2__jh9stYjkgQZpLf6XmYuwEx",
    name: "Bella & Emma",
    quote: '"She Chose Me"',
    offset: false,
  },
  {
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuAtCSGdfxIjmzObn4eQL8HnehAMUG4AfGrk3MQZZoDa-_sANKC36ueyKYkLRYTI3ZrJQkuc0p7swC8tkh4kMkASDFC9ycLxk-qIACF45QAEoD6IFtYIOCG74Y9VmBNGdIs73Dq8-skQHj23whNt76g8pJfNkkFzOQTisnMSNoYA09eS2oZ1TJmwyT9CfjWUXxbcwl6mOjRuqU18o6BmcWx1vvX2vy0jTsTB5xfnwmrvkfznh7qDRogQzfJHI4FaBoqWQp6DcXHrkbJ7",
    name: "Max & Oliver",
    quote: '"Our walks became our favorite part of the day."',
    offset: true,
  },
  {
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuD-iZTHky_UDAzXdVHlI_KFhJmyvJ83b6usZPchI7CYPPsySosK1rUkotFNeh5hRtaQdGsKD_QglOw7Jytgyuwb-4YA3qCd4yqjjcPSeYFlDwt4lTRBhI3iTq6rFdVvAB12Xu0jnjbygyzr-0mCVWsHKFy9aPhwzoFcVXPDuundoe2SzqKZ5xffhuJdf6JvrDzpeYFn1Yr52a_Ht8bjAapyJRbUbYwnVTMZoCkhfl51E7wLDg4S53mChzaFkPb-DOtwsBvDrAmJqvvM",
    name: "Luna & Sarah",
    quote: '"I never imagined we\'d dance together."',
    offset: false,
  },
];

const journeyCategories = [
  { icon: "route", label: "Starting From Scratch", color: "text-primary", hover: "group-hover:bg-primary-container/20" },
  { icon: "favorite", label: "Building Confidence", color: "text-secondary", hover: "group-hover:bg-secondary-container/50" },
  { icon: "music_note", label: "Learning to Dance", color: "text-tertiary", hover: "group-hover:bg-tertiary-container/30" },
  { icon: "home", label: "Rescue Stories", color: "text-primary", hover: "group-hover:bg-primary-container/20" },
  { icon: "diversity_1", label: "Family Dogs", color: "text-secondary", hover: "group-hover:bg-secondary-container/50" },
  { icon: "stars", label: "First Performance", color: "text-tertiary", hover: "group-hover:bg-tertiary-container/30" },
];

const masonryItems = [
  {
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBgLN6Bo5hJPkXdsFcN_egWyRYcwiVxFVLAARvf4YdTI7x8JBu6Wvh-2-Yx3mZeJkAs9YUjuv19W6d12EiMSi2Rf8RE9dNzbMKWnKpDYtDtB1vM_-QUh2maN71GyCOnFOWBurW44aLKzSNnzoOmE4FETHTXO4Vw7bPGLnWKxIja2jlDLy2jU-Cg7FuqMXgYWuMFp_X5AdqEIe-c8gcP55mw1_SK70GGiXytVKxd-05am8yEzMZZ9nikR9lgJeDUteNIuhyYbi99uGRx4LE",
    caption: '"She finally chose to look at me."',
    alt: "Golden retriever making eye contact",
  },
  {
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuAyNvlptDWzFGYcsyuVcQ-SgQPhHgpWwlLvtUDFt88PGayxjFm2gVKZdvawIxzdBBeAnCs-tsqmJhTozLg6U3P6JGPQbkiidsTWdoIxE0WtFFEWKgsjIADKvk9RcD3L0tf-uHkqoIERB0hWoF5QeFO0PUbo0aveg1n8sEDrXukjFgN3DQ_YfoisXATP7nE894MBOWhzrUxiwqUUwCM3m6m9a5buBMNMtkIg1NBeE2JMK6MwIugy5olGmfzJshIcbWkX9h1t2eGxFbio",
    caption: '"The first time we moved together."',
    alt: "Man and dog dancing joyfully",
  },
  {
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuD62o5QxYDXRlHLD2DM8Z6-72owsbkJJJZsYjrbYbXhuJCjAduEPR-tmswIp--K0lnI4i1W3bSS1Lee3iZVbufpZ7tZWBilyRzjnPNWuKHdxmvVBA3Z73_Jw5pVtTGXiPBREG21q-SRMqSHoCwgypH-vN0HBiZjXs7gz8d7cFG7ALRQOREJqx-JbVjRFBAwUrffijLWOhY7191Y8h8_IfHCl1GvcdIH98U1KXFqpdbhj8k-cK0iwOseXIMTVi-t4y1ok8-zAskdwHUO",
    caption: '"We finally found peace."',
    alt: "Woman and dog resting together",
  },
];

export default function StoriesPage() {
  return (
    <>
      <Navbar />
      <main className="pt-24 pb-20 overflow-hidden">

        {/* Hero */}
        <section className="relative w-full min-h-[80vh] flex items-center justify-center px-6 lg:px-16 overflow-hidden">
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent z-10" />
            <img
              alt="People and dogs bonding"
              className="w-full h-full object-cover opacity-80"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDtOt_OHATZLudIAQ28aG9eNi5TMUzSnfIchXQkzg-1Ayq4O9WRz5yfeCk-Z8clEkz_ut23yFPA1zDyd8UfuEc3JnE4JHeuBZvpveic9ANhezHQPQyF3NGyym0QlU42ap-mvH41ACgxyL570IGkApoouU9feIyaMEm78HhDHK3mYa6LN704O2tQZiWHro8k19o01trpb8kC5N0fmxdiwZLRwnxtW1CWHtyt_RKHF5uZt27v5XSsA0U91xEVlsmh5T7Me8h8-46AujC0"
            />
          </div>
          <div className="relative z-20 max-w-4xl text-center flex flex-col items-center">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-display font-extrabold tracking-tight text-on-surface mb-6 drop-shadow-md">
              Every bond has a story.
            </h1>
            <p className="text-xl md:text-2xl font-body text-on-surface-variant mb-10 max-w-2xl mx-auto leading-relaxed drop-shadow-sm">
              Real people. Real dogs. Real transformations. Discover the moments
              that changed everything.
            </p>
            <button className="bg-gradient-to-r from-primary to-primary-container text-on-primary px-8 py-4 rounded-full font-headline font-bold text-lg hover:scale-105 transition-transform duration-300 shadow-[0_10px_30px_rgba(139,75,0,0.3)] flex items-center gap-3">
              Start Your Story
              <span className="material-symbols-outlined">play_circle</span>
            </button>
          </div>
        </section>

        {/* Featured Stories */}
        <section className="py-20 px-6 lg:px-16 bg-surface">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-display font-bold text-on-surface mb-12 tracking-tight">
              Stories that inspire.
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {storyCards.map(({ img, name, quote, offset }) => (
                <div
                  key={name}
                  className={`group relative rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 cursor-pointer aspect-[3/4] bg-surface-container-lowest${offset ? " md:translate-y-12" : ""}`}
                >
                  <img
                    alt={name}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    src={img}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-90 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute bottom-0 left-0 right-0 p-8 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                    <span className="text-tertiary-container font-label text-sm font-semibold tracking-wider uppercase mb-2 block">
                      {name}
                    </span>
                    <h3 className="text-white text-2xl font-headline font-bold leading-tight mb-4">
                      {quote}
                    </h3>
                    <div className="flex items-center text-white/80 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
                      <span className="material-symbols-outlined mr-2">play_arrow</span>
                      <span className="font-label text-sm">Watch Story</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Browse by Journey */}
        <section className="py-24 px-6 lg:px-16 bg-surface-container-low">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-end mb-12">
              <div>
                <h2 className="text-3xl md:text-4xl font-display font-bold text-on-surface tracking-tight mb-4">
                  Find a story like yours.
                </h2>
                <p className="text-lg font-body text-on-surface-variant max-w-xl">
                  Every partnership starts somewhere different. Explore journeys
                  that mirror your own path.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {journeyCategories.map(({ icon, label, color, hover }) => (
                <button
                  key={label}
                  className="group flex flex-col items-center p-6 bg-surface-container-lowest rounded-xl hover:bg-surface-bright transition-all duration-300 hover:-translate-y-1 shadow-sm"
                >
                  <div
                    className={`w-16 h-16 rounded-full bg-surface-container flex items-center justify-center mb-4 ${hover} transition-colors`}
                  >
                    <span className={`material-symbols-outlined ${color} text-3xl`}>
                      {icon}
                    </span>
                  </div>
                  <span className="font-headline font-semibold text-center text-on-surface text-sm">
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Transformation Gallery */}
        <section className="py-24 px-6 lg:px-16 bg-surface">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-on-surface tracking-tight mb-16 text-center">
              Small moments. Big transformations.
            </h2>
            <div className="masonry-grid">
              {masonryItems.map(({ img, caption, alt }) => (
                <div
                  key={caption}
                  className="masonry-item relative rounded-xl overflow-hidden group bg-surface-container-highest"
                >
                  <img alt={alt} className="w-full h-auto object-cover" src={img} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                    <p className="text-white font-headline font-medium text-lg">
                      {caption}
                    </p>
                  </div>
                </div>
              ))}
              <div className="masonry-item relative rounded-xl overflow-hidden bg-surface-container-highest">
                <div className="p-8 bg-secondary-container flex items-center justify-center text-center min-h-[200px]">
                  <p className="text-on-secondary-container font-headline font-bold text-xl leading-relaxed">
                    &ldquo;It wasn&apos;t about the tricks. It was about learning
                    to speak his language.&rdquo;
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-20 px-6 lg:px-16 bg-surface-container-low">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-sm font-label uppercase tracking-widest text-primary mb-4 font-bold">
              The Pack Speaks
            </h2>
            <h3 className="text-3xl md:text-4xl font-display font-bold text-on-surface mb-12">
              Thousands of stronger relationships.
            </h3>
            <div className="grid md:grid-cols-2 gap-8 text-left">
              {[
                { quote: '"The best investment I\'ve ever made for my dog."', initial: "M", name: "Michael & Bruno" },
                { quote: '"This completely changed how we communicate."', initial: "J", name: "Jessica & Daisy" },
              ].map(({ quote, initial, name }) => (
                <div key={name} className="bg-surface-container-lowest p-8 rounded-2xl shadow-sm border border-surface-container">
                  <div className="flex gap-1 text-tertiary mb-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} className="material-symbols-outlined" style={{ fontVariationSettings: '"FILL" 1' }}>
                        star
                      </span>
                    ))}
                  </div>
                  <p className="text-lg font-body text-on-surface-variant mb-6">{quote}</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center text-on-surface-variant font-bold">
                      {initial}
                    </div>
                    <span className="font-label text-on-surface font-medium">{name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Become a Story */}
        <section className="py-24 px-6 lg:px-16 bg-surface overflow-hidden">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-1/2 relative">
              <div className="absolute -inset-4 bg-secondary-container rounded-full opacity-20 blur-3xl -z-10" />
              <img
                alt="Student practicing with dog"
                className="w-full h-auto rounded-2xl shadow-2xl relative z-10"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBbEu1nIiFH4-F21Z31HtLz9tv2ppTLtj-jdT6aTdvg8EengRrnvN-A8HDnt6R6aYF9UZKK_Vdpr4ESgQsZprHYFiS9GszCife6JAsXSPtuthNjrWIihPOgCTfS1bGkblnHQ4nozb4FaySxcGrobQfTdPNZQTTqGhiih6bOfY-3_BKO1Y1H4WEKHfjBSCSZR5RCHjZYvCeH8UL8AWBy7erLoGCyq_cwkqeUlB-UcKNfyEGfUjPXxrMluGrGfrqVdU5mjFKIR88Obn1A"
              />
              <div className="absolute -bottom-8 -right-8 bg-surface-container-lowest p-6 rounded-xl shadow-xl z-20 max-w-xs hidden md:block">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary-container rounded-full flex items-center justify-center text-on-primary-container">
                    <span className="material-symbols-outlined">emoji_events</span>
                  </div>
                  <div>
                    <p className="font-headline font-bold text-on-surface text-sm">Next Step</p>
                    <p className="font-body text-on-surface-variant text-xs">Foundation Course</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="lg:w-1/2 flex flex-col items-start lg:pl-10">
              <h2 className="text-4xl md:text-5xl font-display font-bold text-on-surface mb-6 tracking-tight">
                Your story starts today.
              </h2>
              <p className="text-xl font-body text-on-surface-variant mb-10 leading-relaxed">
                Every extraordinary relationship begins with a single step. Join
                thousands of others who have transformed their bond through
                understanding, movement, and trust.
              </p>
              <button className="bg-primary text-on-primary px-8 py-4 rounded-full font-headline font-bold hover:bg-primary-dim transition-all duration-300 shadow-md hover:shadow-lg flex items-center gap-3">
                Start with BONDED Foundations
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-32 px-6 lg:px-16 bg-secondary text-on-secondary text-center relative overflow-hidden">
          <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center">
            <h2 className="text-5xl md:text-6xl font-display font-bold mb-6 tracking-tight">
              The next story could be yours.
            </h2>
            <p className="text-xl md:text-2xl font-body mb-12 opacity-90">
              Build the relationship you&apos;ve always dreamed of.
            </p>
            <button className="bg-primary-container text-on-primary-container px-10 py-5 rounded-full font-headline font-bold text-lg hover:scale-105 transition-transform duration-300 shadow-xl flex items-center gap-2">
              Build Your Bond
              <span className="material-symbols-outlined">pets</span>
            </button>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
