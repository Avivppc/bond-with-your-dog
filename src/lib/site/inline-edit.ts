import type { FieldDef, FieldValue, FieldValues } from "./fields";

/**
 * Editing text right on the page: which texts in a section can be typed into, and how a typed
 * change goes back into the section's values. Pure; shared by the preview (finds the text on the
 * page) and the editor (applies the change).
 *
 * Paths: "heading", "cards.1.title", "columns.0.blocks.2.text". A paragraph of a multi-paragraph
 * field adds "#index": "text#1" is the second paragraph of "text".
 */

export interface EditableText {
  path: string;
  /** What the page shows (without *highlight* stars). */
  shown: string;
  /** The field allows *highlight*: the page wraps starred words in an accent span. */
  highlight: boolean;
}

const paragraphs = (text: string) => text.split(/\n\s*\n/).map((p) => p.trim());

export const stripStars = (text: string) => text.replace(/\*([^*]+)\*/g, "$1");

function collect(fields: readonly FieldDef[], values: FieldValues, prefix: string, out: EditableText[]): void {
  for (const f of fields) {
    const v = values[f.key];
    const path = prefix ? `${prefix}.${f.key}` : f.key;
    if (f.kind === "text" && typeof v === "string" && v.trim()) {
      out.push({ path, shown: stripStars(v).trim(), highlight: Boolean(f.highlight) });
    } else if (f.kind === "textarea" && typeof v === "string" && v.trim()) {
      const paras = paragraphs(v);
      if (paras.length === 1) out.push({ path, shown: paras[0], highlight: false });
      else paras.forEach((p, i) => p && out.push({ path: `${path}#${i}`, shown: p, highlight: false }));
    } else if (f.kind === "list" && Array.isArray(v)) {
      v.forEach((item, i) => collect(f.fields, item, `${path}.${i}`, out));
    } else if (f.kind === "blocks" && Array.isArray(v)) {
      v.forEach((item, i) => {
        const def = f.blockTypes.find((b) => b.type === item.type);
        if (def) collect(def.fields, item, `${path}.${i}`, out);
      });
    }
  }
}

/** Every text in a section that can be edited on the page. */
export function editableTexts(fields: readonly FieldDef[], values: FieldValues): EditableText[] {
  const out: EditableText[] = [];
  collect(fields, values, "", out);
  // A text shown twice can't be told apart on the page: leave those to the side panel.
  const counts = new Map<string, number>();
  out.forEach((e) => counts.set(e.shown, (counts.get(e.shown) ?? 0) + 1));
  return out.filter((e) => e.shown.length > 0 && counts.get(e.shown) === 1);
}

function setIn(values: FieldValues, keys: string[], value: string): FieldValues {
  const [key, ...rest] = keys;
  const current = values[key];
  if (rest.length === 0) return { ...values, [key]: value };
  if (!Array.isArray(current)) return values;
  const index = Number(rest[0]);
  if (!Number.isInteger(index) || !current[index]) return values;
  const updated = setIn(current[index], rest.slice(1), value);
  return { ...values, [key]: current.map((item, i) => (i === index ? updated : item)) as FieldValue };
}

/** The section's values with the text at `path` replaced (a "#n" path replaces one paragraph). */
export function applyTextEdit(values: FieldValues, path: string, text: string): FieldValues {
  const [fieldPath, para] = path.split("#");
  const keys = fieldPath.split(".");
  if (para === undefined) return setIn(values, keys, text);
  const current = keys.reduce<FieldValue | FieldValues | undefined>((v, k) => (Array.isArray(v) ? v[Number(k)] : v && typeof v === "object" ? (v as FieldValues)[k] : undefined), values);
  if (typeof current !== "string") return values;
  const paras = paragraphs(current);
  const i = Number(para);
  if (!Number.isInteger(i) || i < 0 || i >= paras.length) return values;
  return setIn(values, keys, paras.map((p, j) => (j === i ? text.trim() : p)).join("\n\n"));
}

/** The top-level field a path belongs to ("cards.1.title" → "cards"). */
export const topField = (path: string) => path.split(/[.#]/)[0];

export interface FieldTarget {
  path: string;
  /** Image src, or a button's text. */
  match: string;
  kind: "image" | "link";
}

function collectTargets(fields: readonly FieldDef[], values: FieldValues, prefix: string, out: FieldTarget[]): void {
  for (const f of fields) {
    const v = values[f.key];
    const path = prefix ? `${prefix}.${f.key}` : f.key;
    if (f.kind === "image" && v && typeof v === "object" && !Array.isArray(v) && "src" in v && v.src) out.push({ path, match: String(v.src), kind: "image" });
    else if (f.kind === "link" && v && typeof v === "object" && !Array.isArray(v) && "label" in v && String(v.label).trim()) out.push({ path, match: String(v.label).trim(), kind: "link" });
    else if (f.kind === "list" && Array.isArray(v)) v.forEach((item, i) => collectTargets(f.fields, item, `${path}.${i}`, out));
    else if (f.kind === "blocks" && Array.isArray(v)) {
      v.forEach((item, i) => {
        const def = f.blockTypes.find((b) => b.type === item.type);
        if (def) collectTargets(def.fields, item, `${path}.${i}`, out);
      });
    }
  }
}

/** Images and buttons in a section: clicking one on the page opens its field in the panel. */
export function fieldTargets(fields: readonly FieldDef[], values: FieldValues): FieldTarget[] {
  const out: FieldTarget[] = [];
  collectTargets(fields, values, "", out);
  return out;
}
