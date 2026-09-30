"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { parseOutlineImport } from "@/lib/outline-import";
import { importOutline, type ImportActionResult } from "./actions";

const EXAMPLE = [
  "Module\tSubmodule\tLesson\tVimeo\tDescription",
  "The Bond\t\tWelcome\thttps://vimeo.com/123456789\tStart here",
  "The Bond\tBuilding Trust\tA Secret Language\thttps://vimeo.com/234567890/abcdef1234\t",
].join("\n");

/** Paste rows from Google Sheets/Excel → preview → create draft modules and lessons. */
export function ImportForm({ courseId }: { courseId: string }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<ImportActionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const preview = useMemo(() => (text.trim() ? parseOutlineImport(text) : null), [text]);

  function runImport() {
    startTransition(async () => {
      setResult(await importOutline({ courseId, text }));
    });
  }

  if (result?.ok) {
    return (
      <div className="bg-white rounded-[12px] p-6 border border-[#e7e6e4] shadow-[0_1px_2px_rgba(0,0,0,0.04)] space-y-3">
        <p role="status" className="font-bold text-emerald-800">
          Imported {result.data.lessonsCreated} lessons and {result.data.modulesCreated} new modules — all as drafts.
        </p>
        {result.data.skipped.length > 0 && (
          <div className="text-sm text-amber-800">
            <p>{result.data.skipped.length} row(s) were skipped:</p>
            <ul className="list-disc ps-5 mt-1 space-y-0.5">
              {result.data.skipped.map((s) => (
                <li key={`${s.line}-${s.message}`}>
                  Row {s.line}: {s.message}
                </li>
              ))}
            </ul>
          </div>
        )}
        <Link href={`/admin/courses/${courseId}`} className="inline-block bg-[#343332] text-white hover:bg-black px-5 py-2 rounded-full font-medium text-sm">
          Review the outline →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-[12px] p-6 border border-[#e7e6e4] shadow-[0_1px_2px_rgba(0,0,0,0.04)] space-y-3">
        <p className="text-sm text-[#6c6a69]">
          In Google Sheets or Excel, make columns <b>Module</b>, <b>Submodule</b> (optional), <b>Lesson</b>, <b>Vimeo</b> (optional) and{" "}
          <b>Description</b> (optional). Select the rows including the header, copy, and paste below. Existing modules with the same name are reused.
        </p>
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setResult(null);
          }}
          rows={10}
          placeholder={EXAMPLE}
          aria-label="Pasted table"
          className="w-full font-mono text-xs px-3 py-2 rounded-[8px] border border-[#d9d8d6]"
        />
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={runImport}
            disabled={pending || !preview || preview.rows.length === 0}
            className="bg-[#343332] text-white hover:bg-black px-5 py-2.5 rounded-full font-medium text-sm disabled:opacity-50"
          >
            {pending ? "Importing…" : `Import ${preview?.rows.length ?? 0} lessons`}
          </button>
          {result && !result.ok && (
            <span role="alert" className="text-sm text-red-700">
              {result.error}
            </span>
          )}
        </div>
      </section>

      {preview && (
        <section className="bg-white rounded-[12px] p-6 border border-[#e7e6e4] shadow-[0_1px_2px_rgba(0,0,0,0.04)] space-y-3">
          <h2 className="font-semibold">Preview</h2>
          {preview.errors.length > 0 && (
            <ul className="text-sm text-amber-800 list-disc ps-5">
              {preview.errors.map((e) => (
                <li key={`${e.line}-${e.message}`}>
                  Row {e.line}: {e.message}
                </li>
              ))}
            </ul>
          )}
          {preview.rows.length > 0 && (
            <table className="w-full text-sm">
              <thead className="text-left text-sm text-[#6c6a69] border-b border-[#efeeed]">
                <tr>
                  <th className="py-1">Module</th>
                  <th>Submodule</th>
                  <th>Lesson</th>
                  <th>Video</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#efeeed]">
                {preview.rows.map((r) => (
                  <tr key={r.line}>
                    <td className="py-1.5">{r.module}</td>
                    <td className="text-[#6c6a69]">{r.submodule ?? "—"}</td>
                    <td className="font-semibold">{r.lesson}</td>
                    <td className="text-[#6c6a69]">{r.vimeoUrl ? "✓ Vimeo" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}
    </div>
  );
}
