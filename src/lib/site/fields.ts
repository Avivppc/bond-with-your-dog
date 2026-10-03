import { z } from "zod";

/**
 * The website editor's field types. A section type lists its fields; the editor draws a control
 * per field, the server validates with the zod schema built here, and the section component reads
 * the values. Pure: shared by the browser and the server.
 */

export interface ImageValue {
  src: string;
  alt: string;
}

export interface LinkValue {
  label: string;
  href: string;
}

interface Base {
  key: string;
  label: string;
  help?: string;
}

export type FieldDef =
  | (Base & { kind: "text"; max?: number; placeholder?: string; /** Allows *highlight* markup. */ highlight?: boolean })
  | (Base & { kind: "textarea"; max?: number; rows?: number; placeholder?: string })
  | (Base & { kind: "richtext"; max?: number })
  | (Base & { kind: "image" })
  | (Base & { kind: "link"; /** The button can be left empty to hide it. */ optional?: boolean })
  | (Base & { kind: "select"; options: readonly { value: string; label: string }[] })
  | (Base & { kind: "toggle" })
  | (Base & { kind: "youtube" })
  | (Base & { kind: "icon" })
  | (Base & { kind: "list"; itemLabel: string; fields: readonly FieldDef[]; max: number; min?: number; /** Field shown as each item's title in the editor. */ titleKey?: string });

export type FieldValue = string | boolean | ImageValue | LinkValue | FieldValues[];
export type FieldValues = { [key: string]: FieldValue };

const MAX_TEXT = 300;
const MAX_TEXTAREA = 4000;
const MAX_RICHTEXT = 60_000;

/** Site paths, in-page anchors, https and mailto links. Never javascript:, data: or protocol-relative. */
export function isSafeHref(href: string): boolean {
  const h = href.trim();
  if (h === "") return true;
  if (h.startsWith("//")) return false;
  if (h.startsWith("/") || h.startsWith("#")) return !/[\s<>"]/.test(h);
  try {
    const url = new URL(h);
    return url.protocol === "https:" || url.protocol === "mailto:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/** Images: files in /public (a site path) or an https URL (uploads live in our storage bucket). */
export function isSafeImageSrc(src: string): boolean {
  const s = src.trim();
  if (s === "") return true;
  if (s.startsWith("/") && !s.startsWith("//")) return !/[\s<>"]/.test(s);
  try {
    return new URL(s).protocol === "https:";
  } catch {
    return false;
  }
}

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

/** A YouTube id from an id or any common YouTube URL; "" when it isn't one. */
export function youtubeId(input: string): string {
  const v = input.trim();
  if (YOUTUBE_ID.test(v)) return v;
  try {
    const url = new URL(v);
    const host = url.hostname.replace(/^www\.|^m\./, "");
    const id =
      host === "youtu.be"
        ? url.pathname.slice(1)
        : host === "youtube.com" || host === "youtube-nocookie.com"
          ? (url.searchParams.get("v") ?? url.pathname.match(/^\/(embed|shorts|live)\/([^/?]+)/)?.[2] ?? "")
          : "";
    return YOUTUBE_ID.test(id) ? id : "";
  } catch {
    return "";
  }
}

const ICON = /^[a-z0-9_]{1,40}$/;

/** The zod schema for one field's value. Text is trimmed; links and images are checked. */
export function fieldSchema(field: FieldDef): z.ZodType<FieldValue> {
  switch (field.kind) {
    case "text":
      return z.string().max(field.max ?? MAX_TEXT, `${field.label} is too long.`);
    case "textarea":
      return z.string().max(field.max ?? MAX_TEXTAREA, `${field.label} is too long.`);
    case "richtext":
      return z.string().max(field.max ?? MAX_RICHTEXT, `${field.label} is too long.`);
    case "image":
      return z.object({
        src: z.string().max(1000).refine(isSafeImageSrc, `${field.label}: use an uploaded image or an https link.`),
        alt: z.string().max(300),
      });
    case "link":
      return z
        .object({
          label: z.string().max(80, `${field.label}: the button text is too long.`),
          href: z.string().max(1000).refine(isSafeHref, `${field.label}: links start with /, https:// or mailto:.`),
        })
        .refine((l) => field.optional || (l.label.trim() !== "" && l.href.trim() !== ""), `${field.label}: add the button text and its link.`);
    case "select": {
      const values = field.options.map((o) => o.value);
      return z.string().refine((v) => values.includes(v), `${field.label}: pick one of the options.`);
    }
    case "toggle":
      return z.boolean();
    case "youtube":
      return z
        .string()
        .max(200)
        .refine((v) => v.trim() === "" || youtubeId(v) !== "", `${field.label}: paste a YouTube link or video id.`)
        .transform((v) => (v.trim() === "" ? "" : youtubeId(v)));
    case "icon":
      return z.string().refine((v) => v === "" || ICON.test(v), `${field.label}: use a Material Symbols name like "pets".`);
    case "list":
      return z
        .array(valuesSchema(field.fields))
        .max(field.max, `${field.label}: up to ${field.max} ${field.itemLabel.toLowerCase()}s.`)
        .refine((items) => items.length >= (field.min ?? 0), `${field.label}: add at least ${field.min ?? 0}.`);
  }
}

/** Values for a set of fields: known keys only (unknown ones are dropped). */
export function valuesSchema(fields: readonly FieldDef[]): z.ZodType<FieldValues> {
  return z.object(Object.fromEntries(fields.map((f) => [f.key, fieldSchema(f)]))) as unknown as z.ZodType<FieldValues>;
}

/** An empty value of the field's type (used when a saved section predates a new field). */
export function emptyValue(field: FieldDef): FieldValue {
  switch (field.kind) {
    case "image":
      return { src: "", alt: "" };
    case "link":
      return { label: "", href: "" };
    case "select":
      return field.options[0]?.value ?? "";
    case "toggle":
      return false;
    case "list":
      return [];
    default:
      return "";
  }
}

/** Saved values merged over defaults, so older sections keep working after a field is added. */
export function withDefaults(fields: readonly FieldDef[], defaults: FieldValues, saved: unknown): FieldValues {
  const s = saved && typeof saved === "object" && !Array.isArray(saved) ? (saved as Record<string, unknown>) : {};
  return Object.fromEntries(
    fields.map((f) => {
      const value = s[f.key];
      const fallback = defaults[f.key] ?? emptyValue(f);
      if (value === undefined) return [f.key, fallback];
      // Items one by one, so a field added to a list later doesn't throw the whole list away.
      if (f.kind === "list" && Array.isArray(value)) return [f.key, value.slice(0, f.max).map((item) => withDefaults(f.fields, {}, item))];
      const parsed = fieldSchema(f).safeParse(value);
      return [f.key, parsed.success ? parsed.data : fallback];
    }),
  );
}
