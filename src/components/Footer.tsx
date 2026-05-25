import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full rounded-t-[2rem] mt-20 bg-stone-100 font-body text-sm leading-relaxed">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-12 px-12 py-16 max-w-7xl mx-auto">
        <div className="flex flex-col gap-4">
          <div className="text-xl font-bold text-orange-900 font-headline">Keta Tov</div>
          <p className="text-stone-500">A relationship-first academy for dogs and the humans who love them. Founded by Roni Sagi.</p>
          <div className="flex gap-4 mt-2">
            <a className="text-stone-500 hover:text-orange-600 transition-colors" href="#">
              <span className="material-symbols-outlined">star</span>
            </a>
            <a className="text-stone-500 hover:text-orange-600 transition-colors" href="#">
              <span className="material-symbols-outlined">play_circle</span>
            </a>
            <a className="text-stone-500 hover:text-orange-600 transition-colors" href="#">
              <span className="material-symbols-outlined">mail</span>
            </a>
          </div>
        </div>
        <div>
          <h5 className="font-bold text-teal-700 mb-6 uppercase tracking-widest text-xs">Programs</h5>
          <ul className="space-y-3">
            <li><Link href="/courses" className="text-stone-500 hover:text-orange-600 hover:underline decoration-teal-500/30 underline-offset-4 transition-all">Foundations</Link></li>
            <li><Link href="/courses" className="text-stone-500 hover:text-orange-600 hover:underline decoration-teal-500/30 underline-offset-4 transition-all">Advanced Choreography</Link></li>
            <li><Link href="/courses" className="text-stone-500 hover:text-orange-600 hover:underline decoration-teal-500/30 underline-offset-4 transition-all">Mini-Courses</Link></li>
            <li><Link href="/#membership" className="text-stone-500 hover:text-orange-600 hover:underline decoration-teal-500/30 underline-offset-4 transition-all">Growth Tracks</Link></li>
          </ul>
        </div>
        <div>
          <h5 className="font-bold text-teal-700 mb-6 uppercase tracking-widest text-xs">Academy</h5>
          <ul className="space-y-3">
            <li><Link href="/about" className="text-stone-500 hover:text-orange-600 hover:underline decoration-teal-500/30 underline-offset-4 transition-all">About Roni</Link></li>
            <li><Link href="/stories" className="text-stone-500 hover:text-orange-600 hover:underline decoration-teal-500/30 underline-offset-4 transition-all">Student Stories</Link></li>
            <li><Link href="/community" className="text-stone-500 hover:text-orange-600 hover:underline decoration-teal-500/30 underline-offset-4 transition-all">Blog</Link></li>
            <li><a href="#" className="text-stone-500 hover:text-orange-600 hover:underline decoration-teal-500/30 underline-offset-4 transition-all">Instagram</a></li>
          </ul>
        </div>
        <div>
          <h5 className="font-bold text-teal-700 mb-6 uppercase tracking-widest text-xs">Support</h5>
          <ul className="space-y-3">
            <li><a href="#" className="text-stone-500 hover:text-orange-600 hover:underline decoration-teal-500/30 underline-offset-4 transition-all">Contact Us</a></li>
            <li><a href="#" className="text-stone-500 hover:text-orange-600 hover:underline decoration-teal-500/30 underline-offset-4 transition-all">Privacy Policy</a></li>
            <li><a href="#" className="text-stone-500 hover:text-orange-600 hover:underline decoration-teal-500/30 underline-offset-4 transition-all">Terms of Service</a></li>
            <li><a href="#" className="text-stone-500 hover:text-orange-600 hover:underline decoration-teal-500/30 underline-offset-4 transition-all">Newsletter Signup</a></li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-12 py-8 border-t border-stone-200/60 text-center md:text-left">
        <p className="text-stone-400 text-xs">© 2026 Keta Tov. Built on trust, training, and a lot of really good treats.</p>
      </div>
    </footer>
  );
}
