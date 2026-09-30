"use client";

import { useId, useState } from "react";
import { Ms } from "@/components/app/ui";
import { createClient } from "@/lib/supabase/client";
import { musicDisplayName, ROUTINE_MUSIC_BUCKET, validateMusicFile } from "@/lib/practice/music";
import { MAX_ROUTINE_SECONDS } from "@/lib/practice/timeline";
import { startMusicUpload } from "../actions";
import { readAudioDuration } from "./usePreview";

export interface UploadedMusic {
  path: string;
  name: string;
  durationSeconds: number;
  file: File;
  localUrl: string;
}

const ACCEPT = "audio/mpeg,audio/mp4,audio/x-m4a,audio/aac,audio/wav,audio/ogg,.mp3,.m4a,.aac,.wav,.ogg";

/** Choose a song: checks it, reads its length in the browser, uploads it to the private bucket. */
export function MusicPicker({ variant, onUploaded }: { variant: "drop" | "link"; onUploaded: (music: UploadedMusic) => void }) {
  const [status, setStatus] = useState<{ busy: boolean; text: string; error?: boolean } | null>(null);
  const inputId = useId();

  async function handle(file: File) {
    const invalid = validateMusicFile(file);
    if (invalid) return setStatus({ busy: false, text: invalid, error: true });
    const localUrl = URL.createObjectURL(file);
    let duration: number;
    try {
      duration = await readAudioDuration(localUrl);
    } catch {
      URL.revokeObjectURL(localUrl);
      return setStatus({ busy: false, text: "That file couldn't be read as audio.", error: true });
    }
    if (duration > MAX_ROUTINE_SECONDS) {
      URL.revokeObjectURL(localUrl);
      return setStatus({ busy: false, text: "Songs can be up to 20 minutes long.", error: true });
    }
    setStatus({ busy: true, text: `Uploading ${file.name}…` });
    const started = await startMusicUpload({ fileName: file.name, size: file.size });
    if (!started.ok) {
      URL.revokeObjectURL(localUrl);
      return setStatus({ busy: false, text: started.error, error: true });
    }
    const { error } = await createClient()
      .storage.from(ROUTINE_MUSIC_BUCKET)
      .uploadToSignedUrl(started.data.path, started.data.token, file, { contentType: started.data.contentType });
    if (error) {
      console.error("[routine] music upload failed", error.message);
      URL.revokeObjectURL(localUrl);
      return setStatus({ busy: false, text: "The upload didn't finish. Please try again.", error: true });
    }
    setStatus(null);
    onUploaded({ path: started.data.path, name: musicDisplayName(file.name), durationSeconds: Math.round(duration), file, localUrl });
  }

  const input = (
    <input
      id={inputId}
      type="file"
      accept={ACCEPT}
      className="sr-only"
      disabled={status?.busy}
      onChange={(e) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (file) void handle(file);
      }}
    />
  );
  const message = status && (
    <span className="faint" role={status.error ? "alert" : "status"} style={status.error ? { color: "var(--danger)" } : undefined}>
      {status.text}
    </span>
  );

  if (variant === "link") {
    return (
      <div className="stack" style={{ gap: 4, alignItems: "flex-end" }}>
        <label htmlFor={inputId} className="link" style={{ cursor: "pointer" }}>
          {status?.busy ? "Uploading…" : "Change music"}
          <Ms name="swap_horiz" />
        </label>
        {input}
        {message}
      </div>
    );
  }
  return (
    <label htmlFor={inputId} className={`drop ${status?.busy ? "has" : ""}`}>
      <Ms name="library_music" />
      <b>{status?.busy ? "Uploading your music…" : "Choose your music"}</b>
      <span className="faint">MP3, M4A, AAC, WAV or OGG · up to 20 MB and 20 minutes</span>
      {input}
      {message}
    </label>
  );
}
