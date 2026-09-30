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

/** Lesson text and downloadable materials below the player. */
export function LessonContent({ lessonId, bodyHtml, files }: LessonContentProps) {
  if (!bodyHtml && files.length === 0) return null;

  return (
    <div className="space-y-6">
      {bodyHtml && (
        <div
          className="lesson-prose rounded-[1rem] bg-white p-6"
          style={{ color: "#243036" }}
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />
      )}

      {files.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {files.map((f) => (
            <a
              key={f.id}
              href={`/api/lessons/${lessonId}/files/${f.id}`}
              className="p-5 rounded-[1rem] flex items-center gap-4 hover:brightness-95 transition"
              style={{ backgroundColor: "#e4f3fc" }}
            >
              <span
                className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 material-symbols-outlined"
                style={{ backgroundColor: "#a6eff3", color: "#0e666a" }}
                aria-hidden
              >
                download
              </span>
              <span className="min-w-0">
                <span className="block font-bold truncate" style={{ fontFamily: "var(--font-headline)", color: "#243036" }}>
                  {f.file_name}
                </span>
                <span className="block text-xs" style={{ color: "#515d64" }}>
                  {formatSize(f.size_bytes)}
                </span>
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
