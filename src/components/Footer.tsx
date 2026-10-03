import Link from "next/link";
import { loadSiteSettings } from "@/lib/site-settings-server";
import { SOCIAL_INFO, SOCIAL_KEYS, type SiteSettings } from "@/lib/site-settings";

const LOGO_URL = "/images/logo.png";

const exploreLinks = [
  { href: "/courses", label: "Bonded Journey" },
  { href: "/quiz", label: "Find Your Journey" },
  { href: "/stories", label: "Stories" },
  { href: "/about", label: "About Roni" },
];

const supportLinks = (contactEmail: string) => [
  { href: `mailto:${contactEmail}`, label: "Contact Us" },
  { href: "/#faq", label: "FAQ" },
  { href: "/login", label: "Member Login" },
  { href: "/terms", label: "Terms" },
  { href: "/refund-policy", label: "Refund Policy" },
  { href: "/privacy", label: "Privacy" },
];

const linkClass =
  "text-sm text-on-surface-variant hover:text-primary transition-colors";

/** The public footer. Contact email and social links come from Settings → General. */
export default async function Footer() {
  return <FooterView settings={await loadSiteSettings()} />;
}

export function FooterView({ settings }: { settings: SiteSettings }) {
  const { contactEmail, academyName, social } = settings;
  const socialLinks = SOCIAL_KEYS.flatMap((k) => (social[k] ? [{ key: k, href: social[k], label: SOCIAL_INFO[k].label }] : []));
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
              {supportLinks(contactEmail).map(({ href, label }) => (
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
            © {new Date().getFullYear()} {academyName.toUpperCase()}. All rights reserved.
          </p>
          {socialLinks.length > 0 && (
            <ul className="flex flex-wrap items-center gap-4" aria-label="Follow us">
              {socialLinks.map(({ key, href, label }) => (
                <li key={key}>
                  <a href={href} target="_blank" rel="noopener noreferrer" className="text-xs text-on-surface-variant hover:text-primary transition-colors">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          )}
          <a
            href={`mailto:${contactEmail}`}
            className="text-xs text-on-surface-variant hover:text-primary transition-colors"
          >
            {contactEmail}
          </a>
        </div>
      </div>
    </footer>
  );
}
