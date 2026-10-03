import Link from "next/link";
import { loadSiteSettings } from "@/lib/site-settings-server";
import { SOCIAL_INFO, SOCIAL_KEYS, type SiteSettings } from "@/lib/site-settings";
import { loadLiveTheme } from "@/lib/site/server";
import type { SiteTheme } from "@/lib/site/theme";

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

/** The public footer. Contact email and social links come from Settings → General; the rest from Website → Theme. */
export default async function Footer() {
  const [settings, theme] = await Promise.all([loadSiteSettings(), loadLiveTheme()]);
  return <FooterView settings={settings} theme={theme} />;
}

export function FooterView({ settings, theme }: { settings: SiteSettings; theme: SiteTheme }) {
  const { contactEmail, academyName, social } = settings;
  const { logo, footer } = theme;
  const socialLinks = SOCIAL_KEYS.flatMap((k) => (social[k] ? [{ key: k, href: social[k], label: SOCIAL_INFO[k].label }] : []));
  return (
    <footer className="w-full mt-20 bg-surface-container-low border-t border-outline-variant/20">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="md:col-span-2">
            <img alt="BONDED Logo" className="h-12 w-auto mb-6" src={logo} />
            <p className="text-sm text-on-surface-variant leading-relaxed max-w-sm">{footer.tagline}</p>
          </div>

          <div>
            <h4 className="font-headline font-bold text-on-surface mb-6 uppercase text-xs tracking-widest">
              Explore
            </h4>
            <ul className="space-y-4">
              {footer.links.map(({ href, label }) => (
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
