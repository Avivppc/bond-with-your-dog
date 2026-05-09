"use client";

import { useState } from "react";
import * as UpChunk from "@mux/upchunk";
import { useRouter } from "next/navigation";

export default function VideoUploader({
  onClose,
  defaultCourseId,
  defaultLessonId,
}: {
  onClose?: () => void;
  defaultCourseId?: string | null;
  defaultLessonId?: string | null;
}) {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "uploading" | "processing" | "done" | "error">("form");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) {
      setError("Please choose a video file.");
      return;
    }
    const fd = new FormData(e.currentTarget);
    setError(null);
    setStep("uploading");

    try {
      // 1. Create Mux direct upload
      const initRes = await fetch("/api/uploads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: fd.get("title"),
          description: fd.get("description") || undefined,
          course_id: defaultCourseId ?? null,
          lesson_id: defaultLessonId ?? null,
          consent_public: fd.get("consent_public") === "on",
        }),
      });
      if (!initRes.ok) {
        const body = await initRes.json().catch(() => ({}));
        throw new Error(body.error || `init failed: ${initRes.status}`);
      }
      const { videoId, uploadUrl } = await initRes.json();

      // 2. Upload the file to Mux (chunked, resumable)
      await new Promise<void>((resolve, reject) => {
        const upload = UpChunk.createUpload({ endpoint: uploadUrl, file });
        upload.on("error", (err) => reject(new Error(err.detail?.message || "upload failed")));
        upload.on("progress", (p) => setProgress(Math.round(p.detail)));
        upload.on("success", () => resolve());
      });

      // 3. Poll finalize until ready
      setStep("processing");
      let attempts = 0;
      while (attempts < 60) {
        const r = await fetch(`/api/uploads/${videoId}/finalize`, { method: "POST" });
        const j = await r.json();
        if (j.status === "ready") {
          setStep("done");
          router.refresh();
          return;
        }
        if (j.status === "errored") {
          throw new Error("Mux failed to process this video.");
        }
        attempts++;
        await new Promise((res) => setTimeout(res, 2500));
      }
      throw new Error("Processing took too long. Check back in a few minutes.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setStep("error");
    }
  }

  if (step === "done") {
    return (
      <div className="text-center py-8">
        <span
          className="material-symbols-outlined text-5xl mb-3 block"
          style={{ color: "#0e666a", fontVariationSettings: "'FILL' 1" }}
        >
          check_circle
        </span>
        <h3
          className="text-2xl font-extrabold mb-2"
          style={{ fontFamily: "var(--font-headline)" }}
        >
          Uploaded!
        </h3>
        <p className="text-sm mb-6" style={{ color: "#515d64" }}>
          Your video is processed. If you opted to share publicly, an admin will review before
          adding it to the spotlight.
        </p>
        {onClose && (
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-full font-bold text-sm kinetic-gradient"
            style={{ color: "#fff0e6" }}
          >
            Close
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
      )}

      {step === "uploading" || step === "processing" ? (
        <div className="py-8 text-center">
          <p className="text-sm font-bold mb-3" style={{ color: "#243036" }}>
            {step === "uploading" ? `Uploading… ${progress}%` : "Processing video…"}
          </p>
          <div className="h-2 w-full rounded-full overflow-hidden" style={{ backgroundColor: "#dbebf4" }}>
            <div
              className="h-full kinetic-gradient transition-all"
              style={{ width: step === "uploading" ? `${progress}%` : "100%" }}
            />
          </div>
          {step === "processing" && (
            <p className="text-xs mt-3" style={{ color: "#515d64" }}>
              Mux is encoding your video. This usually takes under a minute.
            </p>
          )}
        </div>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Title
            </span>
            <input
              name="title"
              type="text"
              required
              minLength={2}
              maxLength={120}
              placeholder="My latest routine"
              className="px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-orange-300 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Description (optional)
            </span>
            <textarea
              name="description"
              rows={3}
              maxLength={2000}
              className="px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-orange-300 focus:outline-none resize-none"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Video file
            </span>
            <input
              type="file"
              accept="video/*"
              required
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="text-sm"
            />
            <span className="text-xs text-slate-500">
              MP4, MOV, or any common format. Max ~5GB.
            </span>
          </label>
          <label className="flex items-center gap-3">
            <input type="checkbox" name="consent_public" className="w-4 h-4" />
            <span className="text-xs text-slate-600">
              I consent to my video being featured publicly in the Member Spotlight (admin review
              required).
            </span>
          </label>
          <div className="flex gap-3 justify-end">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-full font-bold text-sm border-2"
                style={{ borderColor: "#a2afb6", color: "#515d64" }}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="px-6 py-2.5 rounded-full font-bold text-sm kinetic-gradient"
              style={{ color: "#fff0e6" }}
            >
              Upload
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
