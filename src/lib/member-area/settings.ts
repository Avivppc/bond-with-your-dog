import { z } from "zod";
import { isSafeHref, isSafeImageSrc } from "../site/fields";
import { DEFAULT_THEME, FONT_OPTIONS, mix, type FontName, type SiteTheme } from "../site/theme";
import { MEMBER_FOOT_NAV, MEMBER_NAV, MEMBER_TABS, type MemberNavItem } from "../../components/app/nav";

/**
 * Website → Member area: how the members' app looks (colors, fonts, corners, logo), what the home
 * screen shows and in which order, announcement banners, and the menu. Pure; the member layout
 * turns it into CSS variables and props.
 */

// ---------- Look ----------

export interface MemberColors {
  /** Page background. */
  canvas: string;
  /** Cards. */
  card: string;
  /** Soft panels. */
  tint: string;
  /** Text. */
  ink: string;
  /** Buttons and highlights (bright). */
  accent: string;
  /** Deep brand color (links, icons). */
  deep: string;
  /** Second color (the Ask Roni button, badges). */
  second: string;
  /** Third color (stars, small accents). */
  third: string;
}

export const MEMBER_COLOR_LABELS: Record<keyof MemberColors, { label: string; help: string }> = {
  canvas: { label: "Page background", help: "Behind everything." },
  card: { label: "Cards", help: "Lesson cards, panels and the menu." },
  tint: { label: "Soft panels", help: "Light boxes and empty states." },
  ink: { label: "Text", help: "Headings and body text." },
  accent: { label: "Brand color, bright", help: "Main buttons and progress bars." },
  deep: { label: "Brand color, deep", help: "Links, icons and the active menu item." },
  second: { label: "Second color", help: "The Ask Roni button and badges." },
  third: { label: "Third color", help: "Stars and small highlights." },
};

export const RADIUS_OPTIONS = [
  { value: "round", label: "Round (default)" },
  { value: "soft", label: "Softly rounded" },
  { value: "square", label: "Square" },
] as const;
export type MemberRadius = (typeof RADIUS_OPTIONS)[number]["value"];

export interface MemberLook {
  /** Take colors and fonts from Website → Theme. */
  followSite: boolean;
  colors: MemberColors;
  headingFont: FontName;
  bodyFont: FontName;
  radius: MemberRadius;
  logo: string;
}

// ---------- Home screen ----------

export const HOME_SECTIONS = [
  { key: "week", label: "This week and Roni", description: "The practice week and the card with Roni's latest video." },
  { key: "skills", label: "Dog's skills", description: "How each move is growing, from Learning to Performance-ready." },
  { key: "live", label: "Live Q&A and library", description: "The next live session and new moves in the library." },
] as const;
export type HomeSectionKey = (typeof HOME_SECTIONS)[number]["key"];

export interface MemberHome {
  /** Order and visibility of the sections under the welcome. */
  sections: { key: HomeSectionKey; visible: boolean }[];
  /** "Welcome back," for returning members. */
  welcomeBack: string;
  /** "Welcome to Bonded," for new members and members without a chapter yet. */
  welcomeNew: string;
  /** The text under the welcome when a member has no chapter yet. */
  noChapterText: string;
}

// ---------- Banners ----------

export const BANNER_TONES = [
  { value: "info", label: "Teal (news)" },
  { value: "promo", label: "Orange (offer)" },
  { value: "gold", label: "Yellow (event)" },
] as const;
export const BANNER_AUDIENCES = [
  { value: "all", label: "Every member" },
  { value: "with_chapter", label: "Members with a chapter" },
  { value: "without_chapter", label: "Members without a chapter yet" },
] as const;

export interface MemberBanner {
  id: string;
  text: string;
  link: { label: string; href: string };
  tone: (typeof BANNER_TONES)[number]["value"];
  audience: (typeof BANNER_AUDIENCES)[number]["value"];
  /** yyyy-mm-dd, shown from this day (empty = now). */
  starts: string;
  /** yyyy-mm-dd, last day shown (empty = until removed). */
  ends: string;
  /** Members can close it (then it stays closed on that device). */
  dismissible: boolean;
}

