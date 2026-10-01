/**
 * Custom lesson thumbnails live in the public course-images bucket under
 * lessons/<lessonId>/<uniqueId>.<ext>. Pure helpers shared by the admin actions and tests.
 */
export const LESSON_THUMBNAIL_PREFIX = "lessons/";
/** Kajabi's recommended lesson thumbnail size. */
export const LESSON_THUMBNAIL_HINT = "JPG, PNG or WebP up to 5 MB · 1280×720 recommended";

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const THUMBNAIL_FILE = new RegExp(`^lessons/(${UUID})/[a-z0-9-]+\\.(jpg|jpeg|png|webp)$`);

/** Storage path for a new upload; the extension comes from the (already validated) file name. */
export function lessonThumbnailPath(lessonId: string, fileName: string, uniqueId: string): string {
  const ext = fileName.slice(fileName.lastIndexOf(".") + 1).toLowerCase();
  return `${LESSON_THUMBNAIL_PREFIX}${lessonId}/${uniqueId}.${ext}`;
}

/** True when `path` is a thumbnail object of exactly this lesson (no traversal, no other folder). */
export function isLessonThumbnailPath(path: string, lessonId: string): boolean {
  const match = THUMBNAIL_FILE.exec(path);
  return Boolean(match) && match?.[1] === lessonId.toLowerCase();
}

/** The storage path behind one of this lesson's public thumbnail URLs, or null for any other URL. */
export function lessonThumbnailPathFromUrl(url: string | null, publicBase: string, lessonId: string): string | null {
  if (!url || !url.startsWith(publicBase)) return null;
  const path = url.slice(publicBase.length);
  return isLessonThumbnailPath(path, lessonId) ? path : null;
}

export type ThumbnailSource = "upload" | "video" | "none";

/** Which image members see: an uploaded one always wins over the video's thumbnail. */
export function effectiveThumbnail(uploadUrl: string | null, videoUrl: string | null): { url: string | null; source: ThumbnailSource } {
  if (uploadUrl) return { url: uploadUrl, source: "upload" };
  if (videoUrl) return { url: videoUrl, source: "video" };
  return { url: null, source: "none" };
}
