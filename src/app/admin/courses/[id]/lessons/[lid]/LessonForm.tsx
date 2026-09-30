import { Card, INPUT, LABEL } from "@/app/admin/_components/ui";

/**
 * The lesson editor's fields live in cards across two columns (Kajabi layout) but submit as one
 * form: every input points at LESSON_FORM_ID via the HTML `form` attribute, so the page needs no
 * wrapping <form> (the video and file panels have forms of their own and forms can't nest).
 */
export const LESSON_FORM_ID = "lesson-form";

export interface LessonFormDefaults {
  id: string;
  course_id: string;
  module_id: string | null;
  title: string;
  description: string | null;
  kind: "video" | "quiz";
  duration_seconds: number | null;
  available_after_days: number | null;
  pass_threshold: number;
  free_preview: boolean;
  published: boolean;
}

export interface ModuleChoice {
  id: string;
  label: string;
}

/** The (empty) form element the fields and the header's Save button submit. */
export function LessonFormRoot({ action, defaults }: { action: (fd: FormData) => Promise<void>; defaults: LessonFormDefaults }) {
  return (
    <form id={LESSON_FORM_ID} action={action} className="hidden">
      <input type="hidden" name="id" value={defaults.id} />
      <input type="hidden" name="course_id" value={defaults.course_id} />
    </form>
  );
}

export function LessonDetailsCard({ defaults, modules }: { defaults: LessonFormDefaults; modules: readonly ModuleChoice[] }) {
  return (
    <Card title="Lesson details">
      <div className="flex flex-col gap-5">
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>Title</span>
          <input form={LESSON_FORM_ID} name="title" required defaultValue={defaults.title} maxLength={200} className={INPUT} />
        </label>
        <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_12rem]">
          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>Module</span>
            <select form={LESSON_FORM_ID} name="module_id" defaultValue={defaults.module_id ?? ""} className={INPUT}>
              {!defaults.module_id && <option value="">No module</option>}
              {modules.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>Type</span>
            <select form={LESSON_FORM_ID} name="kind" defaultValue={defaults.kind} className={INPUT}>
              <option value="video">Video lesson</option>
              <option value="quiz">Quiz</option>
            </select>
          </label>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>Short description</span>
          <textarea
            form={LESSON_FORM_ID}
            name="description"
            rows={2}
            maxLength={2000}
            defaultValue={defaults.description ?? ""}
            placeholder="One or two sentences shown above the lesson"
            className={`${INPUT} resize-none`}
          />
        </label>
      </div>
    </Card>
  );
}

export function StatusCard({ published }: { published: boolean }) {
  const option = (value: "" | "on", label: string, hint: string, checked: boolean) => (
    <label className="flex cursor-pointer items-start gap-2.5 rounded-[8px] p-2 hover:bg-[#fafaf9]">
      <input form={LESSON_FORM_ID} type="radio" name="published" value={value} defaultChecked={checked} className="mt-0.5 h-4 w-4 accent-[#343332]" />
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-[#6c6a69]">{hint}</span>
      </span>
    </label>
  );
  return (
    <Card title="Status">
      <div className="-m-2 space-y-1">
        {option("", "Draft", "Only your team can see it.", !published)}
        {option("on", "Published", "Visible to students with access.", published)}
      </div>
    </Card>
  );
}

export function AccessCard({ defaults }: { defaults: LessonFormDefaults }) {
  return (
    <Card title="Access">
      <div className="flex flex-col gap-4">
        <label className="flex items-start gap-2.5">
          <input form={LESSON_FORM_ID} type="checkbox" name="free_preview" defaultChecked={defaults.free_preview} className="mt-0.5 h-4 w-4 accent-[#343332]" />
          <span>
            <span className="block text-sm font-medium">Free preview</span>
            <span className="block text-xs text-[#6c6a69]">Any signed-in visitor can watch it.</span>
          </span>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>Unlock after (days)</span>
          <input
            form={LESSON_FORM_ID}
            name="available_after_days"
            type="number"
            min={0}
            defaultValue={defaults.available_after_days ?? ""}
            placeholder="Immediately"
            className={INPUT}
          />
          <span className="text-xs text-[#6c6a69]">Drip: days after the student enrolls. Blank = right away.</span>
        </label>
        {defaults.kind === "quiz" && (
          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>Pass mark (%)</span>
            <input form={LESSON_FORM_ID} name="pass_threshold" type="number" min={0} max={100} defaultValue={defaults.pass_threshold} className={INPUT} />
          </label>
        )}
      </div>
    </Card>
  );
}

export function ThumbnailCard({ thumbnailUrl, durationSeconds }: { thumbnailUrl: string | null; durationSeconds: number | null }) {
  return (
    <Card title="Lesson thumbnail" description="Taken from the Vimeo video.">
      <div className="space-y-3">
        {thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote Vimeo thumbnail, admin-only preview
          <img src={thumbnailUrl} alt="" className="aspect-video w-full rounded-[8px] border border-[#e7e6e4] object-cover" />
        ) : (
          <div className="flex aspect-video w-full items-center justify-center rounded-[8px] border border-dashed border-[#d9d8d6] bg-[#fafaf9] text-xs text-[#6c6a69]">
            Add a video to get a thumbnail
          </div>
        )}
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>Length (seconds)</span>
          <input form={LESSON_FORM_ID} name="duration_seconds" type="number" min={0} defaultValue={durationSeconds ?? ""} className={INPUT} />
          <span className="text-xs text-[#6c6a69]">Filled automatically from Vimeo.</span>
        </label>
      </div>
    </Card>
  );
}
