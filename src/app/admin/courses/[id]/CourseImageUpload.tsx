"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { COURSE_IMAGES_BUCKET, validateCourseImage } from "@/lib/lesson-files";
import { finishCourseImageUpload, saveCourseImageAlt, startCourseImageUpload } from "./image-actions";
import { BTN_SECONDARY, Card, INPUT } from "@/app/admin/_components/ui";
import { MediaPicker } from "@/app/admin/media/MediaPicker";
import { setCourseImageFromLibrary } from "@/app/admin/media/actions";

interface CourseImageUploadProps {
  courseId: string;
  currentUrl: string | null;
  currentAlt: string | null;
}

/** Upload a cover image from the computer (JPG/PNG/WebP, max 5 MB). */
export function CourseImageUpload({ courseId, currentUrl, currentAlt }: CourseImageUploadProps) {
  const [url, setUrl] = useState(currentUrl);
  const [alt, setAlt] = useState(currentAlt ?? "");
  const [savedAlt, setSavedAlt] = useState(currentAlt ?? "");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    const invalid = validateCourseImage({ name: file.name, size: file.size, type: file.type });
    if (invalid) {
      setStatus(invalid);
      return;
    }
    setBusy(true);
    setStatus("Uploading…");
    const started = await startCourseImageUpload({ courseId, fileName: file.name, size: file.size, contentType: file.type });
    if (!started.ok) {
      setStatus(started.error);
      setBusy(false);
      return;
    }
    const { error } = await createClient()
      .storage.from(COURSE_IMAGES_BUCKET)
      .uploadToSignedUrl(started.data.path, started.data.token, file, { contentType: file.type });
    if (error) {
      setStatus(`Upload failed: ${error.message}`);
      setBusy(false);
      return;
    }
    const finished = await finishCourseImageUpload({ courseId, path: started.data.path, alt });
    setBusy(false);
    if (!finished.ok) {
      setStatus(finished.error);
      return;
    }
    setUrl(finished.data.url);
    setSavedAlt(alt);
    setStatus("Cover image updated.");
  }

  return (
    <Card title="Cover image" description="Shown on course cards. JPG, PNG or WebP, 1280×720 recommended.">
      <div className="space-y-3">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- admin preview of an uploaded/remote image
          <img src={url} alt={alt} className="aspect-video w-full rounded-[8px] border border-[#e7e6e4] object-cover" />
        ) : (
          <div className="flex aspect-video w-full items-center justify-center rounded-[8px] border border-dashed border-[#d9d8d6] bg-[#fafaf9] text-xs text-[#6c6a69]">
            No cover image
          </div>
        )}
        <div className="flex gap-2">
          <input
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            placeholder="Describe the image (for accessibility)"
            maxLength={300}
            aria-label="Image description"
            className={INPUT}
          />
          {url && alt !== savedAlt && (
            <button
              type="button"
              disabled={busy}
              className={BTN_SECONDARY}
              onClick={async () => {
                const res = await saveCourseImageAlt({ courseId, alt });
                if (!res.ok) {
                  setStatus(res.error);
                  return;
                }
                setSavedAlt(alt);
                setStatus("Description saved.");
              }}
            >
              Save
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <label className={`${BTN_SECONDARY} cursor-pointer ${busy ? "opacity-50" : ""}`}>
            {busy ? "Uploading…" : url ? "Replace image" : "Upload image"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void upload(file);
                e.target.value = "";
              }}
            />
          </label>
          <MediaPicker
            disabled={busy}
            onPick={async (picked) => {
              const res = await setCourseImageFromLibrary({ courseId, url: picked });
              if (!res.ok) return res.error;
              setUrl(res.data.url);
              setStatus("Cover image updated.");
              return null;
            }}
          />
        </div>
        {status && (
          <p role="status" className="text-xs text-[#6c6a69]">
            {status}
          </p>
        )}
      </div>
    </Card>
  );
}
