import { ACCENT_OPTIONS, defineSection, HIGHLIGHT_HELP } from "../section-def";

/** Sections first built for the home page (any page can use them). Defaults = the live copy. */

export const heroVideo = defineSection({
  type: "hero_video",
  label: "Hero with video",
  icon: "smart_display",
  category: "Intro",
  description: "Big headline, two buttons and a video that plays in place.",
  fields: [
    { kind: "text", key: "heading", label: "Heading", highlight: true, help: HIGHLIGHT_HELP },
    { kind: "textarea", key: "text", label: "Text", rows: 3 },
    { kind: "link", key: "button", label: "Main button" },
    { kind: "text", key: "playLabel", label: "Play button text", help: "Leave empty to hide the play button." },
    { kind: "youtube", key: "youtube", label: "YouTube video" },
    { kind: "image", key: "poster", label: "Video cover image" },
    { kind: "text", key: "videoTitle", label: "Video title (for screen readers)" },
  ],
  defaults: {
    heading: "Learn the secret language of your dog.",
    text: "Transform the relationship you have with your dog through movement, play and positive reinforcement.",
    button: { label: "Build Your Bond", href: "/courses" },
    playLabel: "Watch Rhythm & Roni",
    youtube: "hNUWEknZ2xs",
    poster: { src: "/images/photos/borderonis-01.jpg", alt: "Roni whispering to her dog on a staircase. Press play to watch Rhythm & Roni on AGT." },
    videoTitle: "Rhythm & Roni – America's Got Talent finals",
  },
});

export const logoStrip = defineSection({
  type: "logo_strip",
  label: "As seen on",
  icon: "verified",
  category: "Social proof",
  description: "A row of names or logos of where you were featured.",
  fields: [
    { kind: "text", key: "eyebrow", label: "Small heading" },
    {
      kind: "list",
      key: "items",
      label: "Names",
      itemLabel: "Name",
      max: 12,
      titleKey: "name",
      fields: [
        { kind: "text", key: "name", label: "Name", max: 40 },
        { kind: "image", key: "logo", label: "Logo (optional)", help: "Shown instead of the name." },
      ],
    },
  ],
  defaults: {
    eyebrow: "As Seen On & Featured In",
    items: ["AGT", "DOG SHOW", "NBC", "K9 STYLE", "PETS PLUS"].map((name) => ({ name, logo: { src: "", alt: name } })),
  },
});

const BADGE_OPTIONS = [
  { value: "primary", label: "Orange" },
  { value: "secondary", label: "Teal" },
  { value: "tertiary", label: "Yellow" },
] as const;

export const featureCards = defineSection({
  type: "feature_cards",
  label: "Cards with images",
  icon: "view_column",
  category: "Lists and steps",
  description: "Three cards side by side, each with a photo, badge, text and link.",
  fields: [
    { kind: "text", key: "heading", label: "Heading" },
    { kind: "textarea", key: "text", label: "Text", rows: 2 },
    {
      kind: "list",
      key: "cards",
      label: "Cards",
      itemLabel: "Card",
      max: 6,
      titleKey: "title",
      fields: [
        { kind: "image", key: "image", label: "Image" },
        { kind: "text", key: "badge", label: "Badge", max: 30 },
        { kind: "icon", key: "icon", label: "Badge icon" },
        { kind: "select", key: "color", label: "Badge color", options: BADGE_OPTIONS },
        { kind: "text", key: "title", label: "Title", max: 60 },
        { kind: "textarea", key: "text", label: "Text", rows: 3, max: 400 },
        { kind: "link", key: "link", label: "Link" },
      ],
    },
  ],
  defaults: {
    heading: "Start Your Journey",
    text: "Every journey starts with one little step.",
    cards: [
      {
        image: { src: "/images/photos/borderonis-02.jpg", alt: "Foundations" },
        badge: "CHAPTER 01",
        icon: "favorite",
        color: "primary",
        title: "Foundations",
        text: "Build trust, communication, confidence and all the skills for all that will follow.",
        link: { label: "Start Here", href: "/courses" },
      },
      {
        image: { src: "/images/photos/borderonis-11.jpg", alt: "Moves" },
        badge: "CHAPTER 02",
        icon: "directions_run",
        color: "secondary",
        title: "Moves",
        text: "Expand your dog's movement vocabulary with expressive, contact and jumping tricks.",
        link: { label: "Explore", href: "/courses" },
      },
      {
        image: { src: "/images/photos/borderonis-19.jpg", alt: "Let's Dance" },
        badge: "CHAPTER 03",
        icon: "music_note",
        color: "tertiary",
        title: "Let's Dance",
        text: "Bring your tricks, your own movement and the music together into a dance.",
        link: { label: "Discover", href: "/courses" },
      },
    ],
  },
});

