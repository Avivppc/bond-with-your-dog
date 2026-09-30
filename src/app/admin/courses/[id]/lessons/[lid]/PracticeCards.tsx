"use client";

import { Card, INPUT, LABEL } from "@/app/admin/_components/ui";
import { AddRowButton, ChipListEditor, RowControls, TextListEditor } from "@/app/admin/courses/_editors/ListEditors";
import { useRows } from "@/app/admin/courses/_editors/useRows";
import { CUES, MAX_PRACTICE_MINUTES, MIN_PRACTICE_MINUTES, TAKEAWAYS } from "@/lib/content/limits";
import { MAX_PRACTICE_STEPS, MAX_STEP_BODY, MAX_STEP_REPS, MAX_STEP_SECONDS, MAX_STEP_TITLE, type PracticeStep } from "@/lib/content/practice-steps";

/**
 * Member-app content for a lesson: Practice mode steps, key takeaways and cues. All inputs join the
 * lesson editor's single form (`formId`); the hidden `content_fields` marker tells the save action
 * these lists were on the page, so an empty list means "cleared" rather than "not sent".
 */
interface StepDraft {
  title: string;
  body: string;
  seconds: string;
  reps: string;
}

const toDraft = (s: PracticeStep): StepDraft => ({ title: s.title, body: s.body, seconds: s.seconds ? String(s.seconds) : "", reps: s.reps ? String(s.reps) : "" });
const EMPTY_STEP: StepDraft = { title: "", body: "", seconds: "", reps: "" };

export function PracticeCard({ formId, minutes, steps }: { formId: string; minutes: number | null; steps: readonly PracticeStep[] }) {
  const { rows, add, remove, move, update } = useRows(steps.map(toDraft));
  return (
    <Card title="Practice" description="What Practice mode walks members through after the lesson.">
      <input type="hidden" form={formId} name="content_fields" value="1" />
      <div className="flex flex-col gap-5">
        <label className="flex max-w-[12rem] flex-col gap-1.5">
          <span className={LABEL}>Practice time (minutes)</span>
          <input
            form={formId}
            name="practice_minutes"
            type="number"
            min={MIN_PRACTICE_MINUTES}
            max={MAX_PRACTICE_MINUTES}
            defaultValue={minutes ?? ""}
            placeholder="e.g. 8"
            className={INPUT}
          />
        </label>
        <fieldset className="flex flex-col gap-3">
          <legend className={`${LABEL} mb-1.5`}>Practice steps</legend>
          {rows.length === 0 && <p className="text-xs text-[#6c6a69]">No steps yet. Members won&apos;t see a “Start practice” button until you add one.</p>}
          <ol className="flex flex-col gap-3">
            {rows.map((row, i) => {
              const set = (patch: Partial<StepDraft>) => update(i, { ...row.value, ...patch });
              return (
                <li key={row.key} className="rounded-[12px] border border-[#e7e6e4] bg-[#fafaf9] p-3">
                  <div className="flex items-center gap-2">
                    <span className="w-14 shrink-0 text-xs font-semibold text-[#6c6a69]">Step {i + 1}</span>
                    <input
                      form={formId}
                      name="step_title"
                      value={row.value.title}
                      onChange={(e) => set({ title: e.target.value })}
                      maxLength={MAX_STEP_TITLE}
                      placeholder="Full circle lure"
                      aria-label={`Step ${i + 1} title`}
                      className={INPUT}
                    />
                    <RowControls index={i} count={rows.length} itemLabel="step" onMove={move} onRemove={remove} />
                  </div>
                  <textarea
                    form={formId}
                    name="step_body"
                    value={row.value.body}
                    onChange={(e) => set({ body: e.target.value })}
                    rows={2}
                    maxLength={MAX_STEP_BODY}
                    placeholder="Hold the treat at nose height and draw a slow circle…"
                    aria-label={`Step ${i + 1} instructions`}
                    className={`${INPUT} mt-2 resize-y`}
                  />
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:max-w-sm">
                    <input
                      form={formId}
                      name="step_seconds"
                      type="number"
                      min={1}
                      max={MAX_STEP_SECONDS}
                      value={row.value.seconds}
                      onChange={(e) => set({ seconds: e.target.value })}
                      placeholder="Seconds (optional)"
                      aria-label={`Step ${i + 1} timer in seconds`}
                      className={INPUT}
                    />
                    <input
                      form={formId}
                      name="step_reps"
                      type="number"
                      min={1}
                      max={MAX_STEP_REPS}
                      value={row.value.reps}
                      onChange={(e) => set({ reps: e.target.value })}
                      placeholder="Reps (optional)"
                      aria-label={`Step ${i + 1} target reps`}
                      className={INPUT}
                    />
                  </div>
                </li>
              );
            })}
          </ol>
          <AddRowButton onClick={() => add(EMPTY_STEP)} disabled={rows.length >= MAX_PRACTICE_STEPS}>
            Add step
          </AddRowButton>
          <p className="text-xs text-[#6c6a69]">Seconds starts a timer for the step; reps shows a rep counter.</p>
        </fieldset>
      </div>
    </Card>
  );
}

export function TakeawaysCuesCard({ formId, takeaways, cues }: { formId: string; takeaways: readonly string[]; cues: readonly string[] }) {
  return (
    <Card title="Key takeaways & cues" description="Shown on the lesson's Overview tab in the member app.">
      <div className="flex flex-col gap-6">
        <TextListEditor
          formId={formId}
          name="key_takeaways"
          label={TAKEAWAYS.label}
          itemLabel="takeaway"
          addLabel="Add takeaway"
          initial={takeaways}
          maxItems={TAKEAWAYS.maxItems}
          maxLength={TAKEAWAYS.maxLength}
          placeholder="Soft eyes and a still body mean she's ready"
        />
        <ChipListEditor
          formId={formId}
          name="cues"
          label={CUES.label}
          initial={cues}
          maxItems={CUES.maxItems}
          maxLength={CUES.maxLength}
          placeholder={'Type a cue, e.g. "Look", and press Enter'}
          hint="Shown as “Cue: …” chips."
        />
      </div>
    </Card>
  );
}
