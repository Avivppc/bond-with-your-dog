/**
 * What the email image upload accepts, shared by the browser (early feedback) and the server
 * action (the real check). Pure, no server imports.
 */

export const EMAIL_ASSETS_BUCKET = "email-assets";
export const EMAIL_IMAGE_MAX_BYTES = 2 * 1024 * 1024;

export const EMAIL_IMAGE_TYPES = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
} as const;

export type EmailImageType = keyof typeof EMAIL_IMAGE_TYPES;

/** For <input type="file" accept>. */
export const EMAIL_IMAGE_ACCEPT = Object.keys(EMAIL_IMAGE_TYPES).join(",");

export function isEmailImageType(type: string): type is EmailImageType {
  return Object.hasOwn(EMAIL_IMAGE_TYPES, type);
}

/** A user-facing problem with the file, or null when it can be uploaded. */
export function validateEmailImage(file: { type: string; size: number }): string | null {
  if (!isEmailImageType(file.type)) return "Use a PNG, JPG, GIF or WebP image.";
  if (file.size <= 0) return "That file is empty.";
  if (file.size > EMAIL_IMAGE_MAX_BYTES) return "Images can be up to 2 MB. Try a smaller or compressed version.";
  return null;
}

function startsWith(bytes: Uint8Array, signature: readonly number[], offset = 0): boolean {
  return signature.every((b, i) => bytes[offset + i] === b);
}

const ascii = (text: string): number[] => Array.from(text, (c) => c.charCodeAt(0));

/** The image type the file's first bytes actually show (the browser-sent type can be anything). */
export function sniffImageType(bytes: Uint8Array): EmailImageType | null {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, ascii("GIF87a")) || startsWith(bytes, ascii("GIF89a"))) return "image/gif";
  if (startsWith(bytes, ascii("RIFF")) && startsWith(bytes, ascii("WEBP"), 8)) return "image/webp";
  return null;
}

/** Storage path: one folder per year, a random file name. */
export function emailImagePath(now: Date, uuid: string, type: EmailImageType): string {
  return `${now.getUTCFullYear()}/${uuid}.${EMAIL_IMAGE_TYPES[type]}`;
}
