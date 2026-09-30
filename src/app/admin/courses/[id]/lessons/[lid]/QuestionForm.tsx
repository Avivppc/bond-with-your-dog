import { upsertQuestion } from "../actions";

export const MAX_ANSWER_ROWS = 6;

export interface QuestionDefaults {
  id?: string;
  lesson_id: string;
  course_id: string;
  position: number;
  prompt: string;
  kind: "single" | "multi" | "tf";
  options: { id: string; text: string }[];
  correct: unknown[];
  explanation: string;
}

const inputClass = "px-3 py-2 rounded-lg border border-slate-200 bg-white";

/**
 * Friendly quiz question editor: type answers in rows and tick the correct one(s).
 * The server builds the stored answer key (src/lib/quiz/answer-key.ts).
 */
export function QuestionForm({ defaults }: { defaults: QuestionDefaults }) {
  const rows = Array.from({ length: MAX_ANSWER_ROWS }, (_, i) => defaults.options[i] ?? null);
  const correctIds = new Set(defaults.correct.filter((c): c is string => typeof c === "string"));
  const tfDefault = defaults.kind === "tf" && typeof defaults.correct[0] === "boolean" ? String(defaults.correct[0]) : "";

  return (
    <form action={upsertQuestion} className="flex flex-col gap-4">
      {defaults.id && <input type="hidden" name="id" value={defaults.id} />}
      <input type="hidden" name="lesson_id" value={defaults.lesson_id} />
      <input type="hidden" name="course_id" value={defaults.course_id} />

      <div className="grid grid-cols-[6rem_1fr] gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Order</span>
          <input name="position" type="number" min={1} defaultValue={defaults.position} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Question type</span>
          <select name="kind" defaultValue={defaults.kind} className={inputClass}>
            <option value="single">One correct answer</option>
            <option value="multi">Several correct answers</option>
            <option value="tf">True / false</option>
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Question</span>
        <textarea name="prompt" rows={2} required defaultValue={defaults.prompt} className={inputClass} />
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
          Answers — tick the correct one(s) <span className="normal-case font-normal">(not used for true/false)</span>
        </legend>
        {rows.map((opt, i) => (
          <div key={i} className="flex items-center gap-3">
            <input
              type="checkbox"
              name="correct"
              value={i}
              defaultChecked={opt ? correctIds.has(opt.id) : false}
              aria-label={`Answer ${i + 1} is correct`}
              className="w-4 h-4"
            />
            <input name={`option_${i}`} defaultValue={opt?.text ?? ""} placeholder={`Answer ${i + 1}`} className={`${inputClass} flex-1`} />
          </div>
        ))}
      </fieldset>

      <label className="flex flex-col gap-1.5 max-w-60">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-600">True / false answer</span>
        <select name="tf_answer" defaultValue={tfDefault} className={inputClass}>
          <option value="">—</option>
          <option value="true">True</option>
          <option value="false">False</option>
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Explanation (shown after answering)</span>
        <textarea name="explanation" rows={2} defaultValue={defaults.explanation} className={inputClass} />
      </label>

      <button type="submit" className="bg-orange-700 text-white px-5 py-2 rounded-full font-bold text-xs self-start">
        Save question
      </button>
    </form>
  );
}
