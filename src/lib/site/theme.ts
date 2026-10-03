import { z } from "zod";
import { isSafeHref, isSafeImageSrc } from "./fields";

/**
 * Website → Theme: brand colors, fonts, the logo, and the header and footer links. Pure; the site
 * turns it into CSS variables that override the Tailwind theme tokens (src/app/globals.css).
 */

export const FONT_OPTIONS = [
  { value: "Plus Jakarta Sans", label: "Plus Jakarta Sans" },
  { value: "Be Vietnam Pro", label: "Be Vietnam Pro" },
  { value: "Poppins", label: "Poppins" },
  { value: "Montserrat", label: "Montserrat" },
  { value: "Nunito", label: "Nunito" },
  { value: "DM Sans", label: "DM Sans" },
  { value: "Inter", label: "Inter" },
  { value: "Lora", label: "Lora (serif)" },
  { value: "Playfair Display", label: "Playfair Display (serif)" },
  { value: "Fraunces", label: "Fraunces (serif)" },
] as const;

export type FontName = (typeof FONT_OPTIONS)[number]["value"];
const FONT_NAMES = FONT_OPTIONS.map((f) => f.value) as [FontName, ...FontName[]];

/** Fonts the site already loads with next/font; choosing them needs no extra download. */
export const BUILT_IN_FONTS: readonly FontName[] = ["Plus Jakarta Sans", "Be Vietnam Pro"];

export interface ThemeColors {
  /** Buttons, links and highlights (dark enough for white text). */
  primary: string;
  /** The bright version of the brand color (gradients, badges). */
  primaryLight: string;
  secondary: string;
  secondaryLight: string;
  tertiary: string;
  tertiaryLight: string;
  /** Page background. */
  background: string;
  /** Main text. */
  text: string;
}

export interface NavLink {
  label: string;
  href: string;
}

export interface SiteTheme {
  colors: ThemeColors;
  headingFont: FontName;
  bodyFont: FontName;
  logo: string;
  header: { links: NavLink[]; button: NavLink };
  footer: { tagline: string; links: NavLink[] };
}

export const COLOR_LABELS: Record<keyof ThemeColors, { label: string; help: string }> = {
  primary: { label: "Brand color", help: "Buttons, links and highlighted words. Keep it dark enough for white text." },
  primaryLight: { label: "Brand color, bright", help: "Gradients and badges." },
  secondary: { label: "Second color", help: "Accents such as teal headings." },
  secondaryLight: { label: "Second color, light", help: "Soft panels and step circles." },
  tertiary: { label: "Third color", help: "Small accents." },
  tertiaryLight: { label: "Third color, light", help: "Badges and highlights." },
  background: { label: "Page background", help: "The light page color; tints are made from it." },
  text: { label: "Text", help: "Headings and body text." },
};

export const DEFAULT_THEME: SiteTheme = {
  colors: {
    primary: "#8b4b00",
    primaryLight: "#ff8f00",
    secondary: "#0e666a",
    secondaryLight: "#a6eff3",
    tertiary: "#6d5a00",
    tertiaryLight: "#fdd400",
    background: "#edf8ff",
    text: "#243036",
  },
  headingFont: "Plus Jakarta Sans",
  bodyFont: "Be Vietnam Pro",
  logo: "/images/logo.png",
  header: {
    links: [
      { href: "/courses", label: "Bonded Journey" },
      { href: "/stories", label: "Stories" },
      { href: "/about", label: "About Roni" },
      { href: "/quiz", label: "Find Your Journey" },
    ],
    button: { href: "/signup", label: "Build Your Bond" },
  },
  footer: {
    tagline: "Learn your dog's secret language. A step-by-step journey from trust and communication to your first dance together, created by Roni Sagi.",
    links: [
      { href: "/courses", label: "Bonded Journey" },
      { href: "/quiz", label: "Find Your Journey" },
      { href: "/stories", label: "Stories" },
      { href: "/about", label: "About Roni" },
    ],
  },
};

const HEX = /^#[0-9a-f]{6}$/i;
const hex = z.string().regex(HEX, "Colors are 6-digit hex codes like #8b4b00.");
const navLink = z.object({
  label: z.string().trim().min(1, "Every link needs text.").max(40),
  href: z.string().trim().min(1, "Every link needs an address.").max(500).refine(isSafeHref, "Links start with /, https:// or mailto:."),
});

export const themeSchema = z.object({
  colors: z.object({
    primary: hex,
    primaryLight: hex,
    secondary: hex,
    secondaryLight: hex,
    tertiary: hex,
    tertiaryLight: hex,
    background: hex,
    text: hex,
  }),
  headingFont: z.enum(FONT_NAMES),
  bodyFont: z.enum(FONT_NAMES),
  logo: z.string().trim().max(1000).refine((v) => v !== "" && isSafeImageSrc(v), "Choose a logo image."),
  header: z.object({ links: z.array(navLink).max(6, "The header fits up to 6 links."), button: navLink }),
  footer: z.object({ tagline: z.string().trim().max(400), links: z.array(navLink).max(8, "The footer fits up to 8 links.") }),
});

