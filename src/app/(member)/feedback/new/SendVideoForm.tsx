"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ms, ProgressLine } from "@/components/app/ui";
import type { SubjectOption } from "@/lib/feedback/subjects";
import { checkVideoDuration, checkVideoFile, formatBytes, VIDEO_ACCEPT } from "@/lib/feedback/video-file";
import { formatClock } from "@/lib/feedback/format";
import { abandonUpload, confirmUpload, readVideoDuration, startUpload, uploadToMux } from "./upload-client";

interface Chosen {
  file: File;
  duration: number | null;
}

type Phase = "idle" | "uploading" | "processing";

const GROUPS = ["Moves", "Lessons", "Other"] as const;

export function SendVideoForm({
  options,
  initial,
  dogId,
  dogName,
}: {
  options: SubjectOption[];
  initial: string;
  dogId: string | null;
  dogName: string | null;
}) {
  const router = useRouter();
  const [subject, setSubject] = useState(initial);
  const [chosen, setChosen] = useState<Chosen | null>(null);
  const [note, setNote] = useState("");
  const [dragging, setDragging] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const busy = phase !== "idle";

  async function pick(file: File | undefined) {
    if (!file || busy) return;
    setError(null);
    const invalid = checkVideoFile(file);
    if (invalid) {
      setChosen(null);
      setError(invalid);
      return;
    }
    const duration = await readVideoDuration(file);
    const tooLong = duration === null ? null : checkVideoDuration(duration);
    if (tooLong) {
      setChosen(null);
      setError(tooLong);
      return;
    }
    setChosen({ file, duration });
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    if (!chosen) {
      setError("Please add your video first.");
      return;
    }
    const option = options.find((o) => o.value === subject);
    setError(null);
    setPhase("uploading");
    setProgress(0);
    try {
      const { videoId, uploadUrl } = await startUpload({
        dogId,
        moveId: option?.moveId ?? null,
        lessonId: option?.lessonId ?? null,
        note: note.trim(),
        file: chosen.file,
        durationSeconds: chosen.duration,
      });
      try {
        await uploadToMux(uploadUrl, chosen.file, setProgress);
      } catch (uploadError) {
        await abandonUpload(videoId);
        throw uploadError;
      }
      setPhase("processing");
      await confirmUpload(videoId);
      router.push("/feedback?sent=1");
    } catch (err) {
      setPhase("idle");
      setError(err instanceof Error ? err.message : "The upload didn't finish. Please try again.");
    }
  }

  const dropSub = chosen
    ? `${formatBytes(chosen.file.size)}${chosen.duration ? ` · ${formatClock(chosen.duration)}` : ""} · ready to send`
    : "MP4 or MOV · up to 2 minutes";

  return (
    <form className="card" style={{ gap: 26 }} onSubmit={submit} noValidate>
      <div className="stack">
        <div className="row">
          <span className="num-step">1</span>
          <label htmlFor="upMove">
            <b>What&apos;s this video about?</b>
          </label>
        </div>
        <select className="input" id="upMove" value={subject} onChange={(e) => setSubject(e.target.value)} disabled={busy}>
          {GROUPS.map((g) => {
            const items = options.filter((o) => o.group === g);
            if (items.length === 0) return null;
            const list = items.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ));
            return g === "Other" ? list : <optgroup key={g} label={g}>{list}</optgroup>;
          })}
        </select>
      </div>

      <div className="stack">
        <div className="row">
          <span className="num-step">2</span>
          <b id="upFileLabel">Add your video</b>
        </div>
        <label
          className={`drop focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 ${chosen || dragging ? "has" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void pick(e.dataTransfer.files[0]);
          }}
        >
          <input
            id="upFile"
            type="file"
            accept={VIDEO_ACCEPT}
            className="sr-only"
            aria-labelledby="upFileLabel"
            aria-describedby="upFileHint"
            disabled={busy}
            onChange={(e) => void pick(e.target.files?.[0])}
          />
          <Ms name={chosen ? "check_circle" : "cloud_upload"} />
          <b>{chosen ? chosen.file.name : "Drop a video here or choose a file"}</b>
          <span className="faint" id="upFileHint">
            {dropSub}
          </span>
        </label>
        {chosen && chosen.duration === null && (
          <span className="faint">We couldn&apos;t check this clip&apos;s length here. Please make sure it&apos;s 2 minutes or less.</span>
        )}
      </div>

      <div className="stack">
        <div className="row">
          <span className="num-step">3</span>
          <label htmlFor="upNote">
            <b>A note for Roni</b>
          </label>
        </div>
        <textarea
          className="input"
          id="upNote"
          maxLength={2000}
          value={note}
          disabled={busy}
          onChange={(e) => setNote(e.target.value)}
          placeholder={`What should Roni look at? For example: ${dogName ?? "Luna"} spins left easily but hesitates to the right.`}
        />
      </div>

      {busy && (
        <ProgressLine
          label={phase === "uploading" ? "Uploading your video" : "Getting it ready for Roni"}
          value={phase === "uploading" ? `${progress}%` : "Almost done"}
          percent={phase === "uploading" ? progress : 100}
        />
      )}
      {error && (
        <div className="tip warm" role="alert">
          <Ms name="error" />
          <div>{error}</div>
        </div>
      )}

      <div className="between">
        <span className="faint">You&apos;ll get a notification when Roni replies.</span>
        <button className="btn btn-primary" type="submit" disabled={busy}>
          <Ms name="send" size="sm" />
          {busy ? "Sending…" : "Send to Roni"}
        </button>
      </div>
    </form>
  );
}
