"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BTN_PRIMARY } from "../_components/ui";
import { uploadMedia } from "./actions";

/** "Upload images": several at once, straight into the library. */
export function MediaUploader() {
  const id = useId();
  const router = useRouter();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    const picked = Array.from(files);
    start(async () => {
      // One image per request: server actions take up to 6 MB a call.
      let uploaded = 0;
      const errors: string[] = [];
      for (const file of picked) {
        const form = new FormData();
        form.append("files", file);
        const res = await uploadMedia(form);
        if (!res.ok) errors.push(`${file.name}: ${res.error}`);
        else {
          uploaded += res.data.uploaded;
          errors.push(...res.data.errors);
        }
      }
      setMessage({
        ok: errors.length === 0,
        text: [uploaded ? `${uploaded} image${uploaded === 1 ? "" : "s"} added.` : "", ...errors].filter(Boolean).join(" "),
      });
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {message && (
        <span role={message.ok ? "status" : "alert"} className={`text-[14px] ${message.ok ? "text-[#1c6b35]" : "text-[#b42318]"}`}>
          {message.text}
        </span>
      )}
      <label htmlFor={id} className={`${BTN_PRIMARY} cursor-pointer ${pending ? "opacity-60" : ""}`} aria-busy={pending}>
        <span className="material-symbols-outlined text-[18px]" aria-hidden>
          {pending ? "hourglass_top" : "upload"}
        </span>
        {pending ? "Uploading…" : "Upload images"}
      </label>
      <input
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        hidden
        disabled={pending}
        onChange={(e) => {
          upload(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
