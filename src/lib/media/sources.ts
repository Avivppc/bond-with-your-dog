/**
 * Media library: where an image came from, from its bucket and path. Pure.
 *   site-media/<year>/…               website and library uploads
 *   course-images/imported/…          images imported from Kajabi
 *   course-images/lessons/<id>/…      lesson thumbnails
 *   course-images/shared/…            library images reused elsewhere (lasting copies)
 *   course-images/moves/…             Moves Library images
 *   course-images/<course id>/…       course covers
 */

export const MEDIA_SOURCES = [
  { key: "all", label: "All images" },
  { key: "website", label: "Website & library" },
  { key: "courses", label: "Courses" },
] as const;

export type MediaSource = (typeof MEDIA_SOURCES)[number]["key"];

export function parseMediaSource(raw: unknown): MediaSource {
  return MEDIA_SOURCES.find((s) => s.key === raw)?.key ?? "all";
}

/** The buckets the library shows; both are public, so their URLs can be used anywhere. */
export const LIBRARY_BUCKETS = ["site-media", "course-images"] as const;

export function mediaOrigin(bucket: string, path: string): string {
  if (bucket === "site-media") return "Website & library";
  if (path.startsWith("imported/")) return "Imported from Kajabi";
  if (path.startsWith("lessons/")) return "Lesson thumbnail";
  if (path.startsWith("shared/")) return "Course image";
  if (path.startsWith("moves/")) return "Move image";
  return "Course cover";
}

/** The file name without our random prefix folders ("2026/ab12.jpg" → "ab12.jpg"). */
export function mediaName(path: string): string {
  return path.split("/").pop() ?? path;
}

/** True when `url` is a public file of one of the library buckets (the only URLs a picker may set). */
export function isLibraryUrl(url: string, publicBases: readonly string[]): boolean {
  return publicBases.some((base) => url.startsWith(base) && url.length > base.length && !url.slice(base.length).includes(".."));
}
