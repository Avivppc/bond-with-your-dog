"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SavedReplies } from "@/app/admin/_components/SavedReplies";
import { formatClock } from "@/lib/feedback/format";
import { COACH_LEVELS, UNNAMED_MEMBER, type CoachLevel } from "@/lib/feedback/status";
import { isFilledIn } from "@/lib/saved-replies/replies";
import type { QueueVideo, ReviewDetail } from "@/lib/feedback/studio";
import { NotedPlayer, type PlayerHandle } from "../feedback/_components/NotedPlayer";
import { Conversation } from "../feedback/_components/Conversation";
import { useToast } from "../feedback/_components/Toast";
import { NotesEditor } from "./NotesEditor";
import { StaffReply } from "./StaffReply";
import { pinNote, sendFeedback, setCoachLevel } from "./actions";

/** The Studio's right-hand card: watch, pin notes at the playhead, set the level, send. */
export function ReviewPanel({ video, detail }: { video: QueueVideo; detail: ReviewDetail }) {
  const player = useRef<PlayerHandle>(null);
  const summaryRef = useRef<HTMLTextAreaElement>(null);
  const [time, setTime] = useState(0);
  const [note, setNote] = useState("");
  const [summary, setSummary] = useState(video.summary ?? "");
  const [level, setLevel] = useState<CoachLevel | null>(detail.level);
  const [pending, start] = useTransition();
  const [toast, showToast] = useToast();
  const router = useRouter();
  const first = video.memberName.split(/\s+/)[0];
  const who = video.dogName ? `${first} & ${video.dogName}` : video.memberName;
  const canLevel = Boolean(video.dog_id && video.move_id);
  // No profile name: leave {{first_name}} unfilled so the team notices, rather than "Hi Member".
  const replyVars = { first_name: video.memberName === UNNAMED_MEMBER ? null : first, dog_name: video.dogName, move_name: video.moveName };

  function pin() {
    const at = player.current?.currentTime() ?? time;
    start(async () => {
      const res = await pinNote({ videoId: video.id, atSeconds: at, body: note });
      if (!res.ok) return showToast(res.error);
      setNote("");
      showToast(`Note pinned at ${formatClock(at)}`);
    });
  }

  function chooseLevel(value: CoachLevel) {
    const previous = level;
    setLevel(value);
    start(async () => {
      const res = await setCoachLevel({ videoId: video.id, level: value });
      if (!res.ok) {
        setLevel(previous);
        showToast(res.error);
      }
    });
  }

  function send() {
    start(async () => {
      const res = await sendFeedback({ videoId: video.id, summary });
      if (!res.ok) return showToast(res.error);
      if (!res.data.firstSend) return showToast("Summary updated");
      // The video moves to "Done": follow it there and confirm how the member was told.
      router.replace(`/studio?${new URLSearchParams({ q: "done", id: video.id, sent: res.data.email ?? "failed" })}`, { scroll: false });
    });
  }

  return (
    <div className="card">
      <NotedPlayer
        handleRef={player}
        playbackId={video.mux_playback_id}
        fallbackDuration={video.duration_seconds}
        notes={detail.notes}
        title={video.title}
        onTime={setTime}
      />
      <div>
        <b>
          {who} · {video.moveName ?? video.title}
        </b>
        {video.note && <div className="faint">&quot;{video.note}&quot;</div>}
      </div>

      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          if (note.trim()) pin();
        }}
      >
        <span className="chip num" aria-label="Current time">
          {formatClock(time)}
        </span>
        <input
          className="input"
          style={{ flex: 1, height: 40, minWidth: 0 }}
          value={note}
          maxLength={1000}
          onChange={(e) => setNote(e.target.value)}
          placeholder={`Add a note at ${formatClock(time)}`}
          aria-label="Note at the current time"
        />
        <button className="btn btn-ghost btn-sm" type="submit" disabled={pending || !note.trim()}>
          Pin
        </button>
      </form>
      <NotesEditor notes={detail.notes} onSeek={(t) => player.current?.seek(t)} onError={showToast} />

      <label className="sr-only" htmlFor="summaryInput">
        Summary for {first}
      </label>
      <textarea
        ref={summaryRef}
        className="input"
        id="summaryInput"
        maxLength={4000}
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        placeholder={`Summary for ${first}. The first sentence becomes the headline.`}
      />
      <SavedReplies textareaRef={summaryRef} value={summary} onChange={setSummary} vars={replyVars} />
      <div className="row">
        <span className="label" id="levelLabel">
          Set level
        </span>
        <div className="seg" role="radiogroup" aria-labelledby="levelLabel">
          {COACH_LEVELS.map((l) => (
            <button
              key={l.value}
              type="button"
              role="radio"
              aria-checked={level === l.value}
              className={level === l.value ? "on" : undefined}
              disabled={!canLevel || pending}
              onClick={() => chooseLevel(l.value)}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>
      {!canLevel && <span className="faint">This video isn&apos;t linked to a dog and a move, so there&apos;s no level to set.</span>}
      <button className="btn btn-primary" type="button" onClick={send} disabled={pending || !summary.trim() || !isFilledIn(summary)}>
        {video.status === "replied" ? "Update summary" : "Send feedback"}
      </button>

      {detail.messages.length > 0 && (
        <div className="stack" style={{ gap: 4 }}>
          <span className="eyebrow muted">Conversation</span>
          <Conversation messages={detail.messages} staffView memberName={first} />
        </div>
      )}
      {(video.status === "replied" || detail.messages.length > 0) && <StaffReply videoId={video.id} memberName={first} vars={replyVars} onDone={showToast} />}
      {toast}
    </div>
  );
}
