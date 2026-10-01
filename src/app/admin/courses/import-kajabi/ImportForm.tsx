"use client";

import Link from "next/link";
import { useActionState } from "react";
import { BTN_PRIMARY, Notice } from "@/app/admin/_components/ui";
import { runKajabiImport, type ImportState } from "./actions";

interface DemoCourse {
  id: string;
  title: string;
}

const INITIAL: ImportState = { results: [], hidden: [], error: null };

export function ImportForm({ demoCourses }: { demoCourses: DemoCourse[] }) {
  const [state, action, pending] = useActionState(runKajabiImport, INITIAL);
  return (
    <form action={action} className="space-y-5">
      {demoCourses.length > 0 && (
        <fieldset className="space-y-2 rounded-[12px] border border-[#e7e6e4] p-4">
          <legend className="px-1 text-sm font-semibold">Also hide these older courses (optional)</legend>
          <p className="text-xs text-[#6c6a69]">They become drafts: members and the public website stop showing them. Nothing is deleted.</p>
          {demoCourses.map((c) => (
            <label key={c.id} className="flex items-center gap-2.5 text-sm">
              <input type="checkbox" name="hide" value={c.id} className="h-4 w-4 accent-[#343332]" />
              {c.title}
            </label>
          ))}
        </fieldset>
      )}
      <button type="submit" className={BTN_PRIMARY} disabled={pending}>
        {pending ? "Importing… (this takes a minute)" : "Import from Kajabi"}
      </button>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      {state.results.length > 0 && (
        <div className="space-y-2">
          {state.results.map((r) => (
            <Notice key={r.course} tone={r.status === "failed" ? "error" : "success"}>
              <b>{r.course}:</b> {r.message}
              {r.status !== "skipped" && ` ${r.modules} modules, ${r.lessons} lessons, ${r.images} images, ${r.files} downloads.`}
            </Notice>
          ))}
          {state.hidden.length > 0 && <Notice tone="success">Hidden: {state.hidden.join(", ")}.</Notice>}
          <Link href="/admin/courses" className="text-sm font-semibold underline">
            Go to Courses
          </Link>
        </div>
      )}
    </form>
  );
}
