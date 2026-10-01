"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { COURSE_IMAGES_BUCKET, validateCourseImage } from "@/lib/lesson-files";
import { BTN_SECONDARY, INPUT, LABEL } from "@/app/admin/_components/ui";
import { startCommunityImageUpload } from "./actions";

/**
 * A cover image for the community hub, a challenge or a meetup: upload a JPG/PNG/WebP straight to
 * storage, or paste an https link. The form saves the URL with its other fields.
 */
export function CoverImageField({ name = "cover_image_url", label, defaultValue }: { name?: string; label: string; defaultValue: string | null | undefined }) {
  const [url, setUrl] = useState(defaultValue ?? "");
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
    try {
      const started = await startCommunityImageUpload({ fileName: file.name, size: file.size, contentType: file.type });
      if (!started.ok) {
        setStatus(started.error);
        return;
      }
      const { error } = await createClient().storage.from(COURSE_IMAGES_BUCKET).uploadToSignedUrl(started.path, started.token, file, { contentType: file.type });
      if (error) {
        setStatus(`Upload failed: ${error.message}`);
        return;
      }
      setUrl(started.publicUrl);
      setStatus("Image uploaded. Save to keep it.");
    } catch (err) {
      console.error("[admin/community] cover upload failed", err);
      setStatus("Upload failed. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className={LABEL}>{label}</span>
      <div className="flex items-start gap-3">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- admin preview of the chosen cover
          <img src={url} alt="" className="h-[58px] w-[88px] shrink-0 rounded-[8px] border border-[#e7e6e4] object-cover" />
        ) : (
          <span className="flex h-[58px] w-[88px] shrink-0 items-center justify-center rounded-[8px] border border-dashed border-[#d9d8d6] bg-[#fafaf9] text-[#9b9997]" aria-hidden>
            <span className="material-symbols-outlined text-[20px]">image</span>
          </span>
        )}
        <div className="min-w-0 flex-1 space-y-2">
          <input name={name} value={url} onChange={(e) => setUrl(e.target.value)} maxLength={500} placeholder="https://… or upload" aria-label={`${label} link`} className={INPUT} />
          <div className="flex flex-wrap gap-2">
            <label className={`${BTN_SECONDARY} relative h-8 cursor-pointer px-3 text-[13px] ${busy ? "opacity-50" : ""}`}>
              {busy ? "Uploading…" : url ? "Replace" : "Upload image"}
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
            {url && !busy && (
              <button type="button" className={`${BTN_SECONDARY} h-8 px-3 text-[13px]`} onClick={() => setUrl("")}>
                Remove
              </button>
            )}
          </div>
          {status && (
            <p role="status" className="text-xs text-[#6c6a69]">
              {status}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
