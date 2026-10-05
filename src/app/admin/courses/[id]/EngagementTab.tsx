import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/admin";
import { buildOutline, flattenLessons, type OutlineLessonRow, type OutlineModule } from "@/lib/course-outline";
import { biggestDropOff, clock, engagementRows, type EngagementRow, type EngagementStat } from "@/lib/admin-helpers/engagement";
import { Card, EmptyState, Notice, TABLE, TD, TH, THEAD, TROW } from "@/app/admin/_components/ui";

/** Module title of each lesson (submodules show their own title). */
function moduleTitles(modules: readonly OutlineModule[]): Map<string, string> {
  return new Map(
    modules.flatMap((m) => [...m.lessons.map((l): [string, string] => [l.id, m.title]), ...moduleTitles(m.submodules)]),
  );
}

function Bar({ value }: { value: number | null }) {
  if (value === null) return <span className="text-[#9b9997]">—</span>;
  return (
    <span className="flex items-center gap-2">
      <span className="h-1.5 w-20 overflow-hidden rounded-full bg-[#efeeed]" aria-hidden>
        <span className="block h-full rounded-full bg-[#b36200]" style={{ width: `${Math.min(100, value)}%` }} />
      </span>
      <span className="tabular-nums">{Math.round(value)}%</span>
    </span>
  );
}

function LessonRow({ row, courseId }: { row: EngagementRow; courseId: string }) {
  return (
    <tr className={TROW}>
      <td className={`${TD} w-10 tabular-nums text-[#6c6a69]`}>{row.number}</td>
      <td className={TD}>
        <Link href={`/admin/courses/${courseId}/lessons/${row.id}`} className="font-medium hover:underline">
          {row.title}
        </Link>
        {row.moduleTitle && <span className="block text-[12px] text-[#6c6a69]">{row.moduleTitle}</span>}
      </td>
      <td className={`${TD} tabular-nums text-[#6c6a69] max-md:hidden`}>{clock(row.videoSeconds)}</td>
      <td className={`${TD} tabular-nums`}>
        {row.viewers}
        {row.reachPct !== null && row.number > 1 && <span className="ml-1 text-[12px] text-[#6c6a69]">({row.reachPct}%)</span>}
      </td>
      <td className={`${TD} tabular-nums`}>
        {row.completed}
        {row.completionPct !== null && <span className="ml-1 text-[12px] text-[#6c6a69]">({row.completionPct}%)</span>}
      </td>
      <td className={`${TD} max-md:hidden`}>
        <Bar value={row.avgWatchedPct} />
      </td>
      <td className={`${TD} tabular-nums max-lg:hidden`}>
        {row.medianStopSeconds === null ? <span className="text-[#9b9997]">—</span> : clock(row.medianStopSeconds)}
      </td>
    </tr>
  );
}

/**
 * How students watch each lesson: who opened it, who finished, how much of the video they played,
 * and where those who didn't finish usually stopped. Read with the service role (staff checked).
 */
export async function CourseEngagementTab({ courseId }: { courseId: string }) {
  const sb = createServiceClient();
  const [modulesRes, lessonsRes, statsRes] = await Promise.all([
    sb.from("modules").select("id, parent_id, title, position, published").eq("course_id", courseId),
    sb.from("lessons").select("id, module_id, title, position, published, kind, free_preview, available_after_days").eq("course_id", courseId),
    sb.rpc("admin_lesson_engagement", { p_course_id: courseId }),
  ]);
  const failed = modulesRes.error ?? lessonsRes.error ?? statsRes.error;
  if (failed) console.error("[course] engagement load failed", { courseId, error: failed.message });

  const outline = buildOutline(modulesRes.data ?? [], (lessonsRes.data ?? []) as OutlineLessonRow[]);
  const titles = moduleTitles(outline.modules);
  const lessons = flattenLessons(outline).map((l) => ({ id: l.id, title: l.title, moduleTitle: titles.get(l.id) ?? null }));
  const rows = engagementRows(lessons, (statsRes.data ?? []) as EngagementStat[]);
  const drop = biggestDropOff(rows);
  const started = rows[0]?.viewers ?? 0;

  return (
    <div className="space-y-4">
      {failed && <Notice tone="error">The numbers couldn&apos;t be loaded. Please refresh the page.</Notice>}
      {drop && (
        <p className="rounded-[10px] border border-[#f1d9b5] bg-[#fdf6ec] px-4 py-3 text-[14px] text-[#7a4a00]">
          <b>Biggest drop:</b> {drop.lost} students who opened lesson {drop.row.number - 1} didn&apos;t open lesson {drop.row.number} (&ldquo;{drop.row.title}&rdquo;).
        </p>
      )}
      <Card
        flush
        title="Engagement"
        description={
          started > 0
            ? `${started} students started this course. "Watched" counts the seconds actually played (skipping ahead doesn't count); "Usually stops at" is where students who didn't finish the lesson stopped. The team's own viewing isn't included.`
            : "No students have started this course yet. Numbers appear here as soon as they watch."
        }
      >
        {rows.length === 0 ? (
          <EmptyState title="No lessons yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className={TABLE}>
              <thead className={THEAD}>
                <tr>
                  <th className={TH}>#</th>
                  <th className={TH}>Lesson</th>
                  <th className={`${TH} max-md:hidden`}>Video</th>
                  <th className={TH}>Opened</th>
                  <th className={TH}>Finished</th>
                  <th className={`${TH} max-md:hidden`}>Watched (avg)</th>
                  <th className={`${TH} max-lg:hidden`}>Usually stops at</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <LessonRow key={row.id} row={row} courseId={courseId} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
