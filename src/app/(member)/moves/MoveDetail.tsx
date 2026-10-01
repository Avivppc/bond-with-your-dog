import Link from "next/link";
import { LevelPill, Ms, Pill, Tip } from "@/components/app/ui";
import { gentleFirst } from "@/lib/practice/moves";
import type { MoveView, MovesDog } from "./types";
import { SkillControl } from "./SkillControl";

function Clip({ move }: { move: MoveView }) {
  if (move.clip?.kind === "vimeo") {
    return (
      <div className="media" style={{ aspectRatio: "16 / 9" }}>
        <iframe src={move.clip.src} title={`${move.name} clip`} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }} />
      </div>
    );
  }
  if (move.clip?.kind === "video") {
    return (
      <div className="media" style={{ aspectRatio: "16 / 9" }}>
        <video src={move.clip.src} controls playsInline muted loop style={{ width: "100%", height: "100%", objectFit: "cover" }} aria-label={`${move.name} clip`} />
      </div>
    );
  }
  return (
    <div className="sketch" style={{ aspectRatio: "1.3" }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- move artwork */}
      <img src={move.image} alt="" style={{ width: "62%" }} />
    </div>
  );
}

function Level({ move, dog }: { move: MoveView; dog: MovesDog | null }) {
  if (!dog) {
    return (
      <p className="faint">
        <Link className="link" href="/dogs/new">
          Add your dog
        </Link>{" "}
        to track their level on each move.
      </p>
    );
  }
  if (move.setByCoach && move.level) {
    return (
      <p className="faint row" style={{ gap: 8 }}>
        <LevelPill level={move.level} /> Set by Roni&apos;s team
      </p>
    );
  }
  return <SkillControl key={`${move.id}:${move.level ?? "none"}`} dogId={dog.id} dogName={dog.name} moveId={move.id} level={move.level} />;
}

/** Right-hand panel of the Moves Library. */
export function MoveDetail({ move, dog }: { move: MoveView; dog: MovesDog | null }) {
  const gentle = gentleFirst(dog?.limitations, move);
  const eyebrow = [move.courseTitle, move.lessonNumber ? `Lesson ${move.lessonNumber}` : null].filter(Boolean).join(" · ");
  const jointsWarning = move.loadsJoints && !move.gentleAlternative && dog && dog.limitations.length > 0;
  return (
    <div className="card" role="region" aria-label={`${move.name} details`}>
      <Clip move={move} />
      <div className="head-block">
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2 className="h2">{move.name}</h2>
      </div>
      <div className="row">
        {move.cue && <span className="chip">Cue: &ldquo;{move.cue}&rdquo;</span>}
        {move.level ? <LevelPill level={move.level} /> : dog ? <Pill>Not started</Pill> : null}
      </div>
      {gentle && (
        <Tip icon="accessible" warm>
          <b>Gentler for {dog?.name}</b>
          <br />
          {move.gentleAlternative}
        </Tip>
      )}
      {jointsWarning && (
        <Tip icon="health_and_safety" warm>
          This move puts load on the joints. With {dog?.name}&apos;s limitations, ask Roni before practicing it.
        </Tip>
      )}
      {move.summary && <p className="muted">{move.summary}</p>}
      {move.steps.length > 0 && (
        <ol className="stack" style={{ gap: 8, paddingLeft: 20, margin: 0 }}>
          {move.steps.map((s, i) => (
            <li key={i} className="muted">
              {s}
            </li>
          ))}
        </ol>
      )}
      {!gentle && move.gentleAlternative && (
        <p className="faint">
          <b>Gentle alternative:</b> {move.gentleAlternative}
        </p>
      )}
      <Level move={move} dog={dog} />
      {move.lessonId && dog && (
        <Link className="btn btn-primary" href={`/practice?lesson=${move.lessonId}&move=${move.slug}`}>
          <Ms name="pets" size="sm" />
          Practice {move.name.toLowerCase()}
        </Link>
      )}
      {move.lessonId && move.courseId && (
        <Link className="link" href={`/learn/${move.courseId}/${move.lessonId}`}>
          Watch the lesson
          <Ms name="arrow_forward" />
        </Link>
      )}
    </div>
  );
}
