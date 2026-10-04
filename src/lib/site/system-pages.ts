import type { PageDoc, PageSeo } from "./page-doc";
import { homeTemplate } from "./templates/home";
import { aboutTemplate } from "./templates/about";
import { coursesTemplate } from "./templates/courses";
import { storiesTemplate } from "./templates/stories";
import { accessibilityTemplate, privacyTemplate, refundTemplate, termsTemplate } from "./templates/legal";

/**
 * The site's built-in pages. Until someone edits one, the site shows its template (the
 * hand-built page, rebuilt from sections); the first edit copies it into the database.
 */
export type SystemKey = "home" | "about" | "courses" | "stories" | "privacy" | "terms" | "refund" | "accessibility";

export interface SystemPage {
  key: SystemKey;
  /** Address without the leading slash ("" = home). */
  slug: string;
  title: string;
  seo: PageSeo;
  template: () => PageDoc;
}

const seo = (title: string, description = ""): PageSeo => ({ title, description, image: "" });

export const SYSTEM_PAGES: readonly SystemPage[] = [
  { key: "home", slug: "", title: "Home", seo: seo("BONDED – Learn your dog's secret language"), template: homeTemplate },
  { key: "about", slug: "about", title: "About Roni", seo: seo("About Roni"), template: aboutTemplate },
  { key: "courses", slug: "courses", title: "The Bonded Journey", seo: seo("The Bonded Journey"), template: coursesTemplate },
  { key: "stories", slug: "stories", title: "Student Stories", seo: seo("Student Stories", "Real BONDED students on three continents, in their own words."), template: storiesTemplate },
  { key: "privacy", slug: "privacy", title: "Privacy Policy", seo: seo("Privacy Policy"), template: privacyTemplate },
  { key: "terms", slug: "terms", title: "Terms of Service", seo: seo("Terms of Service"), template: termsTemplate },
  { key: "refund", slug: "refund-policy", title: "Refund and Cancellation Policy", seo: seo("Refund and Cancellation Policy"), template: refundTemplate },
  { key: "accessibility", slug: "accessibility", title: "Accessibility Statement", seo: seo("Accessibility Statement"), template: accessibilityTemplate },
];

export function systemPage(key: SystemKey): SystemPage {
  const page = SYSTEM_PAGES.find((p) => p.key === key);
  if (!page) throw new Error(`unknown system page ${key}`);
  return page;
}

export { MAX_SLUG, RESERVED_SLUGS, slugify, slugProblem } from "./slugs";
