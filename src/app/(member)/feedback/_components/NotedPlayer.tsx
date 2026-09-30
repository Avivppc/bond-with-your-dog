"use client";

import { useImperativeHandle, useRef, useState } from "react";
import MuxPlayer, { type MuxPlayerRefAttributes } from "@mux/mux-player-react";
import { Ms } from "@/components/app/ui";
import { formatClock, formatTimer, markerPercent, type TimedNote } from "@/lib/feedback/format";

export interface PlayerHandle {
  seek(seconds: number): void;
  currentTime(): number;
}

const KEY_STEP_SECONDS = 5;

/**
 * The design's feedback player: a Mux video with the design's own controls — a scrub bar with a
 * gold marker per note, play/pause, time, half speed and fullscreen.
 */
export function NotedPlayer({
  playbackId,
  fallbackDuration,
  notes,
  title,
  onTime,
  handleRef,
}: {
  playbackId: string | null;
  fallbackDuration: number | null;
  notes: TimedNote[];
  title: string;
  onTime?: (seconds: number) => void;
  handleRef?: React.Ref<PlayerHandle>;
}) {
  const player = useRef<MuxPlayerRefAttributes>(null);
  const frame = useRef<HTMLDivElement>(null);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(fallbackDuration ?? 0);
  const [playing, setPlaying] = useState(false);
  const [slow, setSlow] = useState(false);

  function seek(seconds: number) {
    const t = Math.max(0, Math.min(duration || seconds, seconds));
    if (player.current) player.current.currentTime = t;
    setTime(t);
    onTime?.(t);
  }

  useImperativeHandle(handleRef, () => ({ seek, currentTime: () => player.current?.currentTime ?? time }));

  function togglePlay() {
    const el = player.current;
    if (!el) return;
    if (el.paused) void el.play();
    else el.pause();
  }

  function toggleSpeed() {
    const next = !slow;
    setSlow(next);
    if (player.current) player.current.playbackRate = next ? 0.5 : 1;
  }

  function fullscreen() {
    const el = frame.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.();
  }

  function scrubTo(e: React.PointerEvent<HTMLDivElement>) {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    seek(((e.clientX - rect.left) / rect.width) * duration);
  }

  function scrubKeys(e: React.KeyboardEvent<HTMLDivElement>) {
    const moves: Record<string, number> = { ArrowRight: KEY_STEP_SECONDS, ArrowLeft: -KEY_STEP_SECONDS };
    if (e.key in moves) {
      e.preventDefault();
      seek(time + moves[e.key]);
    } else if (e.key === "Home") {
      e.preventDefault();
      seek(0);
    } else if (e.key === "End" && duration) {
      e.preventDefault();
      seek(duration);
    }
  }

  const pct = markerPercent(time, duration);
  return (
    <div className="player" ref={frame}>
      {playbackId ? (
        <div style={{ position: "absolute", inset: 0 }} onClick={togglePlay}>
        <MuxPlayer
          ref={player}
          playbackId={playbackId}
          streamType="on-demand"
          metadata={{ video_title: title }}
          style={{ position: "absolute", inset: "0", width: "100%", height: "100%", "--controls": "none" }}
          onLoadedMetadata={() => setDuration(player.current?.duration || fallbackDuration || 0)}
          onTimeUpdate={() => {
            const t = player.current?.currentTime ?? 0;
            setTime(t);
            onTime?.(t);
          }}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
        />
        </div>
      ) : (
        <div className="stack" style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "#eaf6fb" }}>
          <span>Your video is still being prepared.</span>
        </div>
      )}
      <div className="controls">
        <div
          className="scrub"
          role="slider"
          tabIndex={0}
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(time)}
          aria-valuetext={`${formatClock(time)} of ${formatClock(duration)}`}
          onPointerDown={scrubTo}
          onKeyDown={scrubKeys}
          style={{ cursor: duration ? "pointer" : "default" }}
        >
          <i style={{ width: `${pct}%` }} />
          {notes.map((n) => (
            <button
              key={n.id}
              type="button"
              className="mark"
              style={{ left: `${markerPercent(n.at_seconds, duration)}%` }}
              aria-label={`Note at ${formatClock(n.at_seconds)}: ${n.body}`}
              title={`${formatClock(n.at_seconds)} · ${n.body}`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => seek(n.at_seconds)}
            />
          ))}
          <span className="knob" style={{ left: `${pct}%` }} />
        </div>
        <div className="ctrl-row">
          <button type="button" onClick={togglePlay} aria-label={playing ? "Pause" : "Play"} disabled={!playbackId}>
            <Ms name={playing ? "pause" : "play_arrow"} fill />
          </button>
          <span className="num">
            {formatTimer(time)} / {formatTimer(duration)}
          </span>
          <span className="sp" />
          <button type="button" onClick={toggleSpeed} aria-pressed={slow} aria-label="Half speed" disabled={!playbackId}>
            {slow ? "0.5×" : "1×"}
          </button>
          <button type="button" onClick={fullscreen} aria-label="Fullscreen">
            <Ms name="fullscreen" />
          </button>
        </div>
      </div>
    </div>
  );
}
