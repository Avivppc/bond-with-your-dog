import type { ParseResult } from "./lists";

/** Curated Material Symbols for a course's "What you'll need" list. */
export const NEED_ICONS = [
  { icon: "cookie", label: "Treats" },
  { icon: "texture", label: "Mat or rug" },
  { icon: "crop_free", label: "Space" },
  { icon: "pets", label: "Your dog" },
  { icon: "music_note", label: "Music" },
  { icon: "timer", label: "Time" },
  { icon: "sports_tennis", label: "Toy or ball" },
  { icon: "water_drop", label: "Water" },
] as const;

export type NeedIcon = (typeof NEED_ICONS)[number]["icon"];

export interface NeedItem {
  icon: NeedIcon;
  label: string;
}

export const MAX_NEEDS = 8;
export const MAX_NEED_LABEL = 80;

const ICONS: ReadonlySet<string> = new Set(NEED_ICONS.map((n) => n.icon));

export function isNeedIcon(value: unknown): value is NeedIcon {
  return typeof value === "string" && ICONS.has(value);
}

/** Pairs the editor's `need_icon` / `need_label` rows; rows without a label are dropped. */
export function parseNeeds({ icons, labels }: { icons: readonly unknown[]; labels: readonly unknown[] }): ParseResult<NeedItem[]> {
  const items: NeedItem[] = [];
  for (let i = 0; i < labels.length; i++) {
    const label = typeof labels[i] === "string" ? (labels[i] as string).trim() : "";
    if (!label) continue;
    const icon = icons[i];
    if (!isNeedIcon(icon)) return { ok: false, error: `"What you'll need" row ${i + 1}: pick an icon from the list.` };
    if (label.length > MAX_NEED_LABEL) return { ok: false, error: `"What you'll need": keep each item under ${MAX_NEED_LABEL} characters.` };
    items.push({ icon, label });
  }
  if (items.length > MAX_NEEDS) return { ok: false, error: `"What you'll need": up to ${MAX_NEEDS} items.` };
  return { ok: true, value: items };
}

/** Reads `courses.what_you_need` from the database, skipping malformed rows. */
export function readNeeds(value: unknown): NeedItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((row): NeedItem[] => {
    if (typeof row !== "object" || row === null) return [];
    const { icon, label } = row as Record<string, unknown>;
    return isNeedIcon(icon) && typeof label === "string" && label.trim() ? [{ icon, label }] : [];
  });
}
