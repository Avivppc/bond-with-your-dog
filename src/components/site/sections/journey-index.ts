import type { ComponentType } from "react";
import type { SectionProps } from "./types";
import { ChapterStage, IconCards, IconSteps, JourneyHero, SimpleCta, SplitCta } from "./journey";

/** Components for the section types in src/lib/site/sections/journey.ts, by type. */
export const JOURNEY_COMPONENTS: Record<string, ComponentType<SectionProps>> = {
  journey_hero: JourneyHero,
  icon_steps: IconSteps,
  chapter_stage: ChapterStage,
  icon_cards: IconCards,
  split_cta: SplitCta,
  simple_cta: SimpleCta,
};
