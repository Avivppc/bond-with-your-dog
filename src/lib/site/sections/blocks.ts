import type { BlockDef, FieldDef, FieldValues } from "../fields";
import { BACKGROUND_OPTIONS, defineSection, HIGHLIGHT_HELP } from "../section-def";

/**
 * "Build your own" section: up to four columns, each a free list of blocks (heading, text, image,
 * button, video, list, quote, icon feature, spacer, divider), every block with its own design
 * options. Pure definitions; src/components/site/sections/blocks.tsx draws them.
 */

const ALIGN = { kind: "select", key: "align", label: "Alignment", options: [
  { value: "inherit", label: "Like the column" },
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
] } as const satisfies FieldDef;

const TEXT_COLOR = { kind: "select", key: "color", label: "Color", options: [
  { value: "default", label: "Text color" },
  { value: "muted", label: "Soft gray" },
  { value: "primary", label: "Brand color" },
  { value: "secondary", label: "Second color" },
  { value: "white", label: "White (for dark backgrounds)" },
] } as const satisfies FieldDef;

export const BLOCK_TYPES: readonly BlockDef[] = [
  {
    type: "heading",
    label: "Heading",
    icon: "title",
    titleKey: "text",
    fields: [
      { kind: "text", key: "text", label: "Text", highlight: true, help: HIGHLIGHT_HELP },
      { kind: "select", key: "size", label: "Size", options: [
        { value: "s", label: "Small" },
        { value: "m", label: "Medium" },
        { value: "l", label: "Large" },
        { value: "xl", label: "Extra large" },
      ] },
      { kind: "select", key: "level", label: "Kind (for search engines)", options: [
        { value: "h2", label: "Section heading (H2)" },
        { value: "h3", label: "Sub heading (H3)" },
        { value: "h1", label: "Page title (H1, once per page)" },
      ] },
      ALIGN,
      TEXT_COLOR,
    ],
    defaults: { text: "Your heading", size: "l", level: "h2", align: "inherit", color: "default" },
  },
  {
    type: "text",
    label: "Text",
    icon: "notes",
    fields: [
      { kind: "richtext", key: "body", label: "Text" },
      { kind: "select", key: "size", label: "Size", options: [
        { value: "s", label: "Small" },
        { value: "m", label: "Normal" },
        { value: "l", label: "Large" },
      ] },
      ALIGN,
      TEXT_COLOR,
    ],
    defaults: { body: "<p>Write something here. Select text to make it bold, add a link or a list.</p>", size: "m", align: "inherit", color: "muted" },
  },
  {
    type: "image",
    label: "Image",
    icon: "image",
    fields: [
      { kind: "image", key: "image", label: "Image" },
      { kind: "select", key: "aspect", label: "Shape", options: [
        { value: "auto", label: "As uploaded" },
        { value: "square", label: "Square" },
        { value: "4/3", label: "Landscape 4:3" },
        { value: "16/9", label: "Wide 16:9" },
        { value: "4/5", label: "Portrait 4:5" },
      ] },
      { kind: "select", key: "corners", label: "Corners", options: [
        { value: "soft", label: "Rounded" },
        { value: "round", label: "Very rounded" },
        { value: "none", label: "Square" },
        { value: "circle", label: "Circle" },
      ] },
      { kind: "toggle", key: "shadow", label: "Shadow" },
      { kind: "link", key: "link", label: "Link (optional)", optional: true },
    ],
    defaults: { image: { src: "/images/photos/borderonis-10.jpg", alt: "Roni with her dogs" }, aspect: "4/3", corners: "soft", shadow: true, link: { label: "", href: "" } },
  },
  {
    type: "button",
    label: "Button",
    icon: "smart_button",
    titleKey: "label",
    fields: [
      { kind: "link", key: "link", label: "Button" },
      { kind: "select", key: "style", label: "Style", options: [
        { value: "gradient", label: "Brand gradient" },
        { value: "solid", label: "Solid brand color" },
        { value: "outline", label: "Outline" },
        { value: "soft", label: "Soft" },
        { value: "white", label: "White (for dark backgrounds)" },
        { value: "link", label: "Text link with arrow" },
      ] },
      { kind: "select", key: "size", label: "Size", options: [
        { value: "m", label: "Normal" },
        { value: "l", label: "Large" },
      ] },
      ALIGN,
      { kind: "toggle", key: "arrow", label: "Arrow after the text" },
    ],
    defaults: { link: { label: "Start with Foundations", href: "/chapter/foundations" }, style: "gradient", size: "m", align: "inherit", arrow: true },
  },
  {
    type: "video",
    label: "YouTube video",
    icon: "smart_display",
    fields: [
      { kind: "youtube", key: "youtube", label: "YouTube link" },
      { kind: "image", key: "poster", label: "Cover image (optional)", help: "Shown until the visitor presses play." },
      { kind: "text", key: "title", label: "Video title (for screen readers)" },
    ],
    defaults: { youtube: "hNUWEknZ2xs", poster: { src: "/images/photos/agt-spotlight.jpg", alt: "Press play to watch" }, title: "Rhythm & Roni" },
  },
  {
    type: "list",
    label: "List",
    icon: "checklist",
    fields: [
      {
        kind: "list",
        key: "items",
        label: "Items",
        itemLabel: "Item",
        max: 20,
        titleKey: "text",
        fields: [{ kind: "text", key: "text", label: "Text", max: 200 }],
      },
      { kind: "select", key: "marker", label: "Marker", options: [
        { value: "check", label: "Check marks" },
        { value: "dot", label: "Dots" },
        { value: "number", label: "Numbers" },
      ] },
      TEXT_COLOR,
    ],
    defaults: { items: [{ text: "Short daily sessions" }, { text: "Step-by-step videos" }, { text: "Ask Roni anything" }], marker: "check", color: "default" },
  },
  {
    type: "feature",
    label: "Icon with text",
    icon: "featured_play_list",
    titleKey: "title",
    fields: [
      { kind: "icon", key: "icon", label: "Icon" },
      { kind: "select", key: "tone", label: "Icon color", options: [
        { value: "primary", label: "Orange" },
        { value: "secondary", label: "Teal" },
        { value: "tertiary", label: "Yellow" },
      ] },
      { kind: "text", key: "title", label: "Title", max: 80 },
      { kind: "textarea", key: "text", label: "Text", rows: 3, max: 600 },
      ALIGN,
    ],
    defaults: { icon: "pets", tone: "primary", title: "Trust comes first", text: "A dog who feels safe is ready to connect, explore and learn.", align: "inherit" },
  },
  {
    type: "quote",
    label: "Quote",
    icon: "format_quote",
    titleKey: "text",
    fields: [
      { kind: "textarea", key: "text", label: "Quote", rows: 3, max: 600 },
      { kind: "text", key: "author", label: "Who said it", max: 80 },
      { kind: "select", key: "style", label: "Style", options: [
        { value: "card", label: "Card" },
        { value: "large", label: "Large text" },
      ] },
    ],
    defaults: { text: "It's not about the tricks; it's about the conversation you have with your dog.", author: "Roni Sagi", style: "card" },
  },
  {
    type: "spacer",
    label: "Space",
    icon: "height",
    fields: [{ kind: "select", key: "size", label: "Height", options: [
      { value: "s", label: "Small" },
      { value: "m", label: "Medium" },
      { value: "l", label: "Large" },
    ] }],
    defaults: { size: "m" },
  },
  {
    type: "divider",
    label: "Line",
    icon: "horizontal_rule",
    fields: [{ kind: "select", key: "width", label: "Width", options: [
      { value: "full", label: "Full width" },
      { value: "short", label: "Short" },
    ] }],
    defaults: { width: "full" },
  },
];

