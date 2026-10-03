import type { ComponentType } from "react";
import type { SectionProps } from "./types";
import { StoryCta, StoryHero, StoryImageText, StoryIntro, StoryMediaPair } from "./story";

/** Components for the section types in src/lib/site/sections/story.ts, by type. */
export const STORY_COMPONENTS: Record<string, ComponentType<SectionProps>> = {
  story_hero: StoryHero,
  story_intro: StoryIntro,
  story_image_text: StoryImageText,
  story_media_pair: StoryMediaPair,
  story_cta: StoryCta,
};
