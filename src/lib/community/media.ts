/** Post images: private bucket "community-media", one folder per member (the DB checks the prefix). */
export const MAX_COMMUNITY_IMAGE_BYTES = 10 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
const EXTENSIONS = new Set(Object.values(TYPES).concat("jpeg"));

export function validateCommunityImage(file: { name: string; size: number; type: string }): string | null {
  if (!TYPES[file.type]) return "Use a JPG, PNG, WebP or GIF image.";
  if (file.size > MAX_COMMUNITY_IMAGE_BYTES) return "Images can be up to 10 MB.";
  return null;
}

export function communityImagePath(userId: string, fileName: string, id: string): string {
  const ext = fileName.includes(".") ? fileName.slice(fileName.lastIndexOf(".") + 1).toLowerCase() : "";
  return `${userId}/${id}.${EXTENSIONS.has(ext) ? (ext === "jpeg" ? "jpg" : ext) : "jpg"}`;
}
