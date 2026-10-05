import { TESTIMONIALS } from "@/lib/testimonials";
import { ACCENT_OPTIONS, defineSection, HIGHLIGHT_HELP, IMAGE_SIDE_OPTIONS } from "../section-def";

/** Sections first built for the Courses page (any page can use them). Defaults = the live copy. */

const LINE_BREAK_HELP = "A new line in the heading starts a new line on the page.";
const HEADING_HELP = `${HIGHLIGHT_HELP} ${LINE_BREAK_HELP}`;

/** Roomy = the Courses page; compact = the Stories page (smaller heading, full-width button on phones). */
const SIZE_OPTIONS = [
  { value: "roomy", label: "Roomy" },
  { value: "compact", label: "Compact (full-width button on phones)" },
] as const;

const TESTIMONIAL_OPTIONS = [{ value: "", label: "No quote" }, ...TESTIMONIALS.map((t) => ({ value: t.id, label: t.name }))];

export const journeyHero = defineSection({
  type: "journey_hero",
  label: "Hero with tall photo",
  icon: "landscape",
  category: "Intro",
  description: "Big headline with gradient words, text, two buttons and a tall photo on a tilted backdrop.",
  fields: [
    { kind: "text", key: "heading", label: "Heading", highlight: true, help: `Wrap words in *stars* to give them the brand gradient. ${LINE_BREAK_HELP}` },
    { kind: "textarea", key: "text", label: "Text", rows: 3 },
    { kind: "link", key: "button", label: "Main button" },
    { kind: "link", key: "secondButton", label: "Second button", optional: true },
    { kind: "image", key: "image", label: "Photo", help: "A tall (portrait) photo works best." },
    { kind: "select", key: "backdrop", label: "Backdrop color", options: ACCENT_OPTIONS },
  ],
  defaults: {
    heading: "Every extraordinary relationship \n*follows a path.*",
    text: "The BONDED Method is a step-by-step journey designed to help you build trust, communication, and a lifelong bond with your dog.",
    button: { label: "Start with Foundations", href: "/chapter/foundations" },
    secondButton: { label: "Find Your Journey", href: "/quiz" },
    image: { src: "/images/photos/borderonis-15.jpg", alt: "Roni's dog jumping up to greet her in a lit corridor" },
    backdrop: "secondary",
  },
});

export const iconSteps = defineSection({
  type: "icon_steps",
  label: "Icon steps",
  icon: "timeline",
  category: "Lists and steps",
  description: "A centered heading and text over a row of round icons joined by a line.",
  fields: [
    { kind: "text", key: "heading", label: "Heading", highlight: true, help: HEADING_HELP },
    { kind: "textarea", key: "text", label: "Text", rows: 3 },
    {
      kind: "list",
      key: "steps",
      label: "Steps",
      itemLabel: "Step",
      max: 5,
      titleKey: "label",
      fields: [
        { kind: "icon", key: "icon", label: "Icon" },
        { kind: "text", key: "label", label: "Label", max: 40 },
        { kind: "select", key: "color", label: "Icon color", options: ACCENT_OPTIONS },
      ],
    },
  ],
  defaults: {
    heading: "One journey. Three chapters. \nA lifetime of possibilities.",
    text: "Each chapter builds on the one before it—starting with communication, expanding into movement, and bringing everything together through dance.",
    steps: [
      { icon: "pets", label: "Foundations", color: "primary" },
      { icon: "directions_run", label: "Moves", color: "secondary" },
      { icon: "music_note", label: "Let's Dance", color: "tertiary" },
    ],
  },
});

