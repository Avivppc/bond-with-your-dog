/** Achievements on the progress page: earned first, then what's still ahead with a real hint. Pure. */
export interface AchievementDef {
  code: string;
  title: string;
  description: string;
  icon: string;
  rule: string;
}

export interface AchievementContext {
  completedLessons: number;
  practiceSessions: number;
  longestRhythm: number;
  feedbackVideos: number;
  routines: number;
  /** Lessons left in the course closest to completion (null when not enrolled). */
  lessonsLeftInClosestCourse: { title: string; left: number } | null;
}

export interface AchievementView extends AchievementDef {
  earnedAt: string | null;
  hint: string;
}

const LESSON_COUNT_RULE = /^lessons_count_(\d+)$/;
const STREAK_RULE = /^practice_streak_(\d+)$/;

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

export function achievementHint(rule: string, ctx: AchievementContext): string {
  const lessons = LESSON_COUNT_RULE.exec(rule);
  if (lessons) {
    const left = Math.max(0, Number(lessons[1]) - ctx.completedLessons);
    return `${plural(left, "lesson")} to go`;
  }
  const streak = STREAK_RULE.exec(rule);
  if (streak) {
    return ctx.longestRhythm > 0 ? `Best so far: ${plural(ctx.longestRhythm, "day")} in a row` : `Practice ${streak[1]} days in a row`;
  }
  switch (rule) {
    case "first_lesson":
      return "Complete your first lesson";
    case "course_complete":
      return ctx.lessonsLeftInClosestCourse
        ? `${plural(ctx.lessonsLeftInClosestCourse.left, "lesson")} to go in ${ctx.lessonsLeftInClosestCourse.title}`
        : "Finish every lesson of a course";
    case "first_practice":
      return "Finish a session in Practice mode";
    case "first_feedback":
      return ctx.feedbackVideos > 0 ? "Roni is reviewing your video" : "Send Roni a video";
    case "first_routine":
      return "Build a routine to music";
    default:
      return "Keep going";
  }
}

export function buildAchievements(defs: readonly AchievementDef[], earned: ReadonlyMap<string, string>, ctx: AchievementContext): AchievementView[] {
  const views = defs.map((d) => ({ ...d, earnedAt: earned.get(d.code) ?? null, hint: achievementHint(d.rule, ctx) }));
  const earnedViews = views.filter((v) => v.earnedAt).sort((a, b) => (a.earnedAt ?? "").localeCompare(b.earnedAt ?? ""));
  return [...earnedViews, ...views.filter((v) => !v.earnedAt)];
}

/** "three" for small counts, digits otherwise — for headings like "26 lessons, three chapters". */
export function countWord(n: number): string {
  const words = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
  return n >= 0 && n < words.length ? words[n] : String(n);
}
