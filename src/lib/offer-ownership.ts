export type AccessLevel = "full" | "limited";

interface LevelRow {
  course_id: string;
  access_level: AccessLevel;
}

/**
 * True when the buyer's ACTIVE enrollments already give everything the offer would — buying it
 * again would add nothing. A limited enrollment doesn't cover an offer that grants full access,
 * so limited members can always buy the upgrade.
 */
export function ownsEverything(offerCourses: readonly LevelRow[], activeEnrollments: readonly LevelRow[]): boolean {
  if (offerCourses.length === 0) return false;
  const levelOf = new Map(activeEnrollments.map((e) => [e.course_id, e.access_level]));
  return offerCourses.every((c) => {
    const owned = levelOf.get(c.course_id);
    return owned === "full" || (owned === "limited" && c.access_level === "limited");
  });
}
