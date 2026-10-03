import type { SectionDef } from "./section-def";
import { HOME_SECTIONS } from "./sections/home";
import { STORY_SECTIONS } from "./sections/story";
import { JOURNEY_SECTIONS } from "./sections/journey";
import { TEXT_SECTIONS } from "./sections/text";

/** Every section type the website editor offers, by type. Pure (no components). */
const ALL: readonly SectionDef[] = [...HOME_SECTIONS, ...STORY_SECTIONS, ...JOURNEY_SECTIONS, ...TEXT_SECTIONS];

export const SECTION_DEFS: Readonly<Record<string, SectionDef>> = Object.fromEntries(ALL.map((d) => [d.type, d]));

export const SECTION_LIST: readonly SectionDef[] = ALL;
