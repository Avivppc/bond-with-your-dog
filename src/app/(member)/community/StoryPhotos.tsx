"use client";

import { useId, useState, type Dispatch, type SetStateAction } from "react";
import { createClient } from "@/lib/supabase/client";
import { Ms } from "@/components/app/ui";
import { MAX_STORY_PHOTOS, STORY_MEDIA_BUCKET, STORY_PHOTO_ACCEPT, storyPhotoType, validateStoryPhoto } from "@/lib/community/story-media";
import { startStoryPhotoUpload } from "./hub-actions";

export interface StoryPhoto {
  path: string;
  /** Local object URL for the thumbnail; null when the browser can't show the format (HEIC). */
  preview: string | null;
  name: string;
}

const THUMB = 64;

/** Uploads one photo straight to storage (signed URL from the server); returns it or an error message. */
async function uploadPhoto(file: File): Promise<{ photo: StoryPhoto } | { error: string }> {
  const invalid = validateStoryPhoto(file);
  const contentType = storyPhotoType(file);
  if (invalid || !contentType) return { error: invalid ?? "Use a JPG, PNG, WebP or HEIC photo." };
  const started = await startStoryPhotoUpload({ fileName: file.name, size: file.size, contentType });
  if (!started.ok) return { error: started.error };
  const { error } = await createClient()
    .storage.from(STORY_MEDIA_BUCKET)
    .uploadToSignedUrl(started.data.path, started.data.token, file, { contentType: started.data.contentType });
  if (error) {
    console.error("story photo upload failed", { error: error.message });
    return { error: "Upload failed. Please try again." };
  }
  const preview = contentType === "image/heic" ? null : URL.createObjectURL(file);
  return { photo: { path: started.data.path, preview, name: file.name } };
}

interface StoryPhotosProps {
  photos: readonly StoryPhoto[];
  setPhotos: Dispatch<SetStateAction<StoryPhoto[]>>;
  onBusyChange: (busy: boolean) => void;
}

/** Up to 3 photos for a story: thumbnails with remove buttons and an "Add photos" picker. */
export function StoryPhotos({ photos, setPhotos, onBusyChange }: StoryPhotosProps) {
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const room = MAX_STORY_PHOTOS - photos.length;

  async function add(files: File[]) {
    const picked = files.slice(0, room);
    setError(files.length > room ? `Up to ${MAX_STORY_PHOTOS} photos per story.` : null);
    if (picked.length === 0) return;
    setBusy(true);
    onBusyChange(true);
    try {
      for (const file of picked) {
        const res = await uploadPhoto(file);
        if ("error" in res) {
          setError(res.error);
          continue;
        }
        setPhotos((list) => (list.length < MAX_STORY_PHOTOS ? [...list, res.photo] : list));
      }
    } catch (err) {
      console.error("story photo upload failed", err);
      setError("Upload failed. Check your connection and try again.");
    } finally {
      setBusy(false);
      onBusyChange(false);
    }
  }

  function remove(photo: StoryPhoto) {
    if (photo.preview) URL.revokeObjectURL(photo.preview);
    setPhotos((list) => list.filter((p) => p.path !== photo.path));
  }

  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="row" style={{ gap: 10 }}>
        {photos.map((p) => (
          <div key={p.path} style={{ position: "relative", width: THUMB, height: THUMB, borderRadius: 12, overflow: "hidden", background: "rgba(255,255,255,0.12)", display: "grid", placeItems: "center" }}>
            {p.preview ? (
              // eslint-disable-next-line @next/next/no-img-element -- local preview of the photo just uploaded
              <img src={p.preview} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <Ms name="photo" color="#bcd0d8" />
            )}
            <button
              type="button"
              onClick={() => remove(p)}
              aria-label={`Remove ${p.name}`}
              style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: "50%", background: "rgba(0,0,0,0.6)", color: "#fff", display: "grid", placeItems: "center" }}
            >
              <Ms name="close" size="sm" />
            </button>
          </div>
        ))}
        {room > 0 && (
          <label htmlFor={id} className="btn btn-ghost btn-sm" style={{ background: "#fff", cursor: busy ? "progress" : "pointer" }} aria-busy={busy}>
            <Ms name={busy ? "hourglass_top" : "add_a_photo"} size="sm" />
            {busy ? "Uploading…" : photos.length === 0 ? "Add photos" : "Add another"}
          </label>
        )}
        <input
          id={id}
          type="file"
          accept={STORY_PHOTO_ACCEPT}
          multiple
          hidden
          disabled={busy || room <= 0}
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";
            void add(files);
          }}
        />
      </div>
      <span className="faint" role={error ? "alert" : undefined} style={{ color: error ? "#ffc2b3" : "#bcd0d8" }}>
        {error ?? `Up to ${MAX_STORY_PHOTOS} photos (JPG, PNG, WebP or HEIC, 10 MB each). Optional.`}
      </span>
    </div>
  );
}
