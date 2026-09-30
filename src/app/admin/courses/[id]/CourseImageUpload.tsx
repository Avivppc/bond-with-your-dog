"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { COURSE_IMAGES_BUCKET, validateCourseImage } from "@/lib/lesson-files";
import { finishCourseImageUpload, startCourseImageUpload } from "./image-actions";

interface CourseImageUploadProps {
  courseId: string;
  currentUrl: string | null;
  currentAlt: string | null;
}

/** Upload a cover image from the computer (JPG/PNG/WebP, max 5 MB). */
export function CourseImageUpload({ courseId, currentUrl, currentAlt }: CourseImageUploadProps) {
  const [url, setUrl] = useState(currentUrl);
  const [alt, setAlt] = useState(currentAlt ?? "");
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
    setStatus("Cover image updated.");
  }

  return (
    <section className="bg-white rounded-xl p-6 shadow-sm flex flex-wrap items-center gap-6">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- admin preview of an uploaded/remote image
        <img src={url} alt={alt} className="w-48 aspect-video object-cover rounded-lg bg-slate-100" />
      ) : (
        <div className="w-48 aspect-video rounded-lg bg-slate-100 flex items-center justify-center text-xs text-slate-500">No cover image</div>
      )}
      <div className="space-y-2 flex-1 min-w-56">
        <h2 className="font-extrabold">Cover image</h2>
        <input
          value={alt}
          onChange={(e) => setAlt(e.target.value)}
          placeholder="Describe the image (for accessibility)"
          maxLength={300}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
        />
        <label className={`inline-block bg-orange-700 text-white px-4 py-2 rounded-full font-bold text-xs cursor-pointer ${busy ? "opacity-50" : ""}`}>
          {busy ? "Uploading…" : "Upload image"}
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
        {status && (
          <p role="status" className="text-xs text-slate-600">
            {status}
          </p>
        )}
      </div>
    </section>
  );
}
