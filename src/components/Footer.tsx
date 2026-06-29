import Link from "next/link";

const LOGO_URL =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuD3L-iqQWhpdZBmaOwetfOjAsZ25lxP0wymy2PYSIDqUFIryq0AE29yJ4Yx-2lUCRQXgDe4HZTYlvZKWSCgWOe0GrDd7CNu-0DK2c3a78cwmDEHKS5xm8QUXqwas29sup62v7JsnsbH0ArUbA8sJVh_KMAdCtObqRqa_QYWwfySpNLg0BINuzYgd6eyJmBZgF5ihqGlGCFpA6QpxRRwGqvuhEOSRIpbDbl-igWna5OxI2E8rWgAtThxd9aEiGuTQWw-aRiJJu2lbihm";

export default function Footer() {
  return (
    <footer className="w-full mt-20 bg-surface-container-low border-t border-outline-variant/20">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-1 md:col-span-1">
            <img
              alt="BONDED Logo"
              className="h-12 w-auto mb-6"
              src={LOGO_URL}
            />
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Empowering dog and handler through the art of flow, rhythm, and
              deep connection.
            </p>
          </div>

          <div className="col-span-1">
            <h4 className="font-headline font-bold text-on-surface mb-6 uppercase text-xs tracking-widest">
              Platform
            </h4>
            <ul className="space-y-4">
              <li>
                <Link
                  href="/courses"
                  className="text-sm text-on-surface-variant hover:text-primary transition-colors"
                >
                  The Method
                </Link>
              </li>
              <li>
                <Link
                  href="/stories"
                  className="text-sm text-on-surface-variant hover:text-primary transition-colors"
                >
                  Stories
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-sm text-on-surface-variant hover:text-primary transition-colors"
                >
                  About Roni
                </Link>
              </li>
            </ul>
          </div>

          <div className="col-span-1">
            <h4 className="font-headline font-bold text-on-surface mb-6 uppercase text-xs tracking-widest">
              Support
            </h4>
            <ul className="space-y-4">
              <li>
                <span className="text-sm text-on-surface-variant">
                  Contact Us
                </span>
              </li>
              <li>
                <Link
                  href="/login"
                  className="text-sm text-on-surface-variant hover:text-primary transition-colors"
                >
                  Member Login
                </Link>
              </li>
              <li>
                <span className="text-sm text-on-surface-variant">FAQ</span>
              </li>
            </ul>
          </div>

          <div className="col-span-1">
            <h4 className="font-headline font-bold text-on-surface mb-6 uppercase text-xs tracking-widest">
              Connect
            </h4>
            <div className="flex space-x-4">
              <span className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-xl">camera</span>
              </span>
              <span className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
                <span className="material-symbols-outlined text-xl">
                  video_library
                </span>
              </span>
            </div>
            <p className="mt-4 text-[10px] text-on-surface-variant font-headline font-bold uppercase tracking-widest">
              Instagram • YouTube
            </p>
          </div>
        </div>

        <div className="pt-8 border-t border-outline-variant/30 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-xs text-on-surface-variant font-headline font-medium uppercase tracking-widest">
            © 2026 BONDED.
          </p>
          <div className="flex space-x-8">
            <span className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">
              Privacy Policy
            </span>
            <span className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">
              Terms of Service
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