export const chapterStage = defineSection({
  type: "chapter_stage",
  label: "Chapter",
  icon: "auto_stories",
  category: "Text and images",
  description: "One chapter: badge, pitch, what you'll learn, who it's for, the outcome, a student quote, a button and a photo.",
  fields: [
    { kind: "text", key: "badge", label: "Badge", max: 60 },
    { kind: "icon", key: "badgeIcon", label: "Badge icon" },
    { kind: "select", key: "badgeColor", label: "Badge color", options: ACCENT_OPTIONS },
    { kind: "text", key: "title", label: "Heading", max: 120 },
    { kind: "textarea", key: "text", label: "Text", rows: 4 },
    { kind: "text", key: "learnHeading", label: "First list heading", max: 40 },
    {
      kind: "list",
      key: "learn",
      label: "First list (with check marks)",
      itemLabel: "Item",
      max: 10,
      titleKey: "text",
      fields: [{ kind: "text", key: "text", label: "Item", max: 120 }],
    },
    { kind: "select", key: "learnColor", label: "Check mark color", options: ACCENT_OPTIONS },
    { kind: "text", key: "perfectHeading", label: "Second list heading", max: 40, help: "On phones this list folds away under its heading." },
    {
      kind: "list",
      key: "perfectFor",
      label: "Second list (with icons)",
      itemLabel: "Item",
      max: 6,
      titleKey: "label",
      fields: [
        { kind: "icon", key: "icon", label: "Icon" },
        { kind: "text", key: "label", label: "Item", max: 160 },
      ],
    },
    { kind: "select", key: "perfectColor", label: "Icon color", options: ACCENT_OPTIONS },
    { kind: "text", key: "outcomeLabel", label: "Outcome label", max: 30 },
    { kind: "textarea", key: "outcome", label: "Outcome", rows: 2, max: 300 },
    { kind: "select", key: "outcomeColor", label: "Outcome label color", options: ACCENT_OPTIONS },
    { kind: "select", key: "testimonial", label: "Student quote", options: TESTIMONIAL_OPTIONS, help: "Quotes come from the student stories list." },
    { kind: "link", key: "button", label: "Button", optional: true },
    { kind: "select", key: "buttonColor", label: "Button color", options: ACCENT_OPTIONS },
    { kind: "image", key: "image", label: "Photo" },
    {
      kind: "select",
      key: "imageShape",
      label: "Photo shape",
      options: [
        { value: "portrait", label: "Portrait (4:5)" },
        { value: "landscape", label: "Landscape (4:3)" },
      ],
    },
    { kind: "select", key: "imageSide", label: "Photo side", options: IMAGE_SIDE_OPTIONS, help: "On phones the photo is always on top." },
    {
      kind: "select",
      key: "background",
      label: "Panel color",
      options: [
        { value: "low", label: "Light tint" },
        { value: "white", label: "White" },
      ],
    },
    { kind: "toggle", key: "bottomGlow", label: "Yellow glow in the bottom corner" },
  ],
  defaults: {
    badge: "Chapter One · Foundations",
    badgeIcon: "favorite",
    badgeColor: "primary",
    title: "Build the foundation everything else grows from.",
    text: "Foundations is where you and your dog learn how to learn together. You'll build trust, communication and engagement, then turn them into everyday skills, confident movement and your first experiences of dancing as one.",
    learnHeading: "You'll Learn:",
    learn: [
      "A clear shared language",
      "Engagement & focus",
      "Calm, practical everyday skills",
      "Understanding prey drive and how to play with your dog",
      "Confident movement and body awareness",
      "Tricks, the idea of sequences and mini dances",
    ].map((text) => ({ text })),
    learnColor: "primary",
    perfectHeading: "Perfect For:",
    perfectFor: [
      { icon: "pets", label: "New dogs and new partnerships" },
      { icon: "diversity_1", label: "Dogs of every age and experience" },
      { icon: "handshake", label: "Anyone ready to build a stronger bond" },
    ],
    perfectColor: "secondary",
    outcomeLabel: "Outcome:",
    outcome: "A dog who understands you, chooses you and is ready to learn with you.",
    outcomeColor: "primary",
    testimonial: "jessica",
    button: { label: "Start with Foundations", href: "/chapter/foundations" },
    buttonColor: "primary",
    image: { src: "/images/photos/borderonis-02.jpg", alt: "Roni sitting on a staircase, her dog resting a paw on her knee" },
    imageShape: "portrait",
    imageSide: "right",
    background: "low",
    bottomGlow: false,
  },
});