/** Saved theme JSON → a full theme (anything missing or broken falls back to the default). */
export function readTheme(raw: unknown): SiteTheme {
  const r = raw && typeof raw === "object" ? (raw as Partial<SiteTheme>) : {};
  const merged = {
    ...DEFAULT_THEME,
    ...r,
    colors: { ...DEFAULT_THEME.colors, ...(r.colors ?? {}) },
    header: { ...DEFAULT_THEME.header, ...(r.header ?? {}) },
    footer: { ...DEFAULT_THEME.footer, ...(r.footer ?? {}) },
  };
  const parsed = themeSchema.safeParse(merged);
  return parsed.success ? parsed.data : DEFAULT_THEME;
}

// ---------- Colors → CSS variables ----------

type Rgb = [number, number, number];

function toRgb(h: string): Rgb {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: Rgb): string {
  return `#${[r, g, b].map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, "0")).join("")}`;
}

/** Blend a color toward another (amount 0 = a, 1 = b). */
export function mix(a: string, b: string, amount: number): string {
  const x = toRgb(a);
  const y = toRgb(b);
  return toHex([0, 1, 2].map((i) => x[i] + (y[i] - x[i]) * amount) as Rgb);
}

/** WCAG relative luminance (0 black – 1 white). */
export function luminance(h: string): number {
  const [r, g, b] = toRgb(h).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Readable text on a color: a near-white tint of it, or a very dark shade of it. */
function onColor(c: string): string {
  return luminance(c) > 0.35 ? mix(c, "#000000", 0.72) : mix(c, "#ffffff", 0.92);
}

/** Every theme token the site's classes use, computed from the eight chosen colors. */
export function themeTokens(colors: ThemeColors): Record<string, string> {
  const { primary, primaryLight, secondary, secondaryLight, tertiary, tertiaryLight, background, text } = colors;
  const tint = (amount: number) => mix(background, mix(background, text, 0.5), amount);
  return {
    "--color-background": background,
    "--color-on-background": text,
    "--color-surface": background,
    "--color-surface-bright": background,
    "--color-surface-dim": tint(0.35),
    "--color-surface-container-lowest": "#ffffff",
    "--color-surface-container-low": tint(0.05),
    "--color-surface-container": tint(0.1),
    "--color-surface-container-high": tint(0.13),
    "--color-surface-container-highest": tint(0.17),
    "--color-surface-variant": tint(0.17),
    "--color-on-surface": text,
    "--color-on-surface-variant": mix(text, background, 0.25),
    "--color-outline": mix(text, background, 0.4),
    "--color-outline-variant": mix(text, background, 0.6),
    "--color-surface-tint": primary,
    "--color-primary": primary,
    "--color-primary-dim": mix(primary, "#000000", 0.12),
    "--color-primary-container": primaryLight,
    "--color-primary-fixed": primaryLight,
    "--color-primary-fixed-dim": mix(primaryLight, "#000000", 0.08),
    "--color-on-primary": onColor(primary),
    "--color-on-primary-container": onColor(primaryLight),
    "--color-secondary": secondary,
    "--color-secondary-dim": mix(secondary, "#000000", 0.12),
    "--color-secondary-container": secondaryLight,
    "--color-secondary-fixed": secondaryLight,
    "--color-secondary-fixed-dim": mix(secondaryLight, "#000000", 0.06),
    "--color-on-secondary": onColor(secondary),
    "--color-on-secondary-container": mix(secondary, "#000000", 0.1),
    "--color-tertiary": tertiary,
    "--color-tertiary-dim": mix(tertiary, "#000000", 0.12),
    "--color-tertiary-container": tertiaryLight,
    "--color-tertiary-fixed": tertiaryLight,
    "--color-tertiary-fixed-dim": mix(tertiaryLight, "#000000", 0.06),
    "--color-on-tertiary": onColor(tertiary),
    "--color-on-tertiary-container": mix(tertiary, "#000000", 0.2),
  };
}

const sameColors = (a: ThemeColors, b: ThemeColors) => (Object.keys(a) as (keyof ThemeColors)[]).every((k) => a[k].toLowerCase() === b[k].toLowerCase());

/** The hand-tuned values in src/app/globals.css, used when the colors are the defaults. */
const DESIGN_TOKENS: Record<string, string> = {
  "--color-background": "#edf8ff", "--color-on-background": "#243036", "--color-surface": "#edf8ff", "--color-surface-bright": "#edf8ff",
  "--color-surface-dim": "#c3d7e3", "--color-surface-container-lowest": "#ffffff", "--color-surface-container-low": "#e4f3fc",
  "--color-surface-container": "#dbebf4", "--color-surface-container-high": "#d4e5ef", "--color-surface-container-highest": "#cde0ea",
  "--color-surface-variant": "#cde0ea", "--color-surface-tint": "#8b4b00", "--color-on-surface": "#243036", "--color-on-surface-variant": "#515d64",
  "--color-outline": "#6c7980", "--color-outline-variant": "#a2afb6",
  "--color-primary": "#8b4b00", "--color-primary-dim": "#7a4100", "--color-primary-container": "#ff8f00", "--color-primary-fixed": "#ff8f00",
  "--color-primary-fixed-dim": "#eb8300", "--color-on-primary": "#fff0e6", "--color-on-primary-container": "#462300",
  "--color-secondary": "#0e666a", "--color-secondary-dim": "#00595d", "--color-secondary-container": "#a6eff3", "--color-secondary-fixed": "#a6eff3",
  "--color-secondary-fixed-dim": "#98e1e5", "--color-on-secondary": "#c8fcff", "--color-on-secondary-container": "#005b5f",
  "--color-tertiary": "#6d5a00", "--color-tertiary-dim": "#5f4e00", "--color-tertiary-container": "#fdd400", "--color-tertiary-fixed": "#fdd400",
  "--color-tertiary-fixed-dim": "#edc600", "--color-on-tertiary": "#fff2ce", "--color-on-tertiary-container": "#594a00",
};

function fontStack(name: FontName): string {
  const serif = name === "Lora" || name === "Playfair Display" || name === "Fraunces";
  return `"${name}", ${serif ? "serif" : "sans-serif"}`;
}

/**
 * Only colors that differ from the built-in design are written, so an unchanged theme adds nothing.
 * `all` writes every token (the editor's preview must win over the live theme, even when the draft
 * goes back to the defaults).
 */
export function themeCss(theme: SiteTheme, { all = false }: { all?: boolean } = {}): string {
  const changed = (k: string) => all || tokenSources(k).some((c) => theme.colors[c] !== DEFAULT_THEME.colors[c]);
  const changedColors = Object.entries(all && sameColors(theme.colors, DEFAULT_THEME.colors) ? DESIGN_TOKENS : themeTokens(theme.colors)).filter(([k]) => changed(k));
  const fonts: [string, string][] = [];
  if (all || theme.headingFont !== DEFAULT_THEME.headingFont) fonts.push(["--font-headline", fontStack(theme.headingFont)], ["--font-display", fontStack(theme.headingFont)]);
  if (all || theme.bodyFont !== DEFAULT_THEME.bodyFont) fonts.push(["--font-body", fontStack(theme.bodyFont)], ["--font-label", fontStack(theme.bodyFont)]);
  const vars = [...changedColors, ...fonts];
  if (vars.length === 0) return "";
  const body = vars.map(([k, v]) => `${k}:${v};`).join("");
  const gradient = all || theme.colors.primary !== DEFAULT_THEME.colors.primary || theme.colors.primaryLight !== DEFAULT_THEME.colors.primaryLight;
  // :root:root beats next/font's class on <html>, which also sets --font-*.
  return `:root:root{${body}}${all || theme.colors.background !== DEFAULT_THEME.colors.background || theme.colors.text !== DEFAULT_THEME.colors.text ? `body{background-color:${theme.colors.background};color:${theme.colors.text}}` : ""}${gradient ? `.kinetic-gradient{background:linear-gradient(135deg,${theme.colors.primary} 0%,${theme.colors.primaryLight} 100%)}` : ""}`;
}

/**
 * Which chosen colors a token is made from. A token is only written when one of them changed, so
 * everything else keeps the hand-tuned design values from globals.css.
 */
function tokenSources(token: string): (keyof ThemeColors)[] {
  if (token.includes("primary") || token.includes("surface-tint")) return ["primary", "primaryLight"];
  if (token.includes("secondary")) return ["secondary", "secondaryLight"];
  if (token.includes("tertiary")) return ["tertiary", "tertiaryLight"];
  return ["background", "text"];
}

/** Google Fonts stylesheet for chosen fonts the site doesn't already load ("" when none). */
export function themeFontsHref(theme: SiteTheme, { all = false }: { all?: boolean } = {}): string {
  // With `all` (the preview), the built-in fonts load by name too, since themeCss then names them.
  const extra = [...new Set([theme.headingFont, theme.bodyFont])].filter((f) => all || !BUILT_IN_FONTS.includes(f));
  if (extra.length === 0) return "";
  const families = extra.map((f) => `family=${f.replace(/ /g, "+")}:wght@300;400;500;600;700;800`).join("&");
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}
