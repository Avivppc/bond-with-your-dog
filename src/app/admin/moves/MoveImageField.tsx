"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { COURSE_IMAGES_BUCKET, validateCourseImage } from "@/lib/lesson-files";
import { BTN_SECONDARY, Card } from "@/app/admin/_components/ui";
import { startMoveImageUpload } from "./actions";

interface MoveImageFieldProps {
  formId: string;
  initialUrl: string | null;
  alt: string;
}

/** Uploads the image straight to storage; the move form saves its URL with the other fields. */
export function MoveImageField({ formId, initialUrl, alt }: MoveImageFieldProps) {
  const [url, setUrl] = useState(initialUrl ?? "");
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
      const started = await startMoveImageUpload({ fileName: file.name, size: file.size, contentType: file.type });
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
      setStatus("Image uploaded. Save the move to keep it.");
    } catch (err) {
      console.error("[admin/moves] image upload failed", err);
      setStatus("Upload failed. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="Image" description="Shown in the Moves Library. JPG, PNG or WebP, max 5 MB.">
      <input type="hidden" form={formId} name="image_url" value={url} />
      <div className="space-y-3">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- admin preview of an uploaded image
          <img src={url} alt={alt} className="aspect-square w-full rounded-[8px] border border-[#e7e6e4] object-cover" />
        ) : (
          <div className="flex aspect-square w-full items-center justify-center rounded-[8px] border border-dashed border-[#d9d8d6] bg-[#fafaf9] text-xs text-[#6c6a69]">
            No image
          </div>
        )}
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
          {url && !busy && (
            <button
              type="button"
              className={BTN_SECONDARY}
              onClick={() => {
                setUrl("");
                setStatus("Image removed. Save the move to apply.");
              }}
            >
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
    </Card>
  );
}
