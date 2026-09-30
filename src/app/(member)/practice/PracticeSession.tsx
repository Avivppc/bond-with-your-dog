"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { Ms, Tip } from "@/components/app/ui";
import { localIsoDate } from "@/lib/practice/dates";
import { formatClock, summarizeSession, type SessionSummary as Summary, type Stage } from "@/lib/practice/session";
import { savePracticeSession } from "./actions";
import { PracticeTimer } from "./PracticeTimer";
import { SessionChecklist } from "./SessionChecklist";
import { SessionSummary } from "./SessionSummary";

export interface PracticeSessionProps {
  lesson: { id: string; title: string; href: string; eyebrow: string };
  dog: { id: string; name: string };
  moveId: string | null;
  stages: Stage[];
  chips: string[];
  media: React.ReactNode;
}

const MAX_REPS_PER_STAGE = 999;

function stageEyebrow(stage: Stage): string {
  return stage.kind === "step" ? `Step ${stage.stepNumber}` : stage.kind === "warmup" ? "Warm-up" : "Cool-down";
}

/** Practice mode: one session, kept in the browser until it's finished or stopped. */
export function PracticeSession({ lesson, dog, moveId, stages, chips, media }: PracticeSessionProps) {
  const [current, setCurrent] = useState(0);
  const [completed, setCompleted] = useState<ReadonlySet<number>>(new Set());
  const [reps, setReps] = useState<number[]>(() => stages.map(() => 0));
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [saved, setSaved] = useState<{ summary: Summary; stopped: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [announce, setAnnounce] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (startedAt === null || saved) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [startedAt, saved]);

  const stage = stages[current];
  const isLast = current === stages.length - 1;
  const stepCount = stages.filter((s) => s.kind === "step").length;
  const elapsed = startedAt === null ? 0 : Math.max(0, (now - startedAt) / 1000);

  function markStarted() {
    if (startedAt !== null) return;
    const t = Date.now();
    setStartedAt(t);
    setNow(t);
  }

  function addRep() {
    markStarted();
    const next = Math.min(MAX_REPS_PER_STAGE, reps[current] + 1);
    setReps((prev) => prev.map((r, i) => (i === current ? Math.min(MAX_REPS_PER_STAGE, r + 1) : r)));
    if (stage.reps && next === stage.reps) setAnnounce(`${next} reps. Take a short break.`);
  }

  function save(done: ReadonlySet<number>, stopped: boolean) {
    const summary = summarizeSession(stages, done, reps, startedAt === null ? 0 : (Date.now() - startedAt) / 1000);
    setError(null);
    startTransition(async () => {
      const res = await savePracticeSession({ lessonId: lesson.id, moveId, dogId: dog.id, practicedOn: localIsoDate(), ...summary });
      if (res.ok) setSaved({ summary, stopped });
      else setError(res.error);
    });
  }

  function next() {
    markStarted();
    const done = new Set(completed).add(current);
    setCompleted(done);
    if (isLast) save(done, false);
    else {
      setCurrent(current + 1);
      setAnnounce(`Now: ${stages[current + 1].label}`);
    }
  }

  function again() {
    setCurrent(0);
    setCompleted(new Set());
    setReps(stages.map(() => 0));
    setStartedAt(null);
    setSaved(null);
  }

  const head = (
    <div className="between">
      <div className="head-block">
        <span className="eyebrow">{lesson.eyebrow}</span>
        <h1 className="h1">{lesson.title}</h1>
      </div>
      {!saved && (
        <div className="row faint num">
          <Ms name="schedule" size="sm" />
          Session {formatClock(elapsed)}
          <span aria-hidden>·</span>
          {stage.kind === "step" ? `Step ${stage.stepNumber} of ${stepCount}` : stageEyebrow(stage)}
        </div>
      )}
    </div>
  );

  if (saved) {
    return (
      <>
        {head}
        <SessionSummary summary={saved.summary} stopped={saved.stopped} dogName={dog.name} lessonHref={lesson.href} onAgain={again} />
      </>
    );
  }

  return (
    <>
      {head}
      <div className="steps-dots" role="img" aria-label={`Stage ${current + 1} of ${stages.length}`}>
        {stages.map((_, i) => (
          <i key={i} className={completed.has(i) ? "done" : i === current ? "on" : ""} />
        ))}
      </div>
      <div className="grid-main">
        <div className="card" style={{ padding: 28 }}>
          <div className="practice-stage">
            {media}
            <div className="stack-lg">
              <div className="head-block">
                <span className="eyebrow muted">{stageEyebrow(stage)}</span>
                <h2 className="h2">{stage.title}</h2>
                {stage.body && <p className="muted">{stage.body}</p>}
              </div>
              <PracticeTimer seconds={stage.seconds} stepKey={current} onFirstStart={markStarted} />
              <div className="reps">
                <div>
                  <span className="faint">Reps</span>
                  <div className="num">
                    <b>{reps[current]}</b>
                    {stage.reps && <span className="faint"> / {stage.reps}</span>}
                  </div>
                </div>
                <button type="button" className="round-btn" onClick={addRep} aria-label={`Add a rep (${reps[current]} so far)`}>
                  <Ms name="add" />
                </button>
              </div>
              {chips.length > 0 && (
                <div className="row">
                  {chips.map((c) => (
                    <span key={c} className="chip">
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="stack-lg sticky">
          <SessionChecklist stages={stages} current={current} completed={completed} />
          <Tip>Stop while {dog.name} still wants more. Slowing down, sniffing or looking away means it&apos;s time for a break.</Tip>
          <Link className="link" href="/practice?pick=1">
            Choose another lesson
            <Ms name="swap_horiz" />
          </Link>
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
      {error && (
        <p className="tip warm" role="alert">
          <Ms name="error" />
          {error}
        </p>
      )}
      <div className="action-bar">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCurrent(Math.max(0, current - 1))} disabled={current === 0 || pending} style={current === 0 ? { opacity: 0.5 } : undefined}>
          <Ms name="arrow_back" size="sm" />
          Previous step
        </button>
        <div className="row">
          <Link className="link" href={`/feedback/new?lesson=${lesson.id}`}>
            <Ms name="videocam" />
            Record this for Roni
          </Link>
          {startedAt !== null && !isLast && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => save(completed, true)} disabled={pending}>
              <Ms name="stop" size="sm" />
              Save &amp; stop
            </button>
          )}
          <button type="button" className="btn btn-primary" onClick={next} disabled={pending}>
            {isLast ? (pending ? "Saving…" : "Finish session") : "Next step"}
            <Ms name={isLast ? "check" : "arrow_forward"} size="sm" />
          </button>
        </div>
      </div>
    </>
  );
}
