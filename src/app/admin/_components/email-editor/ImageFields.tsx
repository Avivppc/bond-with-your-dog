"use client";

import { useRef, useState } from "react";
import type { ImageBlock } from "@/lib/email-blocks/types";
import { BTN_SECONDARY, MUTED } from "../ui";
import { RangeField } from "./controls";
import type { BlockPatch } from "./doc-ops";
import { TagField } from "./TagField";
import { EMAIL_IMAGE_ACCEPT, validateEmailImage } from "./upload-rules";

export type UploadImage = (file: File) => Promise<{ url: string } | { error: string }>;

interface ImageFieldsProps {
  block: ImageBlock;
  onPatch: (patch: BlockPatch<ImageBlock>) => void;
  uploadImage?: UploadImage;
}

/** Image block: upload (when the editor has an uploader) or paste a URL, alt text, link and width. */
export function ImageFields({ block, onPatch, uploadImage }: ImageFieldsProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File | undefined) {
    if (!file || !uploadImage) return;
    const invalid = validateEmailImage({ type: file.type, size: file.size });
    if (invalid) {
      setError(invalid);
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const result = await uploadImage(file);
      if ("error" in result) setError(result.error);
      else onPatch({ src: result.url, alt: block.alt || file.name.replace(/\.[a-z0-9]+$/i, "") });
    } catch {
      setError("The upload didn't go through. Please try again.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const target = (field: "src" | "alt" | "href") => ({ scope: "block", id: block.id, field }) as const;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[8px] border border-[#e7e6e4] bg-[#f8f8f8]">
          {block.src ? (
            // eslint-disable-next-line @next/next/no-img-element -- arbitrary email image URLs, not optimised assets
            <img src={block.src} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="material-symbols-outlined text-[24px] text-[#9b9997]" aria-hidden>
              image
            </span>
          )}
        </div>
        {uploadImage && (
          <div className="flex flex-col gap-1">
            <input
              ref={inputRef}
              type="file"
              accept={EMAIL_IMAGE_ACCEPT}
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={(e) => void onFile(e.target.files?.[0])}
            />
            <button type="button" className={BTN_SECONDARY} disabled={uploading} onClick={() => inputRef.current?.click()}>
              <span className="material-symbols-outlined text-[18px]" aria-hidden>
                upload
              </span>
              {uploading ? "Uploading…" : block.src ? "Replace image" : "Upload image"}
            </button>
            <span className={`text-xs ${MUTED}`}>PNG, JPG, GIF or WebP, up to 2 MB</span>
          </div>
        )}
      </div>
      {error && (
        <p role="alert" className="rounded-[8px] border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          {error}
        </p>
      )}
      <TagField target={target("src")} label="Image URL" inputMode="url" value={block.src} placeholder="https://…" onChange={(src) => onPatch({ src })} />
      <TagField
        target={target("alt")}
        label="Alt text"
        value={block.alt}
        hint="Describes the image for screen readers and when images are off."
        onChange={(alt) => onPatch({ alt })}
      />
      <TagField
        target={target("href")}
        label="Link (optional)"
        inputMode="url"
        value={block.href}
        placeholder="https://… or {{offer_url}}"
        onChange={(href) => onPatch({ href })}
      />
      <RangeField label="Width" value={block.width} min={30} max={100} step={5} unit="%" onChange={(width) => onPatch({ width })} />
    </div>
  );
}