// ---------- Menu ----------

export interface MenuItem {
  /** A built-in page ("/home") or, for custom links, any address. */
  href: string;
  label: string;
  icon: string;
  visible: boolean;
  /** Added by staff (not a built-in page). */
  custom: boolean;
}

export interface MemberAreaSettings {
  look: MemberLook;
  home: MemberHome;
  banners: MemberBanner[];
  menu: MenuItem[];
}

export const DEFAULT_MEMBER_COLORS: MemberColors = {
  canvas: "#edf8ff",
  card: "#ffffff",
  tint: "#e4f3fc",
  ink: "#243036",
  accent: "#ff8f00",
  deep: "#8b4b00",
  second: "#0e666a",
  third: "#fdd400",
};

export const DEFAULT_MEMBER_AREA: MemberAreaSettings = {
  look: { followSite: true, colors: DEFAULT_MEMBER_COLORS, headingFont: "Plus Jakarta Sans", bodyFont: "Be Vietnam Pro", radius: "round", logo: "/app/img/logo.png" },
  home: {
    sections: HOME_SECTIONS.map((s) => ({ key: s.key, visible: true })),
    welcomeBack: "Welcome back,",
    welcomeNew: "Welcome to Bonded,",
    noChapterText: "Three chapters, one partnership: Foundations, Moves and Let's Dance. Choose where to begin and your first lesson will be waiting here.",
  },
  banners: [],
  menu: MEMBER_NAV.map((i) => ({ href: i.href, label: i.label, icon: i.icon, visible: true, custom: false })),
};

// ---------- Validation ----------

