import Link from "next/link";
import { ArrowLink, Ms, StateIc, Tip } from "@/components/app/ui";
import { TimeAgo } from "@/components/community/bits";
import { LessonContent } from "./LessonContent";
import { AskForm } from "./AskForm";
import type { LessonTab, PracticeStep } from "./lesson-data";
import { plural } from "@/lib/feedback/format";

export interface QuestionRow {
  id: string;
  body: string;
  answer: string | null;
  answered_at: string | null;
  created_at: string;
  asker: string;
  is_mine: boolean;
}

interface TabsProps {
  base: string;
  active: LessonTab;
  questionCount: number;
  fileCount: number;
  stepCount: number;
}

export function TabBar({ base, active, questionCount, fileCount, stepCount }: TabsProps) {
  const tabs: { key: LessonTab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "practice", label: stepCount ? `Practice steps (${stepCount})` : "Practice steps" },
    { key: "downloads", label: fileCount ? `Downloads (${fileCount})` : "Downloads" },
    { key: "questions", label: `Questions (${questionCount})` },
  ];
  return (
    <nav className="tabs" aria-label="Lesson sections">
      {tabs.map((t) => (
        <Link key={t.key} href={t.key === "overview" ? base : `${base}?tab=${t.key}`} className={active === t.key ? "on" : undefined} aria-current={active === t.key ? "page" : undefined} scroll={false}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

export function OverviewTab({ description, bodyHtml, cues, takeaways, dog }: { description: string | null; bodyHtml: string | null; cues: string[]; takeaways: string[]; dog: string }) {
  if (!description && !bodyHtml && cues.length === 0 && takeaways.length === 0) {
    return <p className="faint">Watch the lesson together with {dog}, then try it in a short practice session.</p>;
  }
  return (
    <div className={takeaways.length > 0 ? "grid-2" : "stack"}>
      <div className="stack" style={takeaways.length > 0 ? undefined : { maxWidth: "70ch" }}>
        <h3 className="h3">What this lesson is about</h3>
        {description && <p className="muted">{description}</p>}
        {bodyHtml && <LessonContent lessonId="" bodyHtml={bodyHtml} files={[]} />}
        {cues.length > 0 && (
          <div className="row">
            {cues.map((c) => (
              <span key={c} className="chip">
                Cue: &ldquo;{c}&rdquo;
              </span>
            ))}
          </div>
        )}
      </div>
      {takeaways.length > 0 && (
        <div className="card flat tight">
          <span className="eyebrow muted">Key takeaways</span>
          {takeaways.map((t) => (
            <div key={t} className="check-row">
              <StateIc mark="done" />
              {t}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function PracticeTab({ steps, lessonId, minutes }: { steps: PracticeStep[]; lessonId: string; minutes: number | null }) {
  if (steps.length === 0) {
    return (
      <Tip icon="pets">
        Roni hasn&apos;t added guided steps to this lesson yet. You can still log a free practice session.{" "}
        <Link className="link" href={`/practice?lesson=${lessonId}`}>
          Practice now
        </Link>
      </Tip>
    );
  }
  return (
    <div className="stack">
      <div className="list">
        {steps.map((s, i) => (
          <div key={i} className="list-row">
            <span className="num-step">{i + 1}</span>
            <div className="grow">
              <div className="title">{s.title}</div>
              {s.body && <div className="faint">{s.body}</div>}
            </div>
            <span className="faint">{[s.seconds ? `${Math.round(s.seconds / 60) || 1} min` : null, s.reps ? plural(s.reps, "rep") : null].filter(Boolean).join(" · ")}</span>
          </div>
        ))}
      </div>
      <div>
        <Link className="btn btn-primary" href={`/practice?lesson=${lessonId}`}>
          <Ms name="pets" />
          Start guided practice{minutes ? ` · ${minutes} min` : ""}
        </Link>
      </div>
    </div>
  );
}

export function DownloadsTab({ lessonId, files }: { lessonId: string; files: { id: string; file_name: string; size_bytes: number | null }[] }) {
  if (files.length === 0) return <p className="faint">No downloads for this lesson.</p>;
  return <LessonContent lessonId={lessonId} bodyHtml={null} files={files} />;
}

export function QuestionsTab({ questions, lessonId, courseId }: { questions: QuestionRow[]; lessonId: string; courseId: string }) {
  return (
    <div className="grid-main">
      <div className="stack">
        {questions.length === 0 && <p className="faint">No questions yet. Ask the first one — Roni answers here.</p>}
        {questions.map((q) => (
          <div key={q.id} className="card tight">
            <div className="between" style={{ alignItems: "center" }}>
              <b>{q.is_mine ? "You" : q.asker}</b>
              <span className="faint">
                <TimeAgo iso={q.created_at} />
              </span>
            </div>
            <p>{q.body}</p>
            {q.answer ? (
              <div className="row" style={{ alignItems: "flex-start", flexWrap: "nowrap" }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- Roni's portrait */}
                <img className="avatar" src="/app/img/roni.jpg" alt="Roni Sagi" style={{ width: 32, height: 32 }} />
                <div className="stack" style={{ gap: 2 }}>
                  <span className="eyebrow">Roni&apos;s answer</span>
                  <p className="muted" style={{ whiteSpace: "pre-line" }}>
                    {q.answer}
                  </p>
                </div>
              </div>
            ) : (
              <span className="pill learning" style={{ alignSelf: "flex-start" }}>
                Waiting for Roni
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="stack-lg sticky">
        <AskForm lessonId={lessonId} courseId={courseId} />
        <ArrowLink href="/help">More help</ArrowLink>
      </div>
    </div>
  );
}
