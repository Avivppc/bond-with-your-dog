/** Profile and dog photos: public "profile-photos" bucket, one folder per member (`<uid>/…`). */
export const PROFILE_PHOTOS_BUCKET = "profile-photos";
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export type PhotoKind = "avatar" | "dog";

export function validateProfilePhoto(file: { size: number; type: string }): string | null {
  if (!TYPES[file.type]) return "Use a JPG, PNG or WebP photo.";
  if (file.size > MAX_PHOTO_BYTES) return "Photos can be up to 5 MB.";
  return null;
}

export function profilePhotoPath(userId: string, kind: PhotoKind, contentType: string, id: string): string {
  return `${userId}/${kind}-${id}.${TYPES[contentType] ?? "jpg"}`;
}

/**
 * True when `url` is a public URL of a photo in this member's own folder — the only photo URLs a
 * member may save on their profile or dogs.
 */
export function isOwnPhotoUrl(url: string, supabaseUrl: string, userId: string): boolean {
  const prefix = `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${PROFILE_PHOTOS_BUCKET}/${userId}/`;
  return url.startsWith(prefix) && !url.slice(prefix.length).includes("/") && !url.includes("..");
}
