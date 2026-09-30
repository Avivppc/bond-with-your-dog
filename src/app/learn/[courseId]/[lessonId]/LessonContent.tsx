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
          className="lesson-prose rounded-[16px] bg-white p-6 shadow-sm"
          style={{ color: "#243036" }}
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />
      )}

      {files.length > 0 && (
        <section className="overflow-hidden rounded-[16px] bg-white shadow-sm">
          <h2 className="border-b border-[#edf3f7] px-5 py-3 text-sm font-extrabold" style={{ fontFamily: "var(--font-headline)", color: "#243036" }}>
            Resources
          </h2>
          <ul className="divide-y divide-[#edf3f7]">
            {files.map((f) => (
              <li key={f.id}>
                <a href={`/api/lessons/${lessonId}/files/${f.id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-[#f3f9fd]">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e3f5f5] text-[#0e666a]" aria-hidden>
                    <span className="material-symbols-outlined text-[20px] leading-none">download</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold" style={{ color: "#243036" }}>
                      {f.file_name}
                    </span>
                    <span className="block text-xs" style={{ color: "#5b6b73" }}>
                      {formatSize(f.size_bytes)}
                    </span>
                  </span>
                  <span className="text-xs font-bold" style={{ color: "#0e666a" }}>
                    Download
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
