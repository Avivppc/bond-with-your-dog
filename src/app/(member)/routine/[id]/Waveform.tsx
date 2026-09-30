"use client";

import { useEffect, useState } from "react";

const BARS = 160;

/** Loudest sample per slice of the song, normalised to 0–1. */
function peaks(buffer: AudioBuffer, bars: number): number[] {
  const data = buffer.getChannelData(0);
  const size = Math.max(1, Math.floor(data.length / bars));
  const out = Array.from({ length: bars }, (_, i) => {
    let max = 0;
    const end = Math.min(data.length, (i + 1) * size);
    for (let j = i * size; j < end; j += 16) max = Math.max(max, Math.abs(data[j]));
    return max;
  });
  const top = Math.max(...out, 0.0001);
  return out.map((v) => v / top);
}

async function decode(source: Blob | string): Promise<number[]> {
  const bytes = typeof source === "string" ? await (await fetch(source)).arrayBuffer() : await source.arrayBuffer();
  const ctx = new AudioContext();
  try {
    return peaks(await ctx.decodeAudioData(bytes), BARS);
  } finally {
    void ctx.close();
  }
}

/** The song's real waveform (decoded in the browser); the design's plain band while it loads. */
export function Waveform({ source }: { source: Blob | string | null }) {
  const [bars, setBars] = useState<{ source: Blob | string; values: number[] } | null>(null);

  useEffect(() => {
    if (!source) return;
    let alive = true;
    decode(source)
      .then((values) => alive && setBars({ source, values }))
      .catch((err: unknown) => console.error("[routine] waveform decode failed", err));
    return () => {
      alive = false;
    };
  }, [source]);

  if (!bars || bars.source !== source) return <div className="wave" aria-hidden />;
  return (
    <div className="wave" aria-hidden style={{ background: "none", display: "flex", alignItems: "center", gap: 1, WebkitMaskImage: "none" }}>
      {bars.values.map((v, i) => (
        <i key={i} style={{ flex: 1, height: `${Math.max(6, v * 100)}%`, borderRadius: 2, background: "rgba(14, 102, 106, .35)" }} />
      ))}
    </div>
  );
}
