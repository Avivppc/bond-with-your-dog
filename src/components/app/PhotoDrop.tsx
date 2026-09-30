"use client";

import { useId, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { startProfilePhotoUpload } from "@/app/(member)/photo-actions";
import { PROFILE_PHOTOS_BUCKET, validateProfilePhoto, type PhotoKind } from "@/lib/member/photos";
import { Ms } from "./ui";

interface PhotoDropProps {
  kind: PhotoKind;
  value: string | null;
  onChange: (url: string | null) => void;
  label: React.ReactNode;
  size?: number;
}

/** The design's round "add a photo" drop: uploads straight to storage and reports the public URL. */
export function PhotoDrop({ kind, value, onChange, label, size = 110 }: PhotoDropProps) {
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    const invalid = validateProfilePhoto(file);
    if (invalid) {
      setError(invalid);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const started = await startProfilePhotoUpload({ kind, size: file.size, contentType: file.type });
      if (!started.ok) {
        setError(started.error);
        return;
      }
      const { error: uploadError } = await createClient()
        .storage.from(PROFILE_PHOTOS_BUCKET)
        .uploadToSignedUrl(started.data.path, started.data.token, file, { contentType: file.type });
      if (uploadError) {
        setError("Upload failed. Please try again.");
        return;
      }
      onChange(started.data.publicUrl);
    } catch (err) {
      console.error("profile photo upload failed", err);
      setError("Upload failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="row" style={{ gap: 20 }}>
      <label className="photo-drop" htmlFor={id} style={{ width: size, height: size, overflow: "hidden", padding: 0 }} aria-busy={busy}>
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element -- the photo just uploaded
          <img src={value} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <Ms name={busy ? "hourglass_top" : "add_a_photo"} />
        )}
      </label>
      <input
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void upload(file);
        }}
      />
      <div className="stack" style={{ gap: 6 }}>
        <div className="faint">{busy ? "Uploading…" : label}</div>
        {value && !busy && (
          <button type="button" className="link" onClick={() => onChange(null)}>
            Remove photo
          </button>
        )}
        {error && (
          <span role="alert" className="faint" style={{ color: "var(--danger)" }}>
            {error}
          </span>
        )}
      </div>
    </div>
  );
}
