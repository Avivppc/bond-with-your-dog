"use client";

import { useId, useState, type Dispatch, type SetStateAction } from "react";
import { MAX_STORY_PHOTOS, STORY_PHOTO_ACCEPT } from "@/lib/community/story-media";
import { uploadStoryPhoto, type UploadedStoryPhoto } from "@/lib/community/upload-story-photo";
import { startVisitorPhotoUpload } from "./actions";

interface VisitorPhotosProps {
  photos: readonly UploadedStoryPhoto[];
  setPhotos: Dispatch<SetStateAction<UploadedStoryPhoto[]>>;
  onBusyChange: (busy: boolean) => void;
}

/** Up to 3 photos with the story: thumbnails with remove buttons and an "Add photos" picker. */
export function VisitorPhotos({ photos, setPhotos, onBusyChange }: VisitorPhotosProps) {
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
        const res = await uploadStoryPhoto(file, startVisitorPhotoUpload);
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

  function remove(photo: UploadedStoryPhoto) {
    if (photo.preview) URL.revokeObjectURL(photo.preview);
    setPhotos((list) => list.filter((p) => p.path !== photo.path));
  }

  return (
    <div className="flex flex-col gap-2 text-left">
      <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Photos (optional)</span>
      <div className="flex flex-wrap items-center gap-3">
        {photos.map((p) => (
          <div key={p.path} className="relative grid h-20 w-20 place-items-center overflow-hidden rounded-xl bg-surface-container">
            {p.preview ? (
              // eslint-disable-next-line @next/next/no-img-element -- local preview of the photo just uploaded
              <img src={p.preview} alt={p.name} className="h-full w-full object-cover" />
            ) : (
              <span className="material-symbols-outlined text-on-surface-variant" aria-hidden>
                photo
              </span>
            )}
            <button
              type="button"
              onClick={() => remove(p)}
              aria-label={`Remove ${p.name}`}
              className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-sm leading-none text-white"
            >
              ×
            </button>
          </div>
        ))}
        {room > 0 && (
          <label
            htmlFor={id}
            aria-busy={busy}
            className={`inline-flex items-center gap-2 rounded-full border border-outline-variant/60 px-5 py-2.5 text-sm font-semibold text-primary hover:bg-surface-container ${busy ? "cursor-progress opacity-70" : "cursor-pointer"}`}
          >
            <span className="material-symbols-outlined text-base" aria-hidden>
              {busy ? "hourglass_top" : "add_a_photo"}
            </span>
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
      <span className={`text-sm ${error ? "text-error" : "text-on-surface-variant"}`} role={error ? "alert" : undefined}>
        {error ?? `Up to ${MAX_STORY_PHOTOS} photos of you and your dog (JPG, PNG, WebP or HEIC, 10 MB each).`}
      </span>
    </div>
  );
}
