import { TESTIMONIALS } from "@/lib/testimonials";
import { BACKGROUND_OPTIONS, defineSection, HIGHLIGHT_HELP } from "../section-def";

/**
 * Sections first built for the Stories page and the legal pages (any page can use them).
 * Defaults = the live copy of their first use.
 */

/** Help for rich text bodies that accept the placeholders the components fill in. */
const PLACEHOLDER_HELP = "{{contact_email}} becomes the academy's contact email and {{legal_name}} the registered business name.";

/** Joins block-level HTML without whitespace between the blocks (as the hand-built JSX rendered). */
export const blocks = (...parts: string[]): string => parts.join("");

/** The Privacy Policy as hand-built (Oct 2026). */
const PRIVACY_HTML = blocks(
  "<p>{{legal_name}} respects your privacy. This policy explains what we collect and why.</p>",
  "<h2>What we collect</h2>",
  "<ul>",
  "<li>Account details: your name, email address and profile information you choose to add (such as your dog's name).</li>",
  "<li>Learning data: the courses you have access to, your lesson progress, quiz results and certificates.</li>",
  "<li>Content you upload, such as training videos.</li>",
  "<li>Quiz answers and email when you take our “Find your journey” quiz.</li>",
  "<li>Basic usage analytics to improve the site.</li>",
  "</ul>",
  "<h2>Payments</h2>",
  "<p>Payments are processed by Paddle.com, our Merchant of Record. We never see or store your card details; Paddle shares with us only what we need to give you access (such as your email and the order).</p>",
  "<h2>How we use it</h2>",
  "<p>To provide your courses, track your progress, send emails about your account and purchases, and — only if you opted in — send news and training tips. You can unsubscribe at any time.</p>",
  "<h2>Service providers</h2>",
  "<p>We use trusted providers to run the service: hosting and database (Vercel, Supabase), video (Vimeo, Mux), email (Resend), payments (Paddle) and analytics (PostHog).</p>",
  "<h2>Your rights</h2>",
  '<p>You can ask to see, correct or delete your data by emailing <a href="mailto:{{contact_email}}">{{contact_email}}</a>.</p>',
);

export const photoHero = defineSection({
  type: "photo_hero",
  label: "Hero on a photo",
  icon: "panorama",
  category: "Intro",
  description: "A full-width photo that fades into the page, with a heading and text at the bottom.",
  fields: [
    { kind: "image", key: "image", label: "Photo" },
    { kind: "text", key: "heading", label: "Heading", highlight: true, help: HIGHLIGHT_HELP },
    { kind: "textarea", key: "text", label: "Text", rows: 2 },
  ],
  defaults: {
    image: { src: "/images/photos/borderonis-09.jpg", alt: "Roni walking through a corridor with a dog on each side" },
    heading: "Every bond has a story.",
    text: "Real students, real dogs, in their own words.",
  },
});

/** The countries of the student quotes, once each, in the order they first appear. */
const studentCountries = (): string[] => Array.from(new Set(TESTIMONIALS.map((t) => t.country ?? "").filter((c) => c !== "")));

export const pillList = defineSection({
  type: "pill_list",
  label: "Row of tags",
  icon: "sell",
  category: "Social proof",
  description: "A small heading over a row of rounded tags, like the countries your students live in.",
  fields: [
    { kind: "text", key: "eyebrow", label: "Small heading" },
    {
      kind: "list",
      key: "pills",
      label: "Tags",
      itemLabel: "Tag",
      max: 40,
      titleKey: "label",
      fields: [{ kind: "text", key: "label", label: "Text", max: 40 }],
    },
    { kind: "text", key: "trailing", label: "Last tag (muted)", max: 40, help: "Shown last in a softer color, like \"and more\". Leave empty to hide it." },
  ],
  defaults: {
    eyebrow: "Students on three continents",
    pills: studentCountries().map((label) => ({ label })),
    trailing: "and more",
  },
});

export const quoteGrid = defineSection({
  type: "quote_grid",
  label: "All student quotes",
  icon: "grid_view",
  category: "Social proof",
  description: "Every student quote as cards in two columns.",
  fields: [
    { kind: "text", key: "heading", label: "Heading (optional)" },
    { kind: "textarea", key: "text", label: "Text (optional)", rows: 2 },
  ],
  defaults: {
    heading: "",
    text: "",
  },
});

export const legalText = defineSection({
  type: "legal_text",
  label: "Legal text",
  icon: "gavel",
  category: "Page text",
  description: "A policy page: title, last updated date and the text in a white card.",
  fields: [
    { kind: "text", key: "heading", label: "Title" },
    { kind: "text", key: "updated", label: "Last updated", max: 40, help: "For example \"October 1, 2026\". Leave empty to hide the line." },
    { kind: "richtext", key: "body", label: "Text", help: PLACEHOLDER_HELP },
  ],
  defaults: {
    heading: "Privacy Policy",
    updated: "October 1, 2026",
    body: PRIVACY_HTML,
  },
});

const WIDTH_OPTIONS = [
  { value: "narrow", label: "Narrow (easy reading)" },
  { value: "wide", label: "Wide" },
] as const;

export const richText = defineSection({
  type: "rich_text",
  label: "Text",
  icon: "article",
  category: "Page text",
  description: "A block of formatted text with an optional heading.",
  fields: [
    { kind: "text", key: "heading", label: "Heading (optional)" },
    { kind: "richtext", key: "body", label: "Text", help: PLACEHOLDER_HELP },
    { kind: "select", key: "width", label: "Width", options: WIDTH_OPTIONS },
    { kind: "select", key: "background", label: "Background", options: BACKGROUND_OPTIONS },
  ],
  defaults: {
    heading: "",
    body: "<p>Write your text here. Use headings, lists and links to organize longer pages.</p>",
    width: "narrow",
    background: "surface",
  },
});

export const TEXT_SECTIONS = [photoHero, pillList, quoteGrid, legalText, richText] as const;
