/** Routine music uploads (private `routine-music` bucket, path `<uid>/<uuid>.<ext>`). Pure. */
export const ROUTINE_MUSIC_BUCKET = "routine-music";
export const MAX_MUSIC_BYTES = 20 * 1024 * 1024;

/** Extension → content type the bucket accepts. */
export const MUSIC_TYPES: Record<string, string> = {
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  mp4: "audio/mp4",
  aac: "audio/aac",
  wav: "audio/wav",
  ogg: "audio/ogg",
};

export function musicExtension(fileName: string): string | null {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return ext in MUSIC_TYPES ? ext : null;
}

export function validateMusicFile(file: { name: string; size: number }): string | null {
  if (!musicExtension(file.name)) return "Choose an MP3, M4A, AAC, WAV or OGG audio file.";
  if (file.size <= 0) return "That file is empty.";
  if (file.size > MAX_MUSIC_BYTES) return "Music files can be up to 20 MB.";
  return null;
}

export function routineMusicPath(userId: string, fileName: string, id: string): string {
  return `${userId}/${id}.${musicExtension(fileName) ?? "mp3"}`;
}

/** A stored path the member may reference: inside their own folder, no traversal. */
export function isOwnMusicPath(path: string, userId: string): boolean {
  return /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(mp3|m4a|mp4|aac|wav|ogg)$/i.test(path) && path.startsWith(`${userId}/`);
}

/** "Sunday Waltz.mp3" → "Sunday Waltz" (display name kept with the routine). */
export function musicDisplayName(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, "").trim();
  return (base || "Your music").slice(0, 200);
}
