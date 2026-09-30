"use client";

import * as UpChunk from "@mux/upchunk";

/** Browser side of "send a video to Roni": read the clip's length, upload to Mux, confirm. */

/** Duration from the file's metadata; null when this browser can't read the format. */
export function readVideoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    const done = (value: number | null) => {
      URL.revokeObjectURL(url);
      video.removeAttribute("src");
      resolve(value);
    };
    const timer = window.setTimeout(() => done(null), 8000);
    video.preload = "metadata";
    video.muted = true;
    video.onloadedmetadata = () => {
      window.clearTimeout(timer);
      done(Number.isFinite(video.duration) && video.duration > 0 ? video.duration : null);
    };
    video.onerror = () => {
      window.clearTimeout(timer);
      done(null);
    };
    video.src = url;
  });
}

export interface StartUploadInput {
  dogId: string | null;
  moveId: string | null;
  lessonId: string | null;
  note: string;
  file: File;
  durationSeconds: number | null;
}

async function errorFrom(res: Response): Promise<string> {
  const body: unknown = await res.json().catch(() => null);
  const message = body && typeof body === "object" && "error" in body ? String((body as { error: unknown }).error) : null;
  return message ?? "Something went wrong. Please try again.";
}

export async function startUpload(input: StartUploadInput): Promise<{ videoId: string; uploadUrl: string }> {
  const res = await fetch("/api/feedback/uploads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      dogId: input.dogId,
      moveId: input.moveId,
      lessonId: input.lessonId,
      note: input.note,
      file: { name: input.file.name, type: input.file.type, size: input.file.size },
      durationSeconds: input.durationSeconds,
    }),
  });
  if (!res.ok) throw new Error(await errorFrom(res));
  return (await res.json()) as { videoId: string; uploadUrl: string };
}

export function uploadToMux(uploadUrl: string, file: File, onProgress: (percent: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const upload = UpChunk.createUpload({ endpoint: uploadUrl, file });
    upload.on("progress", (p) => onProgress(Math.round(p.detail)));
    upload.on("error", (err) => reject(new Error(err.detail?.message || "The upload stopped. Please try again.")));
    upload.on("success", () => resolve());
  });
}

/** The upload to Mux failed: remove the unfinished video so it doesn't linger. Best effort. */
export async function abandonUpload(videoId: string): Promise<void> {
  await fetch(`/api/feedback/uploads/${videoId}`, { method: "DELETE" }).catch(() => undefined);
}

/** Asks the server to check Mux a few times; the list page keeps checking after that. */
export async function confirmUpload(videoId: string, attempts = 4): Promise<string> {
  let status = "uploading";
  for (let i = 0; i < attempts && status === "uploading"; i++) {
    if (i > 0) await new Promise((r) => window.setTimeout(r, 2000));
    const res = await fetch(`/api/feedback/uploads/${videoId}/finalize`, { method: "POST" });
    if (!res.ok) break;
    status = ((await res.json()) as { status: string }).status;
  }
  return status;
}
