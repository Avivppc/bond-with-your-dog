import type { FieldDef, FieldValues } from "./fields";

/** Groups in the editor's "Add section" picker. */
export const SECTION_CATEGORIES = ["Intro", "Text and images", "Lists and steps", "Social proof", "Call to action", "Page text"] as const;
export type SectionCategory = (typeof SECTION_CATEGORIES)[number];

/**
 * One kind of section (like a Shopify theme section): its fields and starter content. Pure; the
 * component that draws it is registered separately in src/components/site/sections.
 */
export interface SectionDef {
  type: string;
  label: string;
  /** Material Symbols name for the editor list. */
  icon: string;
  category: SectionCategory;
  /** One line in the "Add section" picker. */
  description: string;
  fields: readonly FieldDef[];
  /** Starter content when the section is added, and fallbacks for missing values. */
  defaults: FieldValues;
}

export function defineSection<const T extends SectionDef>(def: T): T {
  return def;
}

/** Shared choices, so sections offer the same words for the same things. */
export const BACKGROUND_OPTIONS = [
  { value: "surface", label: "Page background" },
  { value: "low", label: "Light tint" },
  { value: "high", label: "Medium tint" },
  { value: "highest", label: "Strong tint" },
  { value: "white", label: "White" },
  { value: "primary", label: "Brand color" },
] as const;

export const ACCENT_OPTIONS = [
  { value: "primary", label: "Orange" },
  { value: "secondary", label: "Teal" },
  { value: "tertiary", label: "Yellow" },
] as const;

export const IMAGE_SIDE_OPTIONS = [
  { value: "left", label: "Image on the left" },
  { value: "right", label: "Image on the right" },
] as const;

/** Text fields that accept *highlight* say so in their help text. */
export const HIGHLIGHT_HELP = "Wrap words in *stars* to color them.";
