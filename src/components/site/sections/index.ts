import type { ComponentType } from "react";
import type { SectionProps } from "./types";
import { HOME_COMPONENTS } from "./home-index";
import { STORY_COMPONENTS } from "./story-index";
import { JOURNEY_COMPONENTS } from "./journey-index";
import { TEXT_COMPONENTS } from "./text-index";

/** Every section type's component, by type (the definitions live in src/lib/site/registry.ts). */
export const SECTION_COMPONENTS: Readonly<Record<string, ComponentType<SectionProps>>> = {
  ...HOME_COMPONENTS,
  ...STORY_COMPONENTS,
  ...JOURNEY_COMPONENTS,
  ...TEXT_COMPONENTS,
};
