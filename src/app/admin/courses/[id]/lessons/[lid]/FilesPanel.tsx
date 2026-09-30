"use client";

import { useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { LESSON_FILES_BUCKET, validateLessonFile } from "@/lib/lesson-files";
import { deleteLessonFile, finishLessonFileUpload, startLessonFileUpload } from "./content-actions";

export interface LessonFileView {
  id: string;
  file_name: string;
  size_bytes: number | null;
}

interface FilesPanelProps {
  courseId: string;
  lessonId: string;
  files: readonly LessonFileView[];
}

function formatSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Downloadable materials: the browser uploads straight to private storage via a signed URL. */
export function FilesPanel({ courseId, lessonId, files }: FilesPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function uploadOne(file: File): Promise<string | null> {
    const invalid = validateLessonFile({ name: file.name, size: file.size, type: file.type });
    if (invalid) return `${file.name}: ${invalid}`;

    const meta = { courseId, lessonId, fileName: file.name, size: file.size, contentType: file.type };
    const started = await startLessonFileUpload(meta);
    if (!started.ok) return `${file.name}: ${started.error}`;

    const { error: uploadError } = await createClient()
      .storage.from(LESSON_FILES_BUCKET)
      .uploadToSignedUrl(started.data.path, started.data.token, file, { contentType: file.type || undefined });
    if (uploadError) return `${file.name}: upload failed (${uploadError.message})`;

    const finished = await finishLessonFileUpload({ ...meta, path: started.data.path });
    return finished.ok ? null : `${file.name}: ${finished.error}`;
  }

  async function onPick(list: FileList | null) {
    if (!list?.length) return;
    setError(null);
    const errors: string[] = [];
    for (const file of Array.from(list)) {
      setUploading(file.name);
      const failure = await uploadOne(file);
      if (failure) errors.push(failure);
    }
    setUploading(null);
    if (inputRef.current) inputRef.current.value = "";
    if (errors.length) setError(errors.join(" · "));
  }

  function remove(fileId: string, name: string) {
    if (!window.confirm(`Delete ${name}?`)) return;
    startTransition(async () => {
      const res = await deleteLessonFile({ courseId, lessonId, fileId });
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <section className="bg-white rounded-xl p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold tracking-tighter">Downloads</h2>
        <label className="bg-orange-700 text-white px-5 py-2 rounded-full font-bold text-sm cursor-pointer">
          {uploading ? `Uploading ${uploading}…` : "Upload files"}
          <input
            ref={inputRef}
            type="file"
            multiple
            className="sr-only"
            disabled={Boolean(uploading)}
            onChange={(e) => void onPick(e.target.files)}
          />
        </label>
      </div>

      {files.length === 0 ? (
        <p className="text-sm text-slate-500">No files. PDFs, worksheets, images and audio up to 200 MB.</p>
      ) : (
        <ul className="divide-y divide-slate-100 text-sm">
          {files.map((f) => (
            <li key={f.id} className={`py-2 flex items-center justify-between gap-4 ${pending ? "opacity-60" : ""}`}>
              <span className="font-semibold truncate">{f.file_name}</span>
              <span className="flex items-center gap-4 shrink-0">
                <span className="text-xs text-slate-500">{formatSize(f.size_bytes)}</span>
                <button type="button" onClick={() => remove(f.id, f.file_name)} className="text-xs text-red-600 hover:text-red-800">
                  Delete
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </section>
  );
}