const hex = z.string().regex(/^#[0-9a-f]{6}$/i, "Colors are 6-digit hex codes like #8b4b00.");
const FONT_NAMES = FONT_OPTIONS.map((f) => f.value) as [FontName, ...FontName[]];
const DATE = /^(\d{4}-\d{2}-\d{2})?$/;
const BUILT_IN_HREFS = new Set(MEMBER_NAV.map((i) => i.href));

export const memberAreaSchema = z.object({
  look: z.object({
    followSite: z.boolean(),
    colors: z.object({ canvas: hex, card: hex, tint: hex, ink: hex, accent: hex, deep: hex, second: hex, third: hex }),
    headingFont: z.enum(FONT_NAMES),
    bodyFont: z.enum(FONT_NAMES),
    radius: z.enum(["round", "soft", "square"]),
    logo: z.string().trim().max(1000).refine((v) => v !== "" && isSafeImageSrc(v), "Choose a logo image."),
  }),
  home: z.object({
    sections: z
      .array(z.object({ key: z.enum(["week", "skills", "live"]), visible: z.boolean() }))
      .refine((list) => new Set(list.map((s) => s.key)).size === list.length && list.length === HOME_SECTIONS.length, "The home sections got mixed up. Reload the editor."),
    welcomeBack: z.string().trim().min(1, "Write the welcome for returning members.").max(60),
    welcomeNew: z.string().trim().min(1, "Write the welcome for new members.").max(60),
    noChapterText: z.string().trim().max(400),
  }),
  banners: z
    .array(
      z.object({
        id: z.string().regex(/^[a-z0-9-]{1,40}$/),
        text: z.string().trim().min(1, "A banner needs some text.").max(240, "Banner text can be up to 240 characters."),
        link: z.object({
          label: z.string().trim().max(40),
          href: z.string().trim().max(500).refine(isSafeHref, "Banner links start with /, https:// or mailto:."),
        }),
        tone: z.enum(["info", "promo", "gold"]),
        audience: z.enum(["all", "with_chapter", "without_chapter"]),
        starts: z.string().regex(DATE, "Dates look like 2026-10-15."),
        ends: z.string().regex(DATE, "Dates look like 2026-10-15."),
        dismissible: z.boolean(),
      }),
    )
    .max(10, "Up to 10 banners."),
  menu: z
    .array(
      z.object({
        href: z.string().trim().min(1).max(500).refine(isSafeHref, "Menu links start with /, https:// or mailto:."),
        label: z.string().trim().min(1, "Every menu item needs a name.").max(30, "Menu names can be up to 30 characters."),
        icon: z.string().regex(/^[a-z0-9_]{1,40}$/, "Icons are Material Symbols names like pets."),
        visible: z.boolean(),
        custom: z.boolean(),
      }),
    )
    .max(16, "The menu fits up to 16 items.")
    .refine((items) => items.filter((i) => !i.custom).every((i) => BUILT_IN_HREFS.has(i.href)), "A built-in menu item changed its address. Reload the editor.")
    .refine((items) => items.some((i) => i.href === "/home" && i.visible), "Home always stays in the menu."),
});

/** Saved settings → complete ones; missing built-in menu items and home sections come back. */
export function readMemberArea(raw: unknown): MemberAreaSettings {
  const r = raw && typeof raw === "object" ? (raw as Partial<MemberAreaSettings>) : {};
  const merged = {
    look: { ...DEFAULT_MEMBER_AREA.look, ...(r.look ?? {}), colors: { ...DEFAULT_MEMBER_COLORS, ...(r.look?.colors ?? {}) } },
    home: { ...DEFAULT_MEMBER_AREA.home, ...(r.home ?? {}) },
    banners: Array.isArray(r.banners) ? r.banners : [],
    menu: Array.isArray(r.menu) ? r.menu : DEFAULT_MEMBER_AREA.menu,
  };
  const parsed = memberAreaSchema.safeParse(merged);
  const value = parsed.success ? parsed.data : DEFAULT_MEMBER_AREA;
  return { ...value, home: { ...value.home, sections: completeSections(value.home.sections) }, menu: completeMenu(value.menu) };
}

function completeSections(saved: MemberHome["sections"]): MemberHome["sections"] {
  const missing = HOME_SECTIONS.filter((s) => !saved.some((x) => x.key === s.key)).map((s) => ({ key: s.key, visible: true }));
  return [...saved, ...missing];
}

/** Built-in pages added to the app after the menu was saved show up at the end. */
function completeMenu(saved: MenuItem[]): MenuItem[] {
  const missing = DEFAULT_MEMBER_AREA.menu.filter((d) => !saved.some((s) => !s.custom && s.href === d.href));
  return [...saved, ...missing];
}

// ---------- Applying it ----------

/** The member colors: the site theme's when following it, else the chosen ones. */
export function effectiveColors(look: MemberLook, site: SiteTheme): MemberColors {
  if (!look.followSite) return look.colors;
  const c = site.colors;
  // An untouched site theme keeps the member app's own hand-tuned colors.
  const untouched = (Object.keys(c) as (keyof typeof c)[]).every((k) => c[k].toLowerCase() === DEFAULT_THEME.colors[k].toLowerCase());
  if (untouched) return DEFAULT_MEMBER_COLORS;
  return { canvas: c.background, card: "#ffffff", tint: mix(c.background, c.text, 0.05), ink: c.text, accent: c.primaryLight, deep: c.primary, second: c.secondary, third: c.tertiaryLight };
}

const RADII: Record<MemberRadius, [number, number, number]> = { round: [28, 20, 14], soft: [16, 12, 8], square: [6, 4, 2] };

const sameColors = (a: MemberColors, b: MemberColors) => (Object.keys(a) as (keyof MemberColors)[]).every((k) => a[k].toLowerCase() === b[k].toLowerCase());

function fontStack(name: FontName): string {
  const serif = name === "Lora" || name === "Playfair Display" || name === "Fraunces";
  return `"${name}", ${serif ? "serif" : "sans-serif"}`;
}

/**
 * CSS for `.member-app` (the member layout's root). Only what differs from the built-in design is
 * written; `all` writes everything (the editor's preview must override a live customization).
 */
export function memberCss(look: MemberLook, site: SiteTheme, { all = false }: { all?: boolean } = {}): string {
  const colors = effectiveColors(look, site);
  const vars: [string, string][] = [];
  if (all || !sameColors(colors, DEFAULT_MEMBER_COLORS)) {
    vars.push(
      ["--canvas", colors.canvas],
      ["--card", colors.card],
      ["--tint", colors.tint],
      ["--tint-2", mix(colors.tint, colors.ink, 0.05)],
      ["--ink", colors.ink],
      ["--ink-2", mix(colors.ink, colors.canvas, 0.25)],
      ["--ink-3", mix(colors.ink, colors.canvas, 0.35)],
      ["--orange", colors.accent],
      ["--orange-soft", mix(colors.accent, "#ffffff", 0.88)],
      ["--cognac", colors.deep],
      ["--cognac-2", mix(colors.deep, colors.accent, 0.35)],
      ["--teal", colors.second],
      ["--teal-soft", mix(colors.second, "#ffffff", 0.86)],
      ["--gold", colors.third],
      ["--gold-ink", mix(colors.third, "#000000", 0.57)],
      ["--gold-soft", mix(colors.third, "#ffffff", 0.8)],
    );
  }
  const heading = look.followSite ? site.headingFont : look.headingFont;
  const body = look.followSite ? site.bodyFont : look.bodyFont;
  if (all || heading !== "Plus Jakarta Sans") vars.push(["--display", fontStack(heading)]);
  if (all || body !== "Be Vietnam Pro") vars.push(["--body", fontStack(body)]);
  if (all || look.radius !== "round") {
    const [lg, md, sm] = RADII[look.radius];
    vars.push(["--r-lg", `${lg}px`], ["--r-md", `${md}px`], ["--r-sm", `${sm}px`]);
  }
  return vars.length === 0 ? "" : `.member-app.member-app{${vars.map(([k, v]) => `${k}:${v};`).join("")}}`;
}

/** Google Fonts for member fonts next/font doesn't load (by name, so the CSS above can use them). */
export function memberFontsHref(look: MemberLook, site: SiteTheme, { all = false }: { all?: boolean } = {}): string {
  const heading = look.followSite ? site.headingFont : look.headingFont;
  const body = look.followSite ? site.bodyFont : look.bodyFont;
  const named = [all || heading !== "Plus Jakarta Sans" ? heading : null, all || body !== "Be Vietnam Pro" ? body : null].filter((f): f is FontName => f !== null);
  const fonts = [...new Set(named)];
  if (fonts.length === 0) return "";
  return `https://fonts.googleapis.com/css2?${fonts.map((f) => `family=${f.replace(/ /g, "+")}:wght@300;400;500;600;700;800`).join("&")}&display=swap`;
}

/** Banners for this member today (dates are compared as yyyy-mm-dd in the academy's day). */
export function activeBanners(banners: MemberBanner[], today: string, hasChapter: boolean): MemberBanner[] {
  return banners.filter((b) => {
    if (b.starts && today < b.starts) return false;
    if (b.ends && today > b.ends) return false;
    if (b.audience === "with_chapter" && !hasChapter) return false;
    if (b.audience === "without_chapter" && hasChapter) return false;
    return true;
  });
}

/** The menu as the app draws it: visible items, with built-ins keeping their highlight rules. */
export function memberNav(menu: MenuItem[]): { main: MemberNavItem[]; tabs: MemberNavItem[]; foot: MemberNavItem[] } {
  const builtIn = new Map(MEMBER_NAV.map((i) => [i.href, i]));
  const main = menu
    .filter((i) => i.visible)
    .map((i): MemberNavItem => {
      const base = builtIn.get(i.href);
      return { href: i.href, label: i.label, icon: i.icon, match: base && !i.custom ? base.match : [i.href] };
    });
  // The phone tab bar keeps its five places when they're shown, in the menu's order.
  const tabs = main.filter((i) => MEMBER_TABS.includes(i.href)).slice(0, 5);
  return { main, tabs, foot: MEMBER_FOOT_NAV };
}