export const imageSteps = defineSection({
  type: "image_steps",
  label: "Image with steps",
  icon: "linear_scale",
  category: "Lists and steps",
  description: "A heading, a wide photo, and a row of icon steps with arrows.",
  fields: [
    { kind: "text", key: "heading", label: "Heading" },
    { kind: "image", key: "image", label: "Image" },
    {
      kind: "list",
      key: "steps",
      label: "Steps",
      itemLabel: "Step",
      max: 6,
      titleKey: "label",
      fields: [
        { kind: "icon", key: "icon", label: "Icon" },
        { kind: "text", key: "label", label: "Label", max: 30 },
      ],
    },
  ],
  defaults: {
    heading: "A new way to grow together.",
    image: { src: "/images/photos/roni-serafina.jpg", alt: "Roni and Serafina playing together in a city square" },
    steps: [
      { icon: "forum", label: "Communication" },
      { icon: "handshake", label: "Trust" },
      { icon: "all_inclusive", label: "Connection" },
      { icon: "directions_run", label: "Movement" },
      { icon: "sentiment_very_satisfied", label: "Joy" },
    ],
  },
});

const lessons = (labels: [string, string?][]) => labels.map(([label, sketch]) => ({ label, sketch: { src: sketch ? `/sketches/${sketch}.jpg` : "", alt: label } }));

export const journey = defineSection({
  type: "journey",
  label: "Journey tracks",
  icon: "route",
  category: "Lists and steps",
  description: "Up to three numbered columns, each a list of lessons with small sketches.",
  fields: [
    { kind: "text", key: "heading", label: "Heading" },
    { kind: "textarea", key: "text", label: "Text", rows: 2 },
    {
      kind: "list",
      key: "tracks",
      label: "Tracks",
      itemLabel: "Track",
      max: 3,
      titleKey: "title",
      fields: [
        { kind: "text", key: "title", label: "Title", max: 60 },
        { kind: "select", key: "color", label: "Color", options: ACCENT_OPTIONS },
        {
          kind: "list",
          key: "lessons",
          label: "Lessons",
          itemLabel: "Lesson",
          max: 20,
          titleKey: "label",
          fields: [
            { kind: "text", key: "label", label: "Lesson", max: 60 },
            { kind: "image", key: "sketch", label: "Sketch (optional)" },
          ],
        },
      ],
    },
  ],
  defaults: {
    heading: "See Your Journey",
    text: "Structured paths to take you from first steps to center stage.",
    tracks: [
      {
        title: "Bonded: Foundations",
        color: "tertiary",
        lessons: lessons([
          ["The Bond", "basic-foundations"],
          ["Feeding Drive"],
          ["Living Together", "basic-skills"],
          ["Crate Training"],
          ["Loose Leash Walk", "leash-walking"],
          ["Platform Work"],
          ["Prey Drive"],
          ["World Of Tricks", "basic-tricks"],
          ["Sequences"],
          ["Bonding Time", "intro"],
        ]),
      },
      {
        title: "Bonded: Moves",
        color: "primary",
        lessons: lessons([
          ["Discovering Moves", "fun-tricks"],
          ["Floor Tricks"],
          ["Balance & Body Control"],
          ["Directional Motion"],
          ["Expressive Tricks", "take-a-selfie"],
          ["Contact Tricks", "give-a-hug"],
          ["Jumping Tricks", "hoop-jumps"],
        ]),
      },
      {
        title: "Bonded: Let's Dance",
        color: "secondary",
        lessons: lessons([
          ["From Tricks To Dance", "dancing-skills"],
          ["Preparing The Moves"],
          ["The Human Dancer", "artistic-impressions"],
          ["When Two Dancers Meet"],
          ["Moving Together", "moving-together"],
          ["Distance & Independence"],
          ["Delayed Reward"],
          ["Advanced Sequences"],
          ["Preparing Your First Dance"],
        ]),
      },
    ],
  },
});

export const coach = defineSection({
  type: "coach",
  label: "Meet the coach",
  icon: "person_celebrate",
  category: "Text and images",
  description: "A tilted photo with a quote, a heading, text, three big numbers and a button.",
  fields: [
    { kind: "image", key: "image", label: "Photo" },
    { kind: "textarea", key: "quote", label: "Quote on the photo", rows: 2, max: 300 },
    { kind: "text", key: "eyebrow", label: "Small heading" },
    { kind: "text", key: "heading", label: "Heading" },
    { kind: "textarea", key: "text", label: "Text", rows: 4 },
    {
      kind: "list",
      key: "stats",
      label: "Numbers",
      itemLabel: "Number",
      max: 4,
      titleKey: "value",
      fields: [
        { kind: "text", key: "value", label: "Big text", max: 12 },
        { kind: "text", key: "label", label: "Under it", max: 30 },
      ],
    },
    { kind: "link", key: "button", label: "Button", optional: true },
  ],
  defaults: {
    image: { src: "/images/photos/borderonis-17.jpg", alt: "Roni Sagi with her dogs" },
    quote: "It's not about the tricks; it's about the conversation you have with your dog.",
    eyebrow: "Meet Your Coach",
    heading: "Meet the creator of BONDED.",
    text: "Millions discovered Roni through breathtaking performances. What they truly fell in love with was the relationship behind them. BONDED is the method she created to help every dog owner experience that connection.",
    stats: [
      { value: "AGT", label: "Finalist" },
      { value: "+1M", label: "Social" },
      { value: "Global", label: "Education" },
    ],
    button: { label: "Get To Know Roni", href: "/about" },
  },
});

