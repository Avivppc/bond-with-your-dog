/** Where a member stands with one course (My Courses card, course overview). */
export type CourseStatus = "not_owned" | "locked" | "not_started" | "in_progress" | "completed";

export function courseStatus({ enrolled, completed, total, lockedBehind }: { enrolled: boolean; completed: number; total: number; lockedBehind: boolean }): CourseStatus {
  if (!enrolled) return "not_owned";
  if (lockedBehind) return "locked";
  if (total > 0 && completed >= total) return "completed";
  return completed > 0 ? "in_progress" : "not_started";
}

export const STATUS_LABEL: Record<CourseStatus, string> = {
  not_owned: "Not in your plan yet",
  locked: "Opens after",
  not_started: "Ready to start",
  in_progress: "In progress",
  completed: "Completed",
};
