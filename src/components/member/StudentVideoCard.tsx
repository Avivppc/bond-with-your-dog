"use client";

import MuxPlayer from "@mux/mux-player-react";
import { useState } from "react";

export default function StudentVideoCard({
  video,
}: {
  video: {
    id: string;
    title: string;
    description: string | null;
    mux_playback_id: string | null;
    status: string;
    created_at: string;
    duration_seconds: number | null;
  };
}) {
  const [playing, setPlaying] = useState(false);
  const ready = video.status === "ready" && video.mux_playback_id;

  function fmt(sec: number | null) {
    if (!sec) return "";
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300">
      <div className="relative aspect-video bg-slate-100">
        {ready && playing ? (
          <MuxPlayer
            playbackId={video.mux_playback_id!}
            streamType="on-demand"
            autoPlay
            style={{ width: "100%", height: "100%", aspectRatio: "16/9" }}
          />
        ) : ready ? (
          <button
            onClick={() => setPlaying(true)}
            className="absolute inset-0 group"
            aria-label={`Play ${video.title}`}
          >
            <img
              src={`https://image.mux.com/${video.mux_playback_id}/thumbnail.jpg?width=640&fit_mode=preserve`}
              alt={video.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                <span
                  className="material-symbols-outlined text-4xl text-white"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  play_arrow
                </span>
              </div>
            </div>
            {video.duration_seconds ? (
              <span className="absolute bottom-3 right-3 bg-black/60 text-white text-[10px] px-2 py-1 rounded font-bold">
                {fmt(video.duration_seconds)}
              </span>
            ) : null}
          </button>
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center text-sm font-bold"
            style={{ color: "#515d64" }}
          >
            {video.status === "preparing" ? "Processing…" : "Unavailable"}
          </div>
        )}
      </div>
      <div className="p-4">
        <h4
          className="font-bold"
          style={{ fontFamily: "var(--font-headline)", color: "#243036" }}
        >
          {video.title}
        </h4>
        <p
          className="text-xs flex items-center gap-1 mt-1"
          style={{ color: "#515d64" }}
        >
          <span className="material-symbols-outlined text-[14px]">schedule</span>
          {new Date(video.created_at).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}
