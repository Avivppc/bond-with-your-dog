import type { FieldValues } from "@/lib/site/fields";

/** What every website section component receives. */
export interface SectionProps {
  /** Values for the section's fields (already merged over its defaults). */
  settings: FieldValues;
  /** The section's id on the page; use it to make element ids unique. */
  id: string;
}
