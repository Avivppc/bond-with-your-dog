import type { ComponentType } from "react";
import type { SectionProps } from "./types";
import { LegalText, PhotoHero, PillList, QuoteGrid, RichText } from "./text";

/** Components for the section types in src/lib/site/sections/text.ts, by type. */
export const TEXT_COMPONENTS: Record<string, ComponentType<SectionProps>> = {
  photo_hero: PhotoHero,
  pill_list: PillList,
  quote_grid: QuoteGrid,
  legal_text: LegalText,
  rich_text: RichText,
};
