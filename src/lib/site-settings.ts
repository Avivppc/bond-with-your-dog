import { z } from "zod";

/** Settings → General: how the academy presents itself on the public site. Pure (no database). */

export const SOCIAL_KEYS = ["instagram", "youtube", "facebook", "tiktok", "whatsapp"] as const;
export type SocialKey = (typeof SOCIAL_KEYS)[number];

export const SOCIAL_INFO: Record<SocialKey, { label: string; placeholder: string; hosts: readonly string[] }> = {
  instagram: { label: "Instagram", placeholder: "https://instagram.com/your-page", hosts: ["instagram.com"] },
  youtube: { label: "YouTube", placeholder: "https://youtube.com/@your-channel", hosts: ["youtube.com", "youtu.be"] },
  facebook: { label: "Facebook", placeholder: "https://facebook.com/your-page", hosts: ["facebook.com", "fb.com"] },
  tiktok: { label: "TikTok", placeholder: "https://tiktok.com/@your-page", hosts: ["tiktok.com"] },
  whatsapp: { label: "WhatsApp community", placeholder: "https://chat.whatsapp.com/…", hosts: ["whatsapp.com", "wa.me"] },
};

export interface SiteSettings {
  academyName: string;
  contactEmail: string;
  social: Partial<Record<SocialKey, string>>;
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = { academyName: "Bonded", contactEmail: "info.bonded@gmail.com", social: {} };

/** A link to that network: https, and the network's own domain (or a subdomain of it). */
export function isSocialUrl(key: SocialKey, value: string): boolean {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/\.$/, "");
    return url.protocol === "https:" && !url.username && !url.password && SOCIAL_INFO[key].hosts.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

/** The saved JSON → only valid links, in a fixed order. */
export function readSocial(raw: unknown): SiteSettings["social"] {
  const saved = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  return Object.fromEntries(
    SOCIAL_KEYS.flatMap((k) => {
      const v = saved[k];
      return typeof v === "string" && isSocialUrl(k, v) ? [[k, v]] : [];
    }),
  );
}

const socialField = (key: SocialKey) =>
  z
    .string()
    .trim()
    .max(300)
    .refine((v) => v === "" || isSocialUrl(key, v), `The ${SOCIAL_INFO[key].label} link must start with https:// and point to ${SOCIAL_INFO[key].hosts[0]}.`);

/** Settings → General form. Empty social fields mean "not shown". */
export const siteSettingsForm = z.object({
  academy_name: z.string().trim().min(1, "Add the academy's name.").max(80, "The name can be up to 80 characters."),
  contact_email: z.email("The contact email must be an email address.").trim().max(200),
  instagram: socialField("instagram"),
  youtube: socialField("youtube"),
  facebook: socialField("facebook"),
  tiktok: socialField("tiktok"),
  whatsapp: socialField("whatsapp"),
});

export function socialFromForm(form: z.infer<typeof siteSettingsForm>): SiteSettings["social"] {
  return Object.fromEntries(SOCIAL_KEYS.flatMap((k) => (form[k] ? [[k, form[k]]] : [])));
}
