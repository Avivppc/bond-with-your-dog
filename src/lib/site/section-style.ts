import { z } from "zod";

/**
 * Design settings every section has (the editor's "Style" tab): background behind the section,
 * extra space above and below, which screens show it, and an anchor name for links. Pure.
 */

export const SPACE_OPTIONS = [
  { value: "none", label: "None" },
  { value: "s", label: "Small" },
  { value: "m", label: "Medium" },
  { value: "l", label: "Large" },
  { value: "xl", label: "Extra large" },
] as const;
export type Space = (typeof SPACE_OPTIONS)[number]["value"];

export const STYLE_BACKGROUNDS = [
  { value: "none", label: "None (the section's own)" },
  { value: "surface", label: "Page background" },
  { value: "low", label: "Light tint" },
  { value: "high", label: "Medium tint" },
  { value: "white", label: "White" },
  { value: "primary-soft", label: "Soft brand color" },
  { value: "secondary-soft", label: "Soft second color" },
  { value: "tertiary-soft", label: "Soft third color" },
  { value: "custom", label: "Custom color" },
] as const;
export type StyleBackground = (typeof STYLE_BACKGROUNDS)[number]["value"];

export const VISIBILITY_OPTIONS = [
  { value: "all", label: "Phones and computers" },
  { value: "desktop", label: "Computers only" },
  { value: "mobile", label: "Phones only" },
] as const;
export type Visibility = (typeof VISIBILITY_OPTIONS)[number]["value"];

export interface SectionStyle {
  background: StyleBackground;
  /** #rrggbb when background is "custom". */
  customColor: string;
  spaceTop: Space;
  spaceBottom: Space;
  visibility: Visibility;
  /** Links to "#anchor" jump here. */
  anchor: string;
}

export const DEFAULT_STYLE: SectionStyle = { background: "none", customColor: "#ffffff", spaceTop: "none", spaceBottom: "none", visibility: "all", anchor: "" };

const values = <T extends readonly { value: string }[]>(opts: T) => opts.map((o) => o.value) as [T[number]["value"], ...T[number]["value"][]];

export const sectionStyleSchema = z.object({
  background: z.enum(values(STYLE_BACKGROUNDS)),
  customColor: z.string().regex(/^#[0-9a-f]{6}$/i, "Custom colors are 6-digit hex codes like #fdf1dc."),
  spaceTop: z.enum(values(SPACE_OPTIONS)),
  spaceBottom: z.enum(values(SPACE_OPTIONS)),
  visibility: z.enum(values(VISIBILITY_OPTIONS)),
  anchor: z.string().trim().max(40).regex(/^[a-z0-9-]*$/, "Anchor names use lowercase letters, numbers and dashes."),
});

/** Saved style → a full one (missing or broken parts fall back to the defaults). */
export function readSectionStyle(raw: unknown): SectionStyle {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const merged = { ...DEFAULT_STYLE, ...r };
  const parsed = sectionStyleSchema.safeParse(merged);
  if (parsed.success) return parsed.data;
  // Keep the valid parts.
  return Object.fromEntries(
    (Object.keys(DEFAULT_STYLE) as (keyof SectionStyle)[]).map((k) => {
      const one = sectionStyleSchema.shape[k].safeParse(r[k]);
      return [k, one.success ? one.data : DEFAULT_STYLE[k]];
    }),
  ) as unknown as SectionStyle;
}

export const isDefaultStyle = (s: SectionStyle) => (Object.keys(DEFAULT_STYLE) as (keyof SectionStyle)[]).every((k) => s[k] === DEFAULT_STYLE[k]);

const SPACE_TOP: Record<Space, string> = { none: "", s: "pt-6", m: "pt-12", l: "pt-20", xl: "pt-32" };
const SPACE_BOTTOM: Record<Space, string> = { none: "", s: "pb-6", m: "pb-12", l: "pb-20", xl: "pb-32" };
const BACKGROUND: Record<StyleBackground, string> = {
  none: "",
  surface: "bg-surface",
  low: "bg-surface-container-low",
  high: "bg-surface-container-high",
  white: "bg-surface-container-lowest",
  "primary-soft": "bg-primary-container/15",
  "secondary-soft": "bg-secondary-container/40",
  "tertiary-soft": "bg-tertiary-container/25",
  custom: "",
};
const VISIBILITY: Record<Visibility, string> = { all: "", desktop: "max-md:hidden", mobile: "md:hidden" };

/** Classes and inline style for the wrapper around a section. */
export function styleWrapper(s: SectionStyle): { className: string; style?: { backgroundColor: string } } {
  const className = [BACKGROUND[s.background], SPACE_TOP[s.spaceTop], SPACE_BOTTOM[s.spaceBottom], VISIBILITY[s.visibility], s.anchor ? "scroll-mt-24" : ""].filter(Boolean).join(" ");
  return s.background === "custom" ? { className, style: { backgroundColor: s.customColor } } : { className };
}