export const iconCards = defineSection({
  type: "icon_cards",
  label: "Cards with icons",
  icon: "grid_view",
  category: "Lists and steps",
  description: "A centered heading and text over three cards, each with a round icon, a title and a line of text.",
  fields: [
    { kind: "text", key: "heading", label: "Heading", highlight: true, help: HEADING_HELP },
    { kind: "textarea", key: "text", label: "Text", rows: 2 },
    {
      kind: "list",
      key: "cards",
      label: "Cards",
      itemLabel: "Card",
      max: 6,
      titleKey: "title",
      fields: [
        { kind: "icon", key: "icon", label: "Icon" },
        { kind: "select", key: "color", label: "Icon color", options: ACCENT_OPTIONS },
        { kind: "text", key: "title", label: "Title", max: 60 },
        { kind: "textarea", key: "body", label: "Text", rows: 3, max: 400 },
      ],
    },
  ],
  defaults: {
    heading: "Built on connection. \nBacked by experience.",
    text: "Combining professional training, positive reinforcement, and real-world success.",
    cards: [
      { icon: "handshake", color: "primary", title: "1. Trust Comes First", body: "A dog who feels safe is ready to connect, explore and learn." },
      { icon: "psychology", color: "secondary", title: "2. Learn Together", body: "Training becomes a conversation where both ends of the leash take part." },
      {
        icon: "all_inclusive",
        color: "tertiary",
        title: "3. Bond Through It All",
        body: "From everyday moments to new challenges, every experience becomes an opportunity to strengthen your bond.",
      },
    ],
  },
});

export const splitCta = defineSection({
  type: "split_cta",
  label: "Colored panel with photo",
  icon: "vertical_split",
  category: "Call to action",
  description: "A rounded colored panel: heading, text and button on the left, a photo on the right.",
  fields: [
    { kind: "text", key: "heading", label: "Heading" },
    { kind: "textarea", key: "text", label: "Text", rows: 3 },
    { kind: "link", key: "button", label: "Button", optional: true },
    { kind: "image", key: "image", label: "Photo" },
    { kind: "select", key: "color", label: "Panel color", options: ACCENT_OPTIONS },
    { kind: "select", key: "size", label: "Size", options: SIZE_OPTIONS },
  ],
  defaults: {
    heading: "Not Sure Where To Start?",
    text: "Answer a few quick questions and we'll recommend the best chapter for you and your dog.",
    button: { label: "Take the Quiz", href: "/quiz" },
    image: { src: "/images/photos/borderonis-10.jpg", alt: "Roni kneeling with two of her dogs" },
    color: "secondary",
    size: "roomy",
  },
});

export const simpleCta = defineSection({
  type: "simple_cta",
  label: "Simple call to action",
  icon: "ads_click",
  category: "Call to action",
  description: "A big centered heading, a line or two of text and a gradient button.",
  fields: [
    { kind: "text", key: "heading", label: "Heading" },
    { kind: "textarea", key: "text", label: "Text", rows: 2 },
    { kind: "textarea", key: "smallText", label: "Smaller text (optional)", rows: 2 },
    { kind: "link", key: "button", label: "Button", optional: true },
    { kind: "select", key: "size", label: "Size", options: SIZE_OPTIONS },
  ],
  defaults: {
    heading: "Every great relationship starts with one step.",
    text: "Ready when you are.",
    smallText: "Begin with Foundations and progress through the journey at your own pace.",
    button: { label: "Start with Foundations", href: "/chapter/foundations" },
    size: "roomy",
  },
});

export const JOURNEY_SECTIONS = [journeyHero, iconSteps, chapterStage, iconCards, splitCta, simpleCta] as const;
