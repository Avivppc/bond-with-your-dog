import { z } from "zod";
import { isSafeImageSrc, valuesSchema, withDefaults, type FieldValues } from "./fields";
import type { SectionDef } from "./section-def";
import { DEFAULT_STYLE, readSectionStyle, sectionStyleSchema, type SectionStyle } from "./section-style";

/** A page as the editor saves it: an ordered list of sections. Pure. */

export interface SectionInstance {
  /** Stable id within the page (the editor and the preview use it to find the section). */
  id: string;
  type: string;
  hidden: boolean;
  settings: FieldValues;
  /** Background, spacing, visibility and anchor (the editor's Style tab). */
  style: SectionStyle;
}

export interface PageDoc {
  sections: SectionInstance[];
  /** Show the "Ask Bonded" chat button on this page. */
  assistant: boolean;
}

export interface PageSeo {
  /** Browser tab and search result title (empty = the page title). */
  title: string;
  description: string;
  /** Image for link previews (empty = the site default). */
  image: string;
}

export const MAX_SECTIONS = 40;
const SECTION_ID = /^[a-z0-9-]{1,40}$/;

export const seoSchema = z.object({
  title: z.string().trim().max(70, "The search title can be up to 70 characters."),
  description: z.string().trim().max(170, "The search description can be up to 170 characters."),
  image: z.string().trim().max(1000).refine(isSafeImageSrc, "The share image must be an https link or a site path."),
});

export const EMPTY_SEO: PageSeo = { title: "", description: "", image: "" };

export type ParsedDoc = { ok: true; doc: PageDoc } | { ok: false; error: string };

/**
 * Checks a page sent by the editor against the section types: known types, unique ids, and each
 * section's values against its fields (unknown keys dropped). The first problem is returned in words.
 */
export function parsePageDoc(raw: unknown, defs: Readonly<Record<string, SectionDef>>): ParsedDoc {
  const shape = z
    .object({
      sections: z
        .array(z.object({ id: z.string().regex(SECTION_ID), type: z.string(), hidden: z.boolean(), settings: z.unknown(), style: sectionStyleSchema.optional() }))
        .max(MAX_SECTIONS, `A page can have up to ${MAX_SECTIONS} sections.`),
      assistant: z.boolean(),
    })
    .safeParse(raw);
  if (!shape.success) return { ok: false, error: shape.error.issues[0]?.message ?? "The page couldn't be read." };
  const ids = new Set<string>();
  const sections: SectionInstance[] = [];
  for (const s of shape.data.sections) {
    const def = defs[s.type];
    if (!def) return { ok: false, error: `Unknown section type "${s.type}".` };
    if (ids.has(s.id)) return { ok: false, error: "Two sections share an id. Reload the editor." };
    ids.add(s.id);
    const values = valuesSchema(def.fields).safeParse(s.settings);
    if (!values.success) return { ok: false, error: `${def.label}: ${values.error.issues[0]?.message ?? "check its fields."}` };
    sections.push({ id: s.id, type: s.type, hidden: s.hidden, settings: values.data, style: s.style ?? DEFAULT_STYLE });
  }
  return { ok: true, doc: { sections, assistant: shape.data.assistant } };
}

/** For rendering: drops unknown types (from an older or newer version) and fills missing values. */
export function readPageDoc(raw: unknown, defs: Readonly<Record<string, SectionDef>>): PageDoc {
  const obj = raw && typeof raw === "object" ? (raw as { sections?: unknown; assistant?: unknown }) : {};
  const list = Array.isArray(obj.sections) ? obj.sections : [];
  const sections = list.flatMap((s: unknown): SectionInstance[] => {
    if (!s || typeof s !== "object") return [];
    const { id, type, hidden, settings, style } = s as Record<string, unknown>;
    const def = typeof type === "string" ? defs[type] : undefined;
    if (!def || typeof id !== "string") return [];
    return [{ id, type: def.type, hidden: hidden === true, settings: withDefaults(def.fields, def.defaults, settings), style: readSectionStyle(style) }];
  });
  return { sections, assistant: obj.assistant === true };
}

/** A fresh section with its starter content and an id not used on the page. */
export function newSection(def: SectionDef, taken: ReadonlySet<string>): SectionInstance {
  const base = def.type.replace(/_/g, "-");
  let n = 1;
  while (taken.has(`${base}-${n}`)) n++;
  return { id: `${base}-${n}`, type: def.type, hidden: false, settings: structuredClone(def.defaults), style: DEFAULT_STYLE };
}
