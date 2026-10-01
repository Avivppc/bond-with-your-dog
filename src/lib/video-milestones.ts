/** How far into a lesson video a member got, for lesson_video_progress. 100 comes from "ended". */
export const PROGRESS_MILESTONES = [25, 50, 75] as const;

export function reachedMilestones(seconds: number, duration: number, alreadySent: ReadonlySet<number>): number[] {
  if (!Number.isFinite(duration) || duration <= 0) return [];
  const percent = (seconds / duration) * 100;
  return PROGRESS_MILESTONES.filter((m) => percent >= m && !alreadySent.has(m));
}
