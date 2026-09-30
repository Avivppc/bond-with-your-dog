import { BTN_PRIMARY, Card, INPUT, LABEL } from "@/app/admin/_components/ui";
import { readNeeds } from "@/lib/content/needs";
import { saveCourseChapter } from "./chapter-actions";
import { NeedsEditor } from "./NeedsEditor";

export interface ChapterDefaults {
  id: string;
  chapter_number: number | null;
  requires_course_id: string | null;
  what_you_need: unknown;
  before_you_start: string | null;
  trailer_url: string | null;
}

export interface CourseChoice {
  id: string;
  title: string;
}

/** Course → Details: chapter order, "Opens after", "What you'll need", "Before you start", trailer. */
export function ChapterDetailsCard({ course, otherCourses }: { course: ChapterDefaults; otherCourses: readonly CourseChoice[] }) {
  return (
    <Card title="Chapter & course page" description="How this course appears in the member app's My Courses and course overview.">
      <form action={saveCourseChapter} className="flex flex-col gap-5">
        <input type="hidden" name="id" value={course.id} />
        <div className="grid gap-5 sm:grid-cols-[10rem_minmax(0,1fr)]">
          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>Chapter number</span>
            <input name="chapter_number" type="number" min={1} max={99} defaultValue={course.chapter_number ?? ""} placeholder="e.g. 1" className={INPUT} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>Opens after</span>
            <select name="requires_course_id" defaultValue={course.requires_course_id ?? ""} className={INPUT}>
              <option value="">Open right away</option>
              {otherCourses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
            <span className="text-xs text-[#6c6a69]">Shown to members as “Opens after …” on My Courses.</span>
          </label>
        </div>
        <NeedsEditor initial={readNeeds(course.what_you_need)} />
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>Before you start</span>
          <textarea
            name="before_you_start"
            rows={3}
            maxLength={600}
            defaultValue={course.before_you_start ?? ""}
            placeholder="Warm up for two minutes, keep sessions under ten…"
            className={`${INPUT} resize-y`}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>Trailer URL</span>
          <input name="trailer_url" type="url" maxLength={500} defaultValue={course.trailer_url ?? ""} placeholder="https://vimeo.com/…" className={INPUT} />
          <span className="text-xs text-[#6c6a69]">A Vimeo (or other https) link to a short preview of the course.</span>
        </label>
        <div>
          <button type="submit" className={BTN_PRIMARY}>
            Save chapter details
          </button>
        </div>
      </form>
    </Card>
  );
}
