/** Downloadable lesson materials stored in a private Supabase Storage bucket. */
export const LESSON_FILES_BUCKET = "lesson-files";
export const MAX_LESSON_FILE_BYTES = 200 * 1024 * 1024; // 200 MB

const ALLOWED_EXTENSIONS = new Set([
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv", "rtf",
  "jpg", "jpeg", "png", "gif", "webp",
  "mp3", "m4a", "wav",
  "zip",
]);

export interface FileCandidate {
  name: string;
  size: number;
  type: string;
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
}

/** Returns an error message, or null when the file may be uploaded. */
export function validateLessonFile(file: FileCandidate): string | null {
  if (!file.size) return "The file is empty.";
  if (file.size > MAX_LESSON_FILE_BYTES) return "The file is too large (max 200 MB).";
  if (!ALLOWED_EXTENSIONS.has(extensionOf(file.name))) return "This file type is not allowed.";
  return null;
}

/** Storage object path: <lessonId>/<uniqueId>-<slugified-name>.<ext> (no path traversal). */
export function lessonFilePath(lessonId: string, fileName: string, uniqueId: string): string {
  const ext = extensionOf(fileName);
  const base = (ext ? fileName.slice(0, -(ext.length + 1)) : fileName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "file";
  return `${lessonId}/${uniqueId}-${base}${ext ? `.${ext}` : ""}`;
}
