import { ABOUT_TESTIMONIALS, TESTIMONIALS, type Testimonial } from "@/lib/testimonials";
import { BACKGROUND_OPTIONS, defineSection, HIGHLIGHT_HELP, IMAGE_SIDE_OPTIONS } from "../section-def";

/** Sections first built for the About page: a personal story told in words and photos. Defaults = the live copy. */

/** How the *starred* words in a heading look. The component maps each to its classes. */
export const HIGHLIGHT_STYLE_OPTIONS = [
  { value: "primary", label: "Orange" },
  { value: "primary_italic", label: "Orange italic" },
  { value: "secondary", label: "Teal" },
  { value: "light_italic", label: "Light yellow italic (for the brand color background)" },
  { value: "underline", label: "Orange italic with a yellow underline" },
] as const;

export const IMAGE_SHAPE_OPTIONS = [
  { value: "wide", label: "Wide (3:2)" },
  { value: "classic", label: "Classic (4:3)" },
  { value: "tall", label: "Tall (4:5)" },
  { value: "square", label: "Square" },
] as const;

const NO_QUOTE = "none";

const quoteLabel = (t: Testimonial, aboutRoni: boolean) => (aboutRoni ? `${t.name} (about Roni)` : t.name);

/** Every student quote a story section can show, by id. */
const QUOTES: readonly Testimonial[] = [...ABOUT_TESTIMONIALS, ...TESTIMONIALS];

export const QUOTE_OPTIONS = [
  { value: NO_QUOTE, label: "No quote" },
  ...ABOUT_TESTIMONIALS.map((t) => ({ value: t.id, label: quoteLabel(t, true) })),
  ...TESTIMONIALS.map((t) => ({ value: t.id, label: quoteLabel(t, false) })),
];

export function storyQuote(id: string): Testimonial | undefined {
  return id === NO_QUOTE ? undefined : QUOTES.find((t) => t.id === id);
}

const highlightStyle = { kind: "select", key: "highlightStyle", label: "Highlighted words", options: HIGHLIGHT_STYLE_OPTIONS } as const;
const quote = { kind: "select", key: "quote", label: "Student quote", help: "A short quote shown under the text.", options: QUOTE_OPTIONS } as const;
const PARAGRAPH_HELP = "Leave a blank line between paragraphs.";

export const storyHero = defineSection({
  type: "story_hero",
  label: "Statement hero",
  icon: "format_quote",
  category: "Intro",
  description: "A big statement with colored words, a line of text and a tall photo.",
  fields: [
    { kind: "text", key: "heading", label: "Heading", highlight: true, help: HIGHLIGHT_HELP },
    highlightStyle,
    { kind: "textarea", key: "text", label: "Text", rows: 3 },
    { kind: "image", key: "image", label: "Photo" },
    { kind: "select", key: "imageShape", label: "Photo shape", options: IMAGE_SHAPE_OPTIONS },
  ],
  defaults: {
    heading: "It was never just about *teaching dogs* to dance.",
    highlightStyle: "primary_italic",
    text: "It was about discovering what becomes possible when a dog and human truly understand each other.",
    image: { src: "/images/photos/borderonis-21.jpg", alt: "Roni hugging her border collie over her shoulder" },
    imageShape: "tall",
  },
});

export const storyIntro = defineSection({
  type: "story_intro",
  label: "Centered intro",
  icon: "waving_hand",
  category: "Intro",
  description: "A short centered heading and a line of text, like a hello.",
  fields: [
    { kind: "text", key: "heading", label: "Heading", highlight: true, help: HIGHLIGHT_HELP },
    { kind: "textarea", key: "text", label: "Text", rows: 3, help: PARAGRAPH_HELP },
  ],
  defaults: {
    heading: "Hi, I'm Roni.",
    text: "I'm a professional dog trainer, dog dance performer and educator from Israel.",
  },
});