export const BLOCKS_FIELD = { kind: "blocks", key: "blocks", label: "Blocks", blockTypes: BLOCK_TYPES, max: 20 } as const satisfies FieldDef;

const column = (blocks: FieldValues[]): FieldValues => ({ blocks });
const block = (type: string, values: FieldValues = {}): FieldValues => {
  const def = BLOCK_TYPES.find((b) => b.type === type);
  if (!def) throw new Error(`unknown block ${type}`);
  return { ...structuredClone(def.defaults), ...values, type };
};

export const blocksSection = defineSection({
  type: "blocks",
  label: "Build your own",
  icon: "dashboard_customize",
  category: "Text and images",
  description: "Columns of blocks you arrange yourself: headings, text, images, buttons, videos, lists and more.",
  fields: [
    {
      kind: "list",
      key: "columns",
      label: "Columns",
      itemLabel: "Column",
      min: 1,
      max: 4,
      fields: [BLOCKS_FIELD],
    },
    { kind: "select", key: "layout", label: "Column widths (two columns)", options: [
      { value: "equal", label: "Equal" },
      { value: "wide-left", label: "Wider left" },
      { value: "wide-right", label: "Wider right" },
    ] },
    { kind: "select", key: "valign", label: "Line up the columns", options: [
      { value: "center", label: "Centered" },
      { value: "top", label: "At the top" },
    ] },
    { kind: "select", key: "textAlign", label: "Text alignment", options: [
      { value: "left", label: "Left" },
      { value: "center", label: "Center" },
    ] },
    { kind: "select", key: "width", label: "Width", options: [
      { value: "narrow", label: "Narrow (reading width)" },
      { value: "normal", label: "Normal" },
      { value: "wide", label: "Wide" },
    ] },
    { kind: "select", key: "padding", label: "Space inside", options: [
      { value: "s", label: "Small" },
      { value: "m", label: "Medium" },
      { value: "l", label: "Large" },
    ] },
    { kind: "select", key: "background", label: "Background", options: [{ value: "none", label: "None" }, ...BACKGROUND_OPTIONS] },
    { kind: "toggle", key: "card", label: "Show as a rounded panel", help: "The background becomes a card inside the page width." },
  ],
  defaults: {
    columns: [
      column([block("heading", { text: "A new way to *grow together*." }), block("text"), block("button")]),
      column([block("image")]),
    ],
    layout: "equal",
    valign: "center",
    textAlign: "left",
    width: "wide",
    padding: "m",
    background: "none",
    card: false,
  },
});

