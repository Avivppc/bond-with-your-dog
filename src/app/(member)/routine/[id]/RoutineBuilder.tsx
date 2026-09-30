"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Ms, Tip } from "@/components/app/ui";
import type { SkillLevel } from "@/lib/member/viewer";
import { activeBlockIndex, addBlock, fitToDuration, formatTimecode, LANES, moveBlock, plannedSeconds, removeBlock, resizeBlock, snap, SNAP_SECONDS, type RoutineItem } from "@/lib/practice/timeline";
import { discardMusicUpload, saveRoutine } from "../actions";
import { BlockControls, type BlockCommand } from "./BlockControls";
import { MusicPicker, type UploadedMusic } from "./MusicPicker";
import { SendToRoni } from "./SendToRoni";
import { Timeline } from "./Timeline";
import { usePreview } from "./usePreview";

export interface PaletteMove {
  id: string;
  name: string;
  image: string;
  level: SkillLevel | null;
}

export interface BuilderRoutine {
  id: string;
  name: string;
  items: RoutineItem[];
  music: { path: string; name: string; durationSeconds: number } | null;
  bpm: number | null;
  sentAt: string | null;
}

interface Props {
  routine: BuilderRoutine;
  musicUrl: string | null;
  palette: PaletteMove[];
  names: Record<string, string>;
  dogName: string;
}

/** What "saved" means: the moves, the BPM and which song is attached. */
function snapshot(items: RoutineItem[], bpm: number | null, music: BuilderRoutine["music"]): string {
  return JSON.stringify({ items, bpm, music: music?.path ?? null });
}

const LEVEL_NOTE: Partial<Record<SkillLevel, string>> = { reliable: "Reliable", performance: "Ready" };

