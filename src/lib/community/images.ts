/** Cover images for the community (hub, challenges, meetups): uploaded ones live in course-images/community/. */
export const COMMUNITY_IMAGE_PREFIX = "community/";
const UPLOADED_FILE = /^community\/[a-z0-9-]+\.(jpg|jpeg|png|webp)$/;

/** Storage path for a new upload: community/<id>.<ext>. */
export function communityCoverPath(fileName: string, uniqueId: string): string {
  const ext = fileName.slice(fileName.lastIndexOf(".") + 1).toLowerCase();
  return `${COMMUNITY_IMAGE_PREFIX}${uniqueId}.${ext}`;
}

/**
 * A cover image may be blank, any https link, or an image uploaded through the admin
 * (our public bucket URL, which is plain http on a local Supabase).
 */
export function isAllowedImageUrl(url: string, publicBase: string): boolean {
  if (url === "") return true;
  if (/^https:\/\/\S+$/.test(url)) return true;
  return url.startsWith(publicBase) && UPLOADED_FILE.test(url.slice(publicBase.length));
}