export const testimonials = defineSection({
  type: "testimonials",
  label: "Student stories",
  icon: "format_quote",
  category: "Social proof",
  description: "Your students' quotes, as a slider or a grid.",
  fields: [
    { kind: "text", key: "heading", label: "Heading" },
    { kind: "textarea", key: "text", label: "Text", rows: 2 },
    {
      kind: "select",
      key: "layout",
      label: "Layout",
      options: [
        { value: "carousel", label: "Slider" },
        { value: "grid", label: "Grid (all quotes)" },
      ],
    },
    { kind: "link", key: "link", label: "Link under the quotes", optional: true },
  ],
  defaults: {
    heading: "Bonded Stories",
    text: "Students on three continents and counting.",
    layout: "carousel",
    link: { label: "Read more stories", href: "/stories" },
  },
});

export const imageBanner = defineSection({
  type: "image_banner",
  label: "Banner on a photo",
  icon: "wallpaper",
  category: "Call to action",
  description: "Centered heading, text and button over a faded photo.",
  fields: [
    { kind: "image", key: "image", label: "Background photo" },
    { kind: "text", key: "heading", label: "Heading" },
    { kind: "textarea", key: "text", label: "Text", rows: 3 },
    { kind: "link", key: "button", label: "Button", optional: true },
  ],
  defaults: {
    image: { src: "/images/photos/borderonis-27.jpg", alt: "Roni's five border collies sitting in a row" },
    heading: "You're building this bond together.",
    text: "Every BONDED member joins our private WhatsApp community. Share your progress, ask questions, and take part in Roni's quarterly live Q&A.",
    button: { label: "Become a Member", href: "/signup" },
  },
});

export const faq = defineSection({
  type: "faq",
  label: "FAQ",
  icon: "quiz",
  category: "Page text",
  description: "Questions that open to show their answer.",
  fields: [
    { kind: "text", key: "heading", label: "Heading" },
    { kind: "text", key: "anchor", label: "Link name", help: "Links to #this-name jump here (the footer's FAQ link uses \"faq\").", max: 40 },
    {
      kind: "list",
      key: "items",
      label: "Questions",
      itemLabel: "Question",
      max: 30,
      titleKey: "q",
      fields: [
        { kind: "text", key: "q", label: "Question", max: 200 },
        { kind: "textarea", key: "a", label: "Answer", rows: 4, max: 2000 },
      ],
    },
  ],
  defaults: {
    heading: "Frequently Asked Questions",
    anchor: "faq",
    items: [
      { q: "Can any dog learn?", a: "Absolutely. The BONDED method is built on connection, not breed-specific traits. Whether you have a puppy or a senior rescue, the focus is on building trust at your dog's pace." },
      { q: "Do I need experience?", a: "No prior training experience is required. Bonded: Foundations starts from the very beginning, teaching you the fundamental language of positive reinforcement." },
      { q: "How much time does it take?", a: "Just 10-15 minutes a day. Short, positive, and consistent sessions are far more effective for building a lasting bond than long, exhausting drills." },
      {
        q: "What age can my dog start?",
        a: "Any age. Foundations works for puppies, adult dogs and seniors alike, because it starts with communication, not physical demands. Magalí from Argentina started with Tina at almost 12 years old. Jumping and more athletic moves come later and are always adapted to your dog.",
      },
      { q: "Do I need any equipment?", a: "No. Some treats your dog loves, a favorite toy and a little space at home are all you need to begin." },
      { q: "What language are the lessons in?", a: "All lessons are in English, with clear video demonstrations you can follow even if English isn't your first language." },
      {
        q: "Where can I ask a question?",
        a: "Members ask Roni directly in the BONDED WhatsApp community and in her quarterly live Q&A. Before you join, email us at info.bonded@gmail.com and we'll get back to you.",
      },
    ],
  },
});

export const gradientCta = defineSection({
  type: "gradient_cta",
  label: "Big colored call to action",
  icon: "campaign",
  category: "Call to action",
  description: "A wide brand-colored panel with a heading, text and button.",
  fields: [
    { kind: "text", key: "heading", label: "Heading" },
    { kind: "text", key: "text", label: "Text" },
    { kind: "link", key: "button", label: "Button" },
    { kind: "image", key: "image", label: "Faded photo behind (optional)" },
  ],
  defaults: {
    heading: "Your dog is already speaking.",
    text: "It's time to learn the language.",
    button: { label: "Build Your Bond", href: "/courses" },
    image: { src: "/images/photos/borderonis-09.jpg", alt: "" },
  },
});

export const HOME_SECTIONS = [heroVideo, logoStrip, featureCards, imageSteps, journey, coach, testimonials, imageBanner, faq, gradientCta] as const;