/** Ready-made starting points for "Build your own", offered in the Add section picker. */
export const BLOCK_PRESETS: readonly { label: string; description: string; icon: string; settings: FieldValues }[] = [
  {
    label: "Text and image",
    description: "Heading, text and a button next to a photo.",
    icon: "view_agenda",
    settings: blocksSection.defaults,
  },
  {
    label: "Three features",
    description: "Three columns, each an icon with a title and text.",
    icon: "view_week",
    settings: {
      ...blocksSection.defaults,
      textAlign: "center",
      valign: "top",
      columns: [
        column([block("feature", { icon: "handshake", title: "Trust comes first" })]),
        column([block("feature", { icon: "psychology", tone: "secondary", title: "Learn together", text: "Training becomes a conversation where both ends of the leash take part." })]),
        column([block("feature", { icon: "all_inclusive", tone: "tertiary", title: "Bond through it all", text: "Every experience becomes a chance to strengthen your bond." })]),
      ],
    },
  },
  {
    label: "Call to action panel",
    description: "A centered heading, text and button on a colored panel.",
    icon: "campaign",
    settings: {
      ...blocksSection.defaults,
      textAlign: "center",
      width: "normal",
      background: "low",
      card: true,
      padding: "l",
      columns: [column([block("heading", { text: "Ready to *start*?" }), block("text", { body: "<p>Begin with Foundations and grow at your own pace.</p>" }), block("button")])],
    },
  },
  {
    label: "Video with text",
    description: "A YouTube video beside a heading and text.",
    icon: "smart_display",
    settings: {
      ...blocksSection.defaults,
      columns: [column([block("video")]), column([block("heading", { text: "Watch Rhythm & Roni" }), block("text"), block("button", { style: "link" })])],
    },
  },
  {
    label: "Simple text",
    description: "One column of text at reading width.",
    icon: "article",
    settings: { ...blocksSection.defaults, width: "narrow", columns: [column([block("heading", { size: "m" }), block("text")])] },
  },
];

export const BLOCK_SECTIONS = [blocksSection] as const;
