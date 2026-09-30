import { Ms } from "@/components/app/ui";

export type MediaSpec =
  | { kind: "vimeo"; src: string; caption: string }
  | { kind: "video"; src: string; caption: string }
  | { kind: "image"; src: string; alt: string; caption: string };

/** Left side of the practice stage: the move's looping clip, else its picture or the lesson's. */
export function PracticeMedia({ media }: { media: MediaSpec }) {
  return (
    <div className="media">
      {media.kind === "vimeo" && (
        <iframe
          src={media.src}
          title={media.caption}
          allow="autoplay; fullscreen; picture-in-picture"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
        />
      )}
      {media.kind === "video" && (
        <video src={media.src} autoPlay muted loop playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} aria-label={media.caption} />
      )}
      {media.kind === "image" && (
        // eslint-disable-next-line @next/next/no-img-element -- lesson/move artwork from our CMS or Vimeo
        <img src={media.src} alt={media.alt} />
      )}
      <div className="glass">
        <span style={{ color: "var(--cognac)", display: "flex" }}>
          <Ms name={media.kind === "image" ? "photo" : "replay"} fill />
        </span>
        <span style={{ minWidth: 0 }}>{media.caption}</span>
      </div>
    </div>
  );
}
