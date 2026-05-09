type Defaults = Partial<{
  id: string;
  course_id: string;
  position: number;
  title: string;
  description: string;
  kind: "video" | "quiz";
  mux_playback_id: string;
  mux_playback_policy: "signed" | "public";
  duration_seconds: number;
  available_after_days: number | null;
  pass_threshold: number;
  free_preview: boolean;
}>;

export function LessonForm({
  action,
  submitLabel,
  defaults,
}: {
  action: (fd: FormData) => Promise<void>;
  submitLabel: string;
  defaults: Defaults;
}) {
  const Field = ({
    label,
    name,
    type = "text",
    defaultValue,
    placeholder,
    hint,
  }: {
    label: string;
    name: string;
    type?: string;
    defaultValue?: string | number | null;
    placeholder?: string;
    hint?: string;
  }) => (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-600">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        className="px-4 py-2.5 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-orange-300 focus:outline-none"
      />
      {hint && <span className="text-xs text-slate-500">{hint}</span>}
    </label>
  );

  return (
    <form action={action} className="bg-white rounded-xl p-8 shadow-sm flex flex-col gap-5">
      {defaults.id && <input type="hidden" name="id" value={defaults.id} />}
      <input type="hidden" name="course_id" value={defaults.course_id} />

      <div className="grid grid-cols-2 gap-5">
        <Field label="Position" name="position" type="number" defaultValue={defaults.position} />
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Kind</span>
          <select
            name="kind"
            defaultValue={defaults.kind ?? "video"}
            className="px-4 py-2.5 rounded-lg border border-slate-200 bg-white"
          >
            <option value="video">Video lesson</option>
            <option value="quiz">Quiz</option>
          </select>
        </label>
      </div>

      <Field label="Title" name="title" defaultValue={defaults.title} />
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Description</span>
        <textarea
          name="description"
          rows={3}
          defaultValue={defaults.description ?? ""}
          className="px-4 py-2.5 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-orange-300 focus:outline-none resize-none"
        />
      </label>

      <div className="grid grid-cols-2 gap-5">
        <Field
          label="Mux playback ID"
          name="mux_playback_id"
          defaultValue={defaults.mux_playback_id}
          hint="From Mux dashboard. Leave blank for quiz lessons."
        />
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Playback policy
          </span>
          <select
            name="mux_playback_policy"
            defaultValue={defaults.mux_playback_policy ?? "signed"}
            className="px-4 py-2.5 rounded-lg border border-slate-200 bg-white"
          >
            <option value="signed">Signed (gated)</option>
            <option value="public">Public</option>
          </select>
        </label>
      </div>

      <div className="grid grid-cols-3 gap-5">
        <Field
          label="Duration (sec)"
          name="duration_seconds"
          type="number"
          defaultValue={defaults.duration_seconds}
          hint="Optional"
        />
        <Field
          label="Drip — days after enroll"
          name="available_after_days"
          type="number"
          defaultValue={defaults.available_after_days ?? ""}
          hint="Blank = unlocked immediately"
        />
        <Field
          label="Pass threshold (quiz)"
          name="pass_threshold"
          type="number"
          defaultValue={defaults.pass_threshold ?? 70}
          hint="0-100"
        />
      </div>

      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          name="free_preview"
          defaultChecked={defaults.free_preview ?? false}
          className="w-4 h-4"
        />
        <span className="text-sm font-bold">Free preview (visible to non-enrolled users)</span>
      </label>

      <button
        type="submit"
        className="bg-orange-700 text-white px-6 py-3 rounded-full font-bold text-sm self-start"
      >
        {submitLabel}
      </button>
    </form>
  );
}
