export interface NeedItem {
  icon: string;
  label: string;
}

/** courses.what_you_need is admin-edited jsonb: keep only well-formed {icon, label} items. */
export function parseNeeds(raw: unknown): NeedItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const { icon, label } = item as Record<string, unknown>;
    if (typeof label !== "string" || !label.trim()) return [];
    return [{ icon: typeof icon === "string" && /^[a-z_]{2,40}$/.test(icon) ? icon : "check", label: label.trim() }];
  });
}
