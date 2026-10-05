/**
 * Photos on "Bonded Stories": private bucket "community-media", under `<user_id>/stories/` (members)
 * or `guest/<upload session>/stories/` (visitors on the public form).
 * Up to 3 per story; the database checks the same path rule (private.support_media_paths_valid).
 * Pure — shared by the upload form, the server actions and the admin inbox.
 */
export const STORY_MEDIA_BUCKET = "community-media";
export const MAX_STORY_PHOTOS = 3;
export const MAX_STORY_PHOTO_BYTES = 10 * 1024 * 1024;

const EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heic",
};

/** For the file input: some browsers don't know HEIC's type, so list the extensions too. */
export const STORY_PHOTO_ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif";

/** The content type to upload with, or null when it isn't a supported photo (HEIC by extension when the browser can't tell). */
export function storyPhotoType(file: { name: string; type: string }): string | null {
  if (EXTENSION[file.type]) return file.type;
  const unknown = file.type === "" || file.type === "application/octet-stream";
  return unknown && /\.(heic|heif)$/i.test(file.name) ? "image/heic" : null;
}

export function validateStoryPhoto(file: { name: string; size: number; type: string }): string | null {
  if (!storyPhotoType(file)) return "Use a JPG, PNG, WebP or HEIC photo.";
  if (file.size > MAX_STORY_PHOTO_BYTES) return "Photos can be up to 10 MB each.";
  return null;
}

export function storyPhotoPath(userId: string, contentType: string, id: string): string {
  return `${userId}/stories/${id}.${EXTENSION[contentType] ?? "jpg"}`;
}

/**
 * Visitors' photos (the public "Share your story" form): `guest/<upload session>/stories/`. The
 * session id sits in an httpOnly cookie, so a story can only carry photos its own browser uploaded.
 */
export function guestStoryPhotoPath(session: string, contentType: string, id: string): string {
  return `guest/${session}/stories/${id}.${EXTENSION[contentType] ?? "jpg"}`;
}

export function isGuestStoryPhotoPath(path: string, session: string): boolean {
  return path.startsWith(`guest/${session}/stories/`) && /^guest\/[0-9a-f-]{36}\/stories\/[A-Za-z0-9_-]{1,80}\.(jpg|png|webp|heic)$/.test(path);
}

/** True for a story photo path in this member's own folder (the only paths a story may carry). */
export function isOwnStoryPhotoPath(path: string, userId: string): boolean {
  return path.startsWith(`${userId}/stories/`) && /^[^/]+\/stories\/[A-Za-z0-9_-]{1,80}\.(jpg|png|webp|heic)$/.test(path);
}

/** HEIC opens in Safari but not in most other browsers, so the inbox links to it instead of previewing. */
export function isPreviewablePhoto(path: string): boolean {
  return !path.endsWith(".heic");
}
