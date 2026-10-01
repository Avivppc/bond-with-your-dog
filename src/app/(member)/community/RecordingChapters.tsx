import { Ms } from "@/components/app/ui";
import { chapterUrl, formatTimestamp, type Chapter } from "@/lib/community/chapters";

/** A recording's chapters as chips that open the recording at that moment. */
export function RecordingChapters({ recordingUrl, chapters, title }: { recordingUrl: string; chapters: readonly Chapter[]; title: string }) {
  if (chapters.length === 0) return null;
  return (
    <nav className="row" style={{ gap: 8, paddingBottom: 14 }} aria-label={`Chapters in ${title}`}>
      {chapters.map((c) => (
        <a
          key={c.t}
          className="chip"
          href={chapterUrl(recordingUrl, c.t)}
          target="_blank"
          rel="noopener noreferrer"
          title={c.title}
          style={{ maxWidth: "100%", height: 30, paddingLeft: 10 }}
        >
          <Ms name="play_arrow" size="sm" color="var(--teal)" />
          <span className="num" style={{ color: "var(--teal)", fontWeight: 600 }}>
            {formatTimestamp(c.t)}
          </span>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{c.title}</span>
        </a>
      ))}
    </nav>
  );
}
