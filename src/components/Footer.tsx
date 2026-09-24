import Link from "next/link";

const LOGO_URL =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuD3L-iqQWhpdZBmaOwetfOjAsZ25lxP0wymy2PYSIDqUFIryq0AE29yJ4Yx-2lUCRQXgDe4HZTYlvZKWSCgWOe0GrDd7CNu-0DK2c3a78cwmDEHKS5xm8QUXqwas29sup62v7JsnsbH0ArUbA8sJVh_KMAdCtObqRqa_QYWwfySpNLg0BINuzYgd6eyJmBZgF5ihqGlGCFpA6QpxRRwGqvuhEOSRIpbDbl-igWna5OxI2E8rWgAtThxd9aEiGuTQWw-aRiJJu2lbihm";

export const CONTACT_EMAIL = "info.bonded@gmail.com";

const exploreLinks = [
  { href: "/courses", label: "Bonded Journey" },
  { href: "/quiz", label: "Find Your Journey" },
  { href: "/stories", label: "Stories" },
  { href: "/about", label: "About Roni" },
];

const supportLinks = [
  { href: `mailto:${CONTACT_EMAIL}`, label: "Contact Us" },
  { href: "/#faq", label: "FAQ" },
  { href: "/login", label: "Member Login" },
];

const linkClass =
  "text-sm text-on-surface-variant hover:text-primary transition-colors";

export default function Footer() {
  return (
    <footer className="w-full mt-20 bg-surface-container-low border-t border-outline-variant/20">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="md:col-span-2">
            <img alt="BONDED Logo" className="h-12 w-auto mb-6" src={LOGO_URL} />
            <p className="text-sm text-on-surface-variant leading-relaxed max-w-sm">
              Learn your dog&apos;s secret language. A step-by-step journey from
              trust and communication to your first dance together, created by
              Roni Sagi.
            </p>
          </div>

          <div>
            <h4 className="font-headline font-bold text-on-surface mb-6 uppercase text-xs tracking-widest">
              Explore
            </h4>
            <ul className="space-y-4">
              {exploreLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className={linkClass}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-headline font-bold text-on-surface mb-6 uppercase text-xs tracking-widest">
              Support
            </h4>
            <ul className="space-y-4">
              {supportLinks.map(({ href, label }) => (
                <li key={href}>
                  <a href={href} className={linkClass}>
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-outline-variant/20 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-on-surface-variant">
            © {new Date().getFullYear()} BONDED. All rights reserved.
          </p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-xs text-on-surface-variant hover:text-primary transition-colors"
          >
            {CONTACT_EMAIL}
          </a>
        </div>
      </div>
    </footer>
  );
}
