"use client";

import { EXIT_KINDS, EXIT_LABEL, MAX_EXITS, cleanExit, type ExitCondition, type ExitKind } from "@/lib/flows/exits";
import { BTN_SECONDARY, INPUT, LABEL, MUTED } from "../../_components/ui";

interface ChapterOption {
  id: string;
  title: string;
}

/** "Leave the flow when any of these happens": a short list of exit conditions. */
export function ExitsField({ exits, chapters, onChange }: { exits: readonly ExitCondition[]; chapters: readonly ChapterOption[]; onChange: (e: ExitCondition[]) => void }) {
  const update = (i: number, next: ExitCondition) => onChange(exits.map((e, j) => (j === i ? next : e)));
  const unused = EXIT_KINDS.find((k) => !exits.some((e) => e.kind === k)) ?? "practiced";
  return (
    <div className="flex flex-col gap-2">
      <span className={LABEL}>Leave the flow when any of these happens</span>
      {exits.length === 0 && <span className={`text-[13px] ${MUTED}`}>Nothing yet: people go through every step.</span>}
      {exits.map((exit, i) => (
        <div key={i} className="flex flex-col gap-1.5 rounded-[8px] border border-[#efeeed] p-2">
          <div className="flex gap-2">
            <select aria-label={`Exit condition ${i + 1}`} className={`${INPUT} min-w-0 flex-1`} value={exit.kind} onChange={(e) => update(i, cleanExit({ kind: e.target.value as ExitKind }))}>
              {EXIT_KINDS.map((k) => (
                <option key={k} value={k}>
                  {EXIT_LABEL[k]}
                </option>
              ))}
            </select>
            <button type="button" className={BTN_SECONDARY} aria-label={`Remove exit condition ${i + 1}`} onClick={() => onChange(exits.filter((_, j) => j !== i))}>
              ✕
            </button>
          </div>
          {(exit.kind === "completed_chapter" || exit.kind === "owns_chapter") && (
            <select aria-label="Chapter" className={INPUT} value={exit.courseId ?? ""} onChange={(e) => update(i, { ...exit, courseId: e.target.value || null })}>
              <option value="">Choose a chapter</option>
              {chapters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          )}
          {exit.kind === "has_tag" && (
            <input aria-label="Tag" className={INPUT} maxLength={40} placeholder="vip" value={exit.tag ?? ""} onChange={(e) => update(i, { ...exit, tag: e.target.value.toLowerCase() })} />
          )}
        </div>
      ))}
      {exits.length < MAX_EXITS && (
        <button type="button" className={`${BTN_SECONDARY} self-start`} onClick={() => onChange([...exits, cleanExit({ kind: unused })])}>
          Add an exit condition
        </button>
      )}
      <span className={`text-[12px] ${MUTED}`}>Checked before every step. People who leave stop getting this flow&apos;s emails.</span>
    </div>
  );
}
