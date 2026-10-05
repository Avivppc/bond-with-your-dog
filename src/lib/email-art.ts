/**
 * The picture at the top of an email: Roni's photos for the emails members get often (a different
 * one each day), and a small brand line-drawing for one-off emails (sign-in, receipts). Chosen from
 * the date, so there is nothing to store and the same email on the same day always looks the same.
 * Pure (no server imports) so both email renderers share it and it is unit-tested.
 */

export type EmailArtKind = "photo" | "sketch" | "none";

export const EMAIL_ART_KINDS: readonly EmailArtKind[] = ["photo", "sketch", "none"];

export const EMAIL_ART_LABELS: Record<EmailArtKind, string> = {
  photo: "Roni's photo (changes daily)",
  sketch: "Line drawing",
  none: "No picture",
};

export function isEmailArtKind(value: unknown): value is EmailArtKind {
  return typeof value === "string" && (EMAIL_ART_KINDS as readonly string[]).includes(value);
}

/**
 * Who an email is for. "member": reminders and updates people get often. "system": one-off emails
 * (sign-in, receipts, invites). "internal": mail to the team, which never carries a picture.
 */
export type EmailAudience = "member" | "system" | "internal";

/** Settings → Email: the picture for each kind of email; flows and campaigns can override it per email. */
export interface EmailArtSettings {
  member: EmailArtKind;
  system: EmailArtKind;
  flows: EmailArtKind;
}

export const DEFAULT_ART_SETTINGS: EmailArtSettings = { member: "photo", system: "sketch", flows: "photo" };

/** The stored settings with anything missing or unknown replaced by its default. */
export function readArtSettings(raw: unknown): EmailArtSettings {
  const record = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const pick = (key: keyof EmailArtSettings): EmailArtKind => (isEmailArtKind(record[key]) ? record[key] : DEFAULT_ART_SETTINGS[key]);
  return { member: pick("member"), system: pick("system"), flows: pick("flows") };
}

export function artForAudience(audience: EmailAudience | undefined, settings: EmailArtSettings): EmailArtKind {
  if (audience === "internal") return "none";
  return audience === "member" ? settings.member : settings.system;
}

export interface EmailArt {
  kind: "photo" | "sketch";
  /** Site-relative path of the image. */
  path: string;
  /** Size the image is shown at, in px (the file itself is 2× for sharp screens). */
  width: number;
  height: number;
  alt: string;
}

/** public/images/email/hero-01.jpg … hero-NN.jpg: the resized 16:9 copies of Roni's photos. */
export const EMAIL_PHOTO_COUNT = 14;
/** public/sketches/<name>.jpg: the brand line-drawings (brown, on white). */
export const EMAIL_SKETCHES = [
  "artistic-impressions",
  "basic-foundations",
  "basic-skills",
  "basic-tricks",
  "dancing-skills",
  "drunk-bunny",
  "fun-tricks",
  "give-a-hug",
  "hoop-jumps",
  "intro",
  "jump-basics",
  "leash-walking",
  "model-walk",
  "moving-together",
  "take-a-selfie",
] as const;

const DAY_MS = 86_400_000;
/** The card is 560 wide with a 1px border; a photo fills what's inside. */
const PHOTO_SIZE = { width: 558, height: 314 } as const;
const SKETCH_SIZE = 120;
const CARD_PADDING = "32px 28px";

/** A small stable number from a string, to spread different emails over the sketches. */
function hashOf(text: string): number {
  let hash = 0;
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) % 1_000_003;
  return hash;
}

/**
 * Photos follow the day alone, so consecutive days always differ. Sketches also follow `salt`
 * (the subject), so a sign-in link and a receipt sent the same day don't share a drawing.
 */
export function pickEmailArt(kind: EmailArtKind, now: Date, salt = ""): EmailArt | null {
  const dayIndex = Math.floor(now.getTime() / DAY_MS);
  if (kind === "photo") {
    const n = (dayIndex % EMAIL_PHOTO_COUNT) + 1;
    return { kind, path: `/images/email/hero-${String(n).padStart(2, "0")}.jpg`, ...PHOTO_SIZE, alt: "Roni training with her border collies" };
  }
  if (kind === "sketch") {
    const name = EMAIL_SKETCHES[(dayIndex + hashOf(salt)) % EMAIL_SKETCHES.length];
    return { kind, path: `/sketches/${name}.jpg`, width: SKETCH_SIZE, height: SKETCH_SIZE, alt: "" };
  }
  return null;
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/**
 * What goes inside the white card: the photo flush with the top edge, or the sketch centred above
 * the text, then the text itself. `bodyStyle` is the text cell's extra font/colour styling.
 */
export function emailCard(body: string, art: EmailArt | null, siteUrl: string, bodyStyle: string): string {
  const src = (art: EmailArt) => escapeAttr(`${siteUrl.replace(/\/$/, "")}${art.path}`);
  const photo =
    art?.kind === "photo"
      ? `<img src="${src(art)}" width="${art.width}" height="${art.height}" alt="${escapeAttr(art.alt)}" style="display:block;width:100%;height:auto;border:0;border-radius:15px 15px 0 0">\n`
      : "";
  const sketch =
    art?.kind === "sketch"
      ? `<div style="text-align:center;margin:0 0 14px"><img src="${src(art)}" width="${art.width}" height="${art.height}" alt="" style="display:inline-block;border:0;max-width:100%"></div>\n`
      : "";
  return `${photo}<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td style="padding:${CARD_PADDING};${bodyStyle}">
${sketch}${body}
</td></tr></table>`;
}
