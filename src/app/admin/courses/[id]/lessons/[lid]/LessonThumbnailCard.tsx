"use client";

import { useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { COURSE_IMAGES_BUCKET, validateCourseImage } from "@/lib/lesson-files";
import { effectiveThumbnail, LESSON_THUMBNAIL_HINT } from "@/lib/content/lesson-thumbnail";
import { BTN_SECONDARY, Card } from "@/app/admin/_components/ui";
import { finishLessonThumbnailUpload, removeLessonThumbnail, startLessonThumbnailUpload } from "./thumbnail-actions";
import { MediaPicker } from "@/app/admin/media/MediaPicker";
import { setLessonThumbnailFromLibrary } from "@/app/admin/media/actions";

interface LessonThumbnailCardProps {
  courseId: string;
  lessonId: string;
  /** The custom image the team uploaded, if any. */
  uploadUrl: string | null;
  /** The Vimeo thumbnail, used when there is no upload. */
  videoThumbnailUrl: string | null;
  /** Extra fields under the image (the lesson length input). */
  children?: ReactNode;
}

const SOURCE_LABEL = { upload: "Custom image", video: "From the Vimeo video", none: "" } as const;

/** Kajabi "Lesson thumbnail": upload / replace / remove a custom image; otherwise the Vimeo frame. */
export function LessonThumbnailCard({ courseId, lessonId, uploadUrl, videoThumbnailUrl, children }: LessonThumbnailCardProps) {
  const [upload, setUpload] = useState(uploadUrl);
  const [status, setStatus] = useState<{ tone: "info" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const shown = effectiveThumbnail(upload, videoThumbnailUrl);

  async function uploadFile(file: File): Promise<void> {
    const invalid = validateCourseImage({ name: file.name, size: file.size, type: file.type });
    if (invalid) {
      setStatus({ tone: "error", text: invalid });
      return;
    }
    setBusy(true);
    setStatus({ tone: "info", text: "Uploading…" });
    try {
      const started = await startLessonThumbnailUpload({ courseId, lessonId, fileName: file.name, size: file.size, contentType: file.type });
      if (!started.ok) {
        setStatus({ tone: "error", text: started.error });
        return;
      }
      const { error } = await createClient()
        .storage.from(COURSE_IMAGES_BUCKET)
        .uploadToSignedUrl(started.data.path, started.data.token, file, { contentType: file.type });
      if (error) {
        setStatus({ tone: "error", text: `Upload failed: ${error.message}` });
        return;
      }
      const finished = await finishLessonThumbnailUpload({ courseId, lessonId, path: started.data.path });
      if (!finished.ok) {
        setStatus({ tone: "error", text: finished.error });
        return;
      }
      setUpload(finished.data.url);
      setStatus({ tone: "info", text: "Thumbnail updated." });
    } catch (err) {
      console.error("lesson thumbnail upload failed", err);
      setStatus({ tone: "error", text: "Upload failed — check your connection and try again." });
    } finally {
      setBusy(false);
    }
  }

  async function remove(): Promise<void> {
    if (!window.confirm("Remove the custom thumbnail? The Vimeo thumbnail is used again.")) return;
    setBusy(true);
    try {
      const res = await removeLessonThumbnail({ courseId, lessonId });
      if (!res.ok) {
        setStatus({ tone: "error", text: res.error });
        return;
      }
      setUpload(null);
      setStatus({ tone: "info", text: res.data.fallbackUrl ? "Custom thumbnail removed — using the Vimeo thumbnail." : "Custom thumbnail removed." });
    } catch (err) {
      console.error("lesson thumbnail remove failed", err);
      setStatus({ tone: "error", text: "Could not remove the thumbnail — check your connection and try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="Lesson thumbnail" description={LESSON_THUMBNAIL_HINT}>
      <div className="space-y-3">
        {shown.url ? (
          <figure className="space-y-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element -- admin preview of an uploaded / Vimeo image */}
            <img src={shown.url} alt="" className="aspect-video w-full rounded-[8px] border border-[#e7e6e4] object-cover" />
            <figcaption className="text-xs text-[#6c6a69]">{SOURCE_LABEL[shown.source]}</figcaption>
          </figure>
        ) : (
          <div className="flex aspect-video w-full items-center justify-center rounded-[8px] border border-dashed border-[#d9d8d6] bg-[#fafaf9] px-4 text-center text-xs text-[#6c6a69]">
            Upload an image, or add a Vimeo video to use its thumbnail
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <label className={`${BTN_SECONDARY} cursor-pointer ${busy ? "pointer-events-none opacity-50" : ""}`}>
            <span className="material-symbols-outlined text-[18px]" aria-hidden>
              upload
            </span>
            {busy ? "Working…" : upload ? "Replace image" : "Upload image"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void uploadFile(file);
              }}
            />
          </label>
          <MediaPicker
            disabled={busy}
            onPick={async (picked) => {
              const res = await setLessonThumbnailFromLibrary({ courseId, lessonId, url: picked });
              if (!res.ok) return res.error;
              setUpload(res.data.url);
              setStatus({ tone: "info", text: "Thumbnail updated." });
              return null;
            }}
          />
          {upload && (
            <button type="button" onClick={() => void remove()} disabled={busy} className="text-sm text-red-700 hover:underline disabled:opacity-50">
              Remove
            </button>
          )}
        </div>
        {status && (
          <p role={status.tone === "error" ? "alert" : "status"} className={`text-xs ${status.tone === "error" ? "text-red-700" : "text-[#6c6a69]"}`}>
            {status.text}
          </p>
        )}
        {children}
      </div>
    </Card>
  );
}
