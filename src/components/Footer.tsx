import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full mt-20 bg-surface-container-low border-t border-outline-variant/20">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-1">
            <div className="text-2xl font-black tracking-tighter text-orange-900 mb-6">Keta Tov</div>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Empowering dog and handler duets through the art of flow, rhythm, and deep connection.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-on-surface mb-6 uppercase text-xs tracking-widest">Learning</h4>
            <ul className="space-y-4">
              <li><Link href="/courses" className="text-sm text-on-surface-variant hover:text-primary transition-colors">All Courses</Link></li>
              <li><Link href="/#membership" className="text-sm text-on-surface-variant hover:text-primary transition-colors">Membership Plans</Link></li>
              <li><a href="#" className="text-sm text-on-surface-variant hover:text-primary transition-colors">Free Resources</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-on-surface mb-6 uppercase text-xs tracking-widest">Support</h4>
            <ul className="space-y-4">
              <li><a href="#" className="text-sm text-on-surface-variant hover:text-primary transition-colors">Contact Us</a></li>
              <li><a href="#" className="text-sm text-on-surface-variant hover:text-primary transition-colors">Instructor Login</a></li>
              <li><a href="#" className="text-sm text-on-surface-variant hover:text-primary transition-colors">FAQ</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-on-surface mb-6 uppercase text-xs tracking-widest">Follow the Beat</h4>
            <div className="flex space-x-4">
              <a href="#" className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary hover:text-on-primary transition-all">
                <span className="material-symbols-outlined text-xl">camera</span>
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary hover:bg-secondary hover:text-on-secondary transition-all">
                <span className="material-symbols-outlined text-xl">video_library</span>
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary hover:text-on-primary transition-all">
                <span className="material-symbols-outlined text-xl">play_circle</span>
              </a>
            </div>
            <p className="mt-4 text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">Instagram • TikTok • YouTube</p>
          </div>
        </div>
        <div className="pt-8 border-t border-outline-variant/30 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-xs text-on-surface-variant font-medium uppercase tracking-widest">
            © 2024 Keta Tov Academy. Master the Kinetic Duet.
          </p>
          <div className="flex space-x-8">
            <a href="#" className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors">Privacy Policy</a>
            <a href="#" className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
