"use client";

import { useState, useTransition } from "react";
import { Card, INPUT, LABEL, Notice } from "@/app/admin/_components/ui";
import { TextListEditor } from "@/app/admin/courses/_editors/ListEditors";
import { MOVE_STEPS } from "@/lib/content/limits";
import { slugify } from "@/lib/content/slug";
import { saveMove } from "./actions";
import { MoveImageField } from "./MoveImageField";

/**
 * The move editor. Fields sit in cards across two columns (Kajabi layout) and join one empty form
 * (MOVE_FORM_ID) so the header's Save button and the page's own delete form can live beside them.
 */
export const MOVE_FORM_ID = "move-form";

export interface MoveDefaults {
  id: string | null;
  name: string;
  slug: string;
  course_id: string | null;
  lesson_id: string | null;
  cue: string | null;
  summary: string | null;
  steps: readonly string[];
  video_url: string | null;
  image_url: string | null;
  loads_joints: boolean;
  gentle_alternative: string | null;
  position: number;
  published: boolean;
}

export interface CourseOption {
  id: string;
  title: string;
}

export interface LessonOption {
  id: string;
  title: string;
  course_id: string;
}

interface MoveFormProps {
  move: MoveDefaults;
  courses: readonly CourseOption[];
  lessons: readonly LessonOption[];
  /** Server-rendered extras for the right rail (e.g. the delete card). */
  aside?: React.ReactNode;
}

export function MoveForm({ move, courses, lessons, aside }: MoveFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(move.name);
  const [slug, setSlug] = useState(move.slug);
  const [slugEdited, setSlugEdited] = useState(Boolean(move.id));
  const [courseId, setCourseId] = useState(move.course_id ?? "");
  const [lessonId, setLessonId] = useState(move.lesson_id ?? "");
  const [loadsJoints, setLoadsJoints] = useState(move.loads_joints);
  const courseLessons = lessons.filter((l) => l.course_id === courseId);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await saveMove(data);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <>
      <form id={MOVE_FORM_ID} onSubmit={submit} className="hidden" aria-busy={pending}>
        {move.id && <input type="hidden" name="id" value={move.id} />}
      </form>
      {error && (
        <div className="mb-5">
          <Notice tone="error">{error}</Notice>
        </div>
      )}
      {pending && <p role="status" className="mb-3 text-sm text-[#6c6a69]">Saving…</p>}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          <Card title="Move details">
            <div className="flex flex-col gap-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className={LABEL}>Name</span>
                  <input
                    form={MOVE_FORM_ID}
                    name="name"
                    required
                    maxLength={80}
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (!slugEdited) setSlug(slugify(e.target.value));
                    }}
                    placeholder="Spin"
                    className={INPUT}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className={LABEL}>URL name</span>
                  <input
                    form={MOVE_FORM_ID}
                    name="slug"
                    required
                    maxLength={60}
                    pattern="[a-z0-9-]{2,60}"
                    value={slug}
                    onChange={(e) => {
                      setSlug(e.target.value);
                      setSlugEdited(true);
                    }}
                    className={INPUT}
                  />
                  <span className="text-xs text-[#6c6a69]">/moves?move={slug || "…"}</span>
                </label>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className={LABEL}>Chapter (course)</span>
                  <select
                    form={MOVE_FORM_ID}
                    name="course_id"
                    value={courseId}
                    onChange={(e) => {
                      setCourseId(e.target.value);
                      setLessonId("");
                    }}
                    className={INPUT}
                  >
                    <option value="">No course</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className={LABEL}>Lesson</span>
                  <select form={MOVE_FORM_ID} name="lesson_id" value={lessonId} onChange={(e) => setLessonId(e.target.value)} disabled={!courseId} className={INPUT}>
                    <option value="">{courseId ? "No lesson" : "Choose a course first"}</option>
                    {courseLessons.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.title}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="flex flex-col gap-1.5">
                <span className={LABEL}>Cue</span>
                <input form={MOVE_FORM_ID} name="cue" maxLength={120} defaultValue={move.cue ?? ""} placeholder={'"Spin" · hand circles at nose height'} className={INPUT} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={LABEL}>Summary</span>
                <textarea form={MOVE_FORM_ID} name="summary" rows={3} maxLength={600} defaultValue={move.summary ?? ""} className={`${INPUT} resize-y`} />
              </label>
              <TextListEditor
                formId={MOVE_FORM_ID}
                name="steps"
                label={MOVE_STEPS.label}
                itemLabel="step"
                addLabel="Add step"
                initial={move.steps}
                maxItems={MOVE_STEPS.maxItems}
                maxLength={MOVE_STEPS.maxLength}
                placeholder="Lure a full circle at nose height"
                numbered
              />
            </div>
          </Card>
          <Card title="Clip" description="A short Vimeo (or other https) clip of the move.">
            <input form={MOVE_FORM_ID} name="video_url" type="url" maxLength={500} defaultValue={move.video_url ?? ""} placeholder="https://vimeo.com/…" className={INPUT} />
          </Card>
        </div>

        <aside className="space-y-6">
          <StatusCard published={move.published} position={move.position} />
          <MoveImageField formId={MOVE_FORM_ID} initialUrl={move.image_url} alt={name} />
          <Card title="Joint care">
            <div className="flex flex-col gap-4">
              <label className="flex items-start gap-2.5">
                <input
                  form={MOVE_FORM_ID}
                  type="checkbox"
                  name="loads_joints"
                  checked={loadsJoints}
                  onChange={(e) => setLoadsJoints(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[#343332]"
                />
                <span>
                  <span className="block text-sm font-medium">Loads the joints</span>
                  <span className="block text-xs text-[#6c6a69]">Paws-up, hops, jumps… Dogs with a limitation see the gentle alternative first.</span>
                </span>
              </label>
              {/* Kept mounted while unchecked so a written alternative isn't lost by a stray click. */}
              <label className={`flex-col gap-1.5 ${loadsJoints ? "flex" : "hidden"}`}>
                <span className={LABEL}>Gentle alternative</span>
                <textarea form={MOVE_FORM_ID} name="gentle_alternative" rows={3} maxLength={600} defaultValue={move.gentle_alternative ?? ""} className={`${INPUT} resize-y`} />
              </label>
            </div>
          </Card>
          {aside}
        </aside>
      </div>
    </>
  );
}

function StatusCard({ published, position }: { published: boolean; position: number }) {
  const option = (value: "" | "on", label: string, hint: string, checked: boolean) => (
    <label className="flex cursor-pointer items-start gap-2.5 rounded-[8px] p-2 hover:bg-[#fafaf9]">
      <input form={MOVE_FORM_ID} type="radio" name="published" value={value} defaultChecked={checked} className="mt-0.5 h-4 w-4 accent-[#343332]" />
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
        {option("on", "Published", "Visible in the members' Moves Library.", published)}
      </div>
      <label className="mt-4 flex flex-col gap-1.5">
        <span className={LABEL}>Position</span>
        <input form={MOVE_FORM_ID} name="position" type="number" min={0} max={1000} defaultValue={position} className={INPUT} />
        <span className="text-xs text-[#6c6a69]">Lower numbers come first.</span>
      </label>
    </Card>
  );
}
