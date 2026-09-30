interface LessonFileLink {
  id: string;
  file_name: string;
  size_bytes: number | null;
}

interface LessonContentProps {
  lessonId: string;
  /** Sanitized on write by the admin (src/lib/sanitize.ts) — safe to render. */
  bodyHtml: string | null;
  files: readonly LessonFileLink[];
}

function formatSize(bytes: number | null): string {
  if (!bytes) return "";
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** A recognisable icon per material: scripts, music (beat maps), images, video, anything else. */
function fileIcon(name: string): { icon: string; bg: string; fg: string } {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["mp3", "wav", "m4a", "aac", "ogg"].includes(ext)) return { icon: "music_note", bg: "#fff1c2", fg: "#6d5a00" };
  if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) return { icon: "image", bg: "#ffe3c7", fg: "#8b4b00" };
  if (["mp4", "mov", "webm"].includes(ext)) return { icon: "movie", bg: "#ffe3c7", fg: "#8b4b00" };
  if (["pdf", "doc", "docx", "txt"].includes(ext)) return { icon: "description", bg: "#c8fcff", fg: "#0e666a" };
  return { icon: "download", bg: "#c8fcff", fg: "#0e666a" };
}

/** Lesson text and downloadable materials below the player. */
export function LessonContent({ lessonId, bodyHtml, files }: LessonContentProps) {
  if (!bodyHtml && files.length === 0) return null;

  return (
    <div className="space-y-6">
      {bodyHtml && (
        <div className="lesson-prose rounded-[2rem] bg-white p-6 shadow-sm sm:p-8" style={{ color: "#243036" }} dangerouslySetInnerHTML={{ __html: bodyHtml }} />
      )}

      {files.length > 0 && (
        <section aria-label="Lesson resources" className="grid gap-4 sm:grid-cols-2">
          {files.map((f) => {
            const look = fileIcon(f.file_name);
            return (
              <a
                key={f.id}
                href={`/api/lessons/${lessonId}/files/${f.id}`}
                className="group flex items-center gap-4 rounded-[1rem] bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: look.bg, color: look.fg }} aria-hidden>
                  <span className="material-symbols-outlined">{look.icon}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold" style={{ fontFamily: "var(--font-headline)", color: "#243036" }}>
                    {f.file_name}
                  </span>
                  <span className="block text-xs" style={{ color: "#515d64" }}>
                    {formatSize(f.size_bytes) || "Download"}
                  </span>
                </span>
                <span className="material-symbols-outlined text-slate-400 transition-colors group-hover:text-[#0e666a]" aria-hidden>
                  download
                </span>
              </a>
            );
          })}
        </section>
      )}
    </div>
  );
}