export function RoutineBuilder({ routine, musicUrl, palette, names: nameRecord, dogName }: Props) {
  const [items, setItems] = useState(routine.items);
  const [music, setMusic] = useState(routine.music);
  const [bpm, setBpm] = useState<number | null>(routine.bpm);
  const [saved, setSaved] = useState(() => snapshot(routine.items, routine.bpm, routine.music));
  // The page mints a fresh signed URL on every re-render; keep the first one so playback and the
  // waveform don't restart after each save.
  const [savedUrl] = useState(musicUrl);
  const [selected, setSelected] = useState<number | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [local, setLocal] = useState<{ url: string; file: File } | null>(null);
  const [pending, start] = useTransition();
  const names = useMemo(() => new Map(Object.entries(nameRecord)), [nameRecord]);
  const preview = usePreview(local?.url ?? savedUrl);
  const duration = music?.durationSeconds ?? 0;
  const dirty = snapshot(items, bpm, music) !== saved;
  const step = bpm ? Math.max(SNAP_SECONDS, snap(60 / bpm)) : SNAP_SECONDS;
  const activeIndex = preview.playing || preview.time > 0 ? activeBlockIndex(items, preview.time) : -1;

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(() => () => {
    if (local) URL.revokeObjectURL(local.url);
  }, [local]);

  function change(next: RoutineItem[], text?: string) {
    setItems(next);
    setMessage(text ? { ok: false, text } : null);
  }

  function persist(next: { items: RoutineItem[]; bpm: number | null; music: BuilderRoutine["music"] }, okText: string, onFail?: () => void) {
    setMessage(null);
    start(async () => {
      const res = await saveRoutine({ id: routine.id, items: next.items, bpm: next.bpm, music: next.music });
      if (!res.ok) {
        onFail?.();
        return setMessage({ ok: false, text: res.error });
      }
      setSaved(snapshot(next.items, next.bpm, next.music));
      setMessage({ ok: true, text: okText });
    });
  }

  function onUploaded(m: UploadedMusic) {
    const before = { items, music };
    const nextMusic = { path: m.path, name: m.name, durationSeconds: m.durationSeconds };
    const fitted = fitToDuration(items, m.durationSeconds);
    setLocal({ url: m.localUrl, file: m.file });
    setMusic(nextMusic);
    setItems(fitted);
    setSelected(null);
    const text = fitted.length < items.length ? "Music saved. Moves past the end of the new song were removed." : "Music saved.";
    persist({ items: fitted, bpm, music: nextMusic }, text, () => {
      // Keep the previous song and drop the file that never got attached.
      setMusic(before.music);
      setItems(before.items);
      setLocal(null); // the previous local file URL was already released
      void discardMusicUpload(m.path);
    });
  }

  function add(moveId: string) {
    const res = addBlock(items, moveId, duration, bpm);
    change(res.items, res.ok ? undefined : res.error);
    if (res.ok) setSelected(res.items.findIndex((it) => it.move_id === moveId && !items.includes(it)));
  }

  function command(cmd: BlockCommand) {
    if (selected === null || !items[selected]) return;
    const it = items[selected];
    if (cmd === "remove") {
      change(removeBlock(items, selected));
      setSelected(null);
    } else if (cmd === "shorter" || cmd === "longer") {
      change(resizeBlock(items, selected, it.end + (cmd === "shorter" ? -step : step), duration));
    } else {
      const start = cmd === "earlier" ? it.start - step : cmd === "later" ? it.start + step : it.start;
      const lane = cmd === "lane" ? (it.lane + 1) % LANES : it.lane;
      const res = moveBlock(items, selected, start, lane, duration);
      change(res.items, res.ok ? undefined : res.error);
    }
  }

  const planned = Math.round(plannedSeconds(items));
  const blockedReason = !music ? "Add music first." : items.length === 0 ? "Add some moves first." : dirty ? "Save your changes first." : null;

  return (
    <>
      <div className="between">
        <div className="head-block">
          <span className="eyebrow">Let&apos;s Dance · Routine builder</span>
          <h1 className="h1">{routine.name}</h1>
          <p className="lede">Lay {dogName}&apos;s reliable moves on the music. Start and end with a move {dogName} loves.</p>
        </div>
        <div className="row">
          <button type="button" className="btn btn-ghost btn-sm" onClick={preview.toggle} disabled={!music}>
            <Ms name={preview.playing ? "pause" : "play_arrow"} size="sm" />
            {preview.playing ? "Pause" : "Preview"}
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => persist({ items, bpm, music }, "Routine saved.")} disabled={pending || !dirty}>
            <Ms name="check" size="sm" />
            {pending ? "Saving…" : dirty ? "Save routine" : "Saved"}
          </button>
        </div>
      </div>
      <div className="card">
        {music ? (
          <>
            <div className="card-head" style={{ flexWrap: "wrap" }}>
              <div className="row">
                <div className="sketch" style={{ width: 52, height: 52, background: "var(--ink)", color: "#ffd59a" }}>
                  <Ms name="music_note" fill />
                </div>
                <div>
                  <b>{music.name}</b>
                  <div className="faint num">
                    Your upload · {formatTimecode(music.durationSeconds)}
                    {bpm ? ` · ${bpm} BPM` : ""}
                  </div>
                </div>
              </div>
              <div className="row" style={{ alignItems: "flex-start" }}>
                <label className="faint row" style={{ gap: 6 }}>
                  BPM
                  <input
                    className="input"
                    type="number"
                    min={30}
                    max={300}
                    value={bpm ?? ""}
                    onChange={(e) => setBpm(e.target.value ? Math.min(300, Math.max(30, Math.round(Number(e.target.value)))) : null)}
                    style={{ width: 84, height: 38, padding: "0 10px" }}
                    aria-describedby="bpm-help"
                  />
                </label>
                <MusicPicker variant="link" onUploaded={onUploaded} />
              </div>
            </div>
            <span id="bpm-help" className="sr-only">
              Optional. With a BPM, new moves span two bars and nudges move by one beat.
            </span>
            <Timeline items={items} names={names} duration={duration} bpm={bpm} selected={selected} activeIndex={activeIndex} playhead={preview.playing || preview.time > 0 ? preview.time : null} waveSource={local?.file ?? savedUrl} onSelect={setSelected} onChange={change} />
            {selected !== null && items[selected] && <BlockControls item={items[selected]} name={names.get(items[selected].move_id) ?? "Move"} onCommand={command} />}
            <p className="sr-only" aria-live="polite">
              {preview.playing && activeIndex >= 0 ? `Now: ${names.get(items[activeIndex].move_id) ?? "Move"}` : ""}
            </p>
            <div className="between">
              <span className="faint num">
                {items.length} {items.length === 1 ? "move" : "moves"} · {planned}s of {duration}s planned · select a move to edit it, or drag it
                {preview.playing && activeIndex >= 0 ? ` · Now: ${names.get(items[activeIndex].move_id)}` : ""}
              </span>
              <SendToRoni routineId={routine.id} sentAt={routine.sentAt} blockedReason={blockedReason} />
            </div>
          </>
        ) : (
          <MusicPicker variant="drop" onUploaded={onUploaded} />
        )}
        {(message || preview.error) && (
          <p className="faint" role={message?.ok ? "status" : "alert"} style={message?.ok ? { color: "var(--teal)" } : { color: "var(--danger)" }}>
            {message?.text ?? preview.error}
          </p>
        )}
      </div>
      <div className="grid-7-5">
        <div className="stack">
          <span className="eyebrow muted">Add a move</span>
          {palette.length === 0 ? (
            <p className="faint">No moves are published yet. They appear here as Roni adds them to the Moves Library.</p>
          ) : (
            <div className="palette">
              {palette.map((m) => (
                <button key={m.id} type="button" onClick={() => add(m.id)} disabled={!music} title={music ? `Add ${m.name}` : "Add music first"} style={music ? undefined : { opacity: 0.5 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- move artwork */}
                  <img src={m.image} alt="" />
                  <span style={{ minWidth: 0 }}>
                    {m.name}
                    {m.level && LEVEL_NOTE[m.level] && <small style={{ display: "block", color: "var(--teal)", fontWeight: 500 }}>{LEVEL_NOTE[m.level]}</small>}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <Tip icon="tips_and_updates" warm>
          <b>Roni&apos;s tip</b>
          <br />
          Leave two seconds of free movement between hard moves. It gives {dogName} time to breathe and reads as musical, not rushed.
        </Tip>
      </div>
    </>
  );
}