export const storyImageText = defineSection({
  type: "story_image_text",
  label: "Image and text",
  icon: "art_track",
  category: "Text and images",
  description: "A photo beside a heading and a few paragraphs, with an optional badge and student quote.",
  fields: [
    { kind: "text", key: "eyebrow", label: "Badge (optional)", help: "A small label above the heading.", max: 40 },
    { kind: "icon", key: "eyebrowIcon", label: "Badge icon" },
    { kind: "text", key: "heading", label: "Heading", highlight: true, help: HIGHLIGHT_HELP },
    highlightStyle,
    { kind: "textarea", key: "text", label: "Text", rows: 6, help: PARAGRAPH_HELP },
    {
      kind: "select",
      key: "emphasis",
      label: "Paragraph emphasis",
      options: [
        { value: "none", label: "None" },
        { value: "lead", label: "First paragraph larger, in italics" },
        { value: "closing", label: "Last paragraph in bold" },
      ],
    },
    { kind: "image", key: "image", label: "Photo" },
    { kind: "select", key: "imageShape", label: "Photo shape", options: IMAGE_SHAPE_OPTIONS },
    {
      kind: "select",
      key: "imageStyle",
      label: "Photo style",
      options: [
        { value: "soft", label: "Rounded with a soft shadow" },
        { value: "tilted", label: "Tilted frame (for the brand color background)" },
      ],
    },
    { kind: "select", key: "imageSide", label: "Photo position", options: IMAGE_SIDE_OPTIONS },
    {
      kind: "select",
      key: "layout",
      label: "Layout",
      options: [
        { value: "side", label: "Heading beside the photo" },
        { value: "top", label: "Heading on top, photo and text in two halves" },
        { value: "top_wide", label: "Heading on top, narrow text and a wide photo" },
      ],
    },
    { kind: "select", key: "background", label: "Background", options: BACKGROUND_OPTIONS },
    quote,
  ],
  defaults: {
    eyebrow: "",
    eyebrowIcon: "",
    heading: "I fell in love with what dog dancing *made possible*.",
    highlightStyle: "secondary",
    text: "Over the years, I've performed on some of the world's biggest stages, taught thousands of dog lovers and built a global community around the relationship between dogs and their people.\n\nBut everything I teach comes back to the same idea: the most beautiful movements begin long before the music starts.",
    emphasis: "none",
    image: { src: "/images/photos/borderonis-17.jpg", alt: "Roni sitting on a staircase surrounded by her five dogs" },
    imageShape: "wide",
    imageStyle: "soft",
    imageSide: "left",
    layout: "side",
    background: "low",
    quote: "mara-roni",
  },
});

export const storyMediaPair = defineSection({
  type: "story_media_pair",
  label: "Video and photo",
  icon: "video_library",
  category: "Text and images",
  description: "A heading and intro, then a video and a photo side by side with captions.",
  fields: [
    { kind: "text", key: "heading", label: "Heading", highlight: true, help: HIGHLIGHT_HELP },
    highlightStyle,
    { kind: "textarea", key: "intro", label: "Intro", rows: 4, help: PARAGRAPH_HELP },
    { kind: "youtube", key: "youtube", label: "YouTube video", help: "Leave empty to show the cover image as a photo." },
    { kind: "image", key: "poster", label: "Video cover image" },
    { kind: "text", key: "videoTitle", label: "Video title (for screen readers)" },
    { kind: "text", key: "videoLabel", label: "Video caption title", max: 40 },
    { kind: "text", key: "videoCaption", label: "Video caption" },
    { kind: "image", key: "image", label: "Photo" },
    { kind: "text", key: "imageLabel", label: "Photo caption title", max: 40 },
    { kind: "text", key: "imageCaption", label: "Photo caption" },
    { kind: "textarea", key: "outro", label: "Closing text (optional)", rows: 3, help: PARAGRAPH_HELP },
    quote,
    { kind: "select", key: "background", label: "Background", options: BACKGROUND_OPTIONS },
  ],
  defaults: {
    heading: "Millions watched us dance. What made it possible happened *long before the stage*.",
    highlightStyle: "secondary",
    intro:
      "When Rhythm and I appeared on America's Got Talent, people saw the tricks, choreography and music. But behind every movement was the trust and communication we had built long before the performance began.",
    youtube: "hNUWEknZ2xs",
    poster: { src: "/images/photos/agt-spotlight.jpg", alt: "Roni Sagi and Rhythm performing in the America's Got Talent finals. Press play to watch." },
    videoTitle: "Rhythm & Roni – America's Got Talent finals",
    videoLabel: "The Performance",
    videoCaption: "Tricks, choreography and spectacle.",
    image: { src: "/images/photos/real-life.jpg", alt: "Roni and her dog in a quiet everyday moment" },
    imageLabel: "Real Life",
    imageCaption: "Trust, communication and all the quiet moments in between.",
    outro: "A performance lasts only a few minutes. The relationship behind it is built every day.",
    quote: "mary",
    background: "surface",
  },
});

export const storyCta = defineSection({
  type: "story_cta",
  label: "Closing call to action",
  icon: "flag",
  category: "Call to action",
  description: "A very large centered heading with colored words, a line of text and a button.",
  fields: [
    { kind: "text", key: "heading", label: "Heading", highlight: true, help: HIGHLIGHT_HELP },
    highlightStyle,
    { kind: "textarea", key: "text", label: "Text", rows: 2 },
    { kind: "link", key: "button", label: "Button", optional: true },
    { kind: "select", key: "background", label: "Background", options: BACKGROUND_OPTIONS },
  ],
  defaults: {
    heading: "Let's build something *extraordinary* together.",
    highlightStyle: "underline",
    text: "Your dog is already speaking. I'd love to help you learn the language.",
    button: { label: "Start with Foundations", href: "/chapter/foundations" },
    background: "white",
  },
});

export const STORY_SECTIONS = [storyHero, storyIntro, storyImageText, storyMediaPair, storyCta] as const;
