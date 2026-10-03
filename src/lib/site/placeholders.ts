import type { FieldValue, FieldValues } from "./fields";
import type { PageDoc } from "./page-doc";

/**
 * Button links may use {{contact_email}} (e.g. "mailto:{{contact_email}}?subject=…"), so they follow
 * Settings → General. Filled in just before a page renders. Pure.
 */
function fillValue(value: FieldValue, email: string): FieldValue {
  if (Array.isArray(value)) return value.map((item) => fillValues(item, email));
  if (value && typeof value === "object" && "href" in value && typeof value.href === "string") {
    return { ...value, href: value.href.replaceAll("{{contact_email}}", encodeURIComponent(email).replace(/%40/g, "@")) };
  }
  return value;
}

function fillValues(values: FieldValues, email: string): FieldValues {
  return Object.fromEntries(Object.entries(values).map(([k, v]) => [k, fillValue(v, email)]));
}

export function fillLinkPlaceholders(doc: PageDoc, contactEmail: string): PageDoc {
  return { ...doc, sections: doc.sections.map((s) => ({ ...s, settings: fillValues(s.settings, contactEmail) })) };
}
