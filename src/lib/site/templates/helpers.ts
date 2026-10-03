import type { FieldValues } from "../fields";
import type { PageDoc, SectionInstance } from "../page-doc";
import type { SectionDef } from "../section-def";

/** A section for a built-in page template: the type's defaults, optionally changed. */
export function section(def: SectionDef, id: string, overrides: FieldValues = {}): SectionInstance {
  return { id, type: def.type, hidden: false, settings: { ...structuredClone(def.defaults), ...overrides } };
}

export function page(sections: SectionInstance[], assistant = false): PageDoc {
  return { sections, assistant };
}
