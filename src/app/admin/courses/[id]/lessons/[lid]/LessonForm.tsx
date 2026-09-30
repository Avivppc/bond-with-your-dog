import { FormField } from "@/app/admin/_components/FormField";

interface LessonFormDefaults {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  kind: "video" | "quiz";
  duration_seconds: number | null;
  available_after_days: number | null;
  pass_threshold: number;
  free_preview: boolean;
  published: boolean;
}

interface LessonFormProps {
  action: (fd: FormData) => Promise<void>;
  defaults: LessonFormDefaults;
}

/** Lesson settings. Video, text and files have their own panels; order lives in the outline. */
export function LessonForm({ action, defaults }: LessonFormProps) {
  return (
    <form action={action} className="bg-white rounded-xl p-6 shadow-sm flex flex-col gap-5">
      <input type="hidden" name="id" value={defaults.id} />
      <input type="hidden" name="course_id" value={defaults.course_id} />

      <div className="grid grid-cols-1 md:grid-cols-[1fr_12rem] gap-5">
        <FormField label="Title" name="title" required defaultValue={defaults.title} />
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Type</span>
          <select
            name="kind"
            defaultValue={defaults.kind}
            className="px-4 py-2.5 rounded-lg border border-slate-200 bg-white"
          >
            <option value="video">Video lesson</option>
            <option value="quiz">Quiz</option>
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Short description</span>
        <textarea
          name="description"
          rows={2}
          maxLength={2000}
          defaultValue={defaults.description ?? ""}
          className="px-4 py-2.5 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-orange-300 focus:outline-none resize-none"
        />
      </label>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <FormField
          label="Drip — days after enroll"
          name="available_after_days"
          type="number"
          defaultValue={defaults.available_after_days}
          hint="Blank = available immediately"
        />
        <FormField
          label="Duration (sec)"
          name="duration_seconds"
          type="number"
          defaultValue={defaults.duration_seconds}
          hint="Filled automatically from Vimeo"
        />
        {defaults.kind === "quiz" && (
          <FormField
            label="Pass threshold (%)"
            name="pass_threshold"
            type="number"
            defaultValue={defaults.pass_threshold}
            hint="0–100"
          />
        )}
      </div>

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-3">
          <input type="checkbox" name="published" defaultChecked={defaults.published} className="w-4 h-4" />
          <span className="text-sm font-bold">Published (visible to enrolled students)</span>
        </label>
        <label className="flex items-center gap-3">
          <input type="checkbox" name="free_preview" defaultChecked={defaults.free_preview} className="w-4 h-4" />
          <span className="text-sm font-bold">Free preview (any signed-in visitor)</span>
        </label>
      </div>

      <button type="submit" className="bg-orange-700 text-white px-6 py-3 rounded-full font-bold text-sm self-start">
        Save settings
      </button>
    </form>
  );
}
