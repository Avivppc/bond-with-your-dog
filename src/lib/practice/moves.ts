import type { SkillLevel } from "@/lib/member/viewer";

/** Moves Library, palette and progress helpers around a dog's skill levels. Pure. */
export interface MoveLite {
  id: string;
  slug: string;
  name: string;
  courseId: string | null;
  position: number;
  loadsJoints: boolean;
}

export const LEVEL_RANK: Record<SkillLevel, number> = { learning: 1, reliable: 2, performance: 3 };

export type LevelFilter = SkillLevel | "not_started";
export type MoveFilter = { kind: "all" } | { kind: "course"; courseId: string } | { kind: "level"; level: LevelFilter };

export function parseMoveFilter(value: string | undefined): MoveFilter {
  if (!value || value === "all") return { kind: "all" };
  if (value === "learning" || value === "reliable" || value === "performance" || value === "not_started") return { kind: "level", level: value };
  if (value.startsWith("course:") && value.length > 7) return { kind: "course", courseId: value.slice(7) };
  return { kind: "all" };
}

export function filterKey(filter: MoveFilter): string {
  if (filter.kind === "all") return "all";
  return filter.kind === "course" ? `course:${filter.courseId}` : filter.level;
}

export function filterMoves<M extends MoveLite>(moves: readonly M[], filter: MoveFilter, levels: ReadonlyMap<string, SkillLevel>): M[] {
  return moves.filter((m) => {
    if (filter.kind === "all") return true;
    if (filter.kind === "course") return m.courseId === filter.courseId;
    const level = levels.get(m.id);
    return filter.level === "not_started" ? !level : level === filter.level;
  });
}

/** Palette order: the dog's reliable / performance-ready moves first (best first), then the rest. */
export function paletteOrder<M extends MoveLite>(moves: readonly M[], levels: ReadonlyMap<string, SkillLevel>): M[] {
  const rank = (m: M) => {
    const level = levels.get(m.id);
    return level === "performance" ? 0 : level === "reliable" ? 1 : 2;
  };
  return [...moves].sort((a, b) => rank(a) - rank(b) || a.position - b.position || a.name.localeCompare(b.name));
}

/** Progress list order: most advanced first, then learning, then not started. */
export function progressOrder<M extends MoveLite>(moves: readonly M[], levels: ReadonlyMap<string, SkillLevel>): M[] {
  const rank = (m: M) => -(LEVEL_RANK[levels.get(m.id) as SkillLevel] ?? 0);
  return [...moves].sort((a, b) => rank(a) - rank(b) || a.position - b.position);
}

export function movesReady(levels: ReadonlyMap<string, SkillLevel>): number {
  return [...levels.values()].filter((l) => l === "reliable" || l === "performance").length;
}

/** Show the gentle alternative before the full move for dogs with limitations. */
export function gentleFirst(dogLimitations: readonly string[] | null | undefined, move: { loadsJoints: boolean; gentleAlternative: string | null }): boolean {
  return Boolean(move.loadsJoints && move.gentleAlternative && dogLimitations && dogLimitations.length > 0);
}

export interface PracticeStat {
  moveId: string;
  sessions: number;
  reps: number;
}

export interface Milestone {
  moveId: string;
  sessions: number;
  averageReps: number;
}

/** The learning move with the most practice (ties: most reps), i.e. the closest to "Reliable". */
export function nextMilestone(levels: ReadonlyMap<string, SkillLevel>, stats: readonly PracticeStat[]): Milestone | null {
  const learning = stats.filter((s) => levels.get(s.moveId) === "learning" && s.sessions > 0);
  const best = [...learning].sort((a, b) => b.sessions - a.sessions || b.reps - a.reps)[0];
  if (best) return { moveId: best.moveId, sessions: best.sessions, averageReps: Math.round((best.reps / best.sessions) * 10) / 10 };
  const firstLearning = [...levels.entries()].find(([, l]) => l === "learning");
  return firstLearning ? { moveId: firstLearning[0], sessions: 0, averageReps: 0 } : null;
}

export function aggregatePractice(rows: readonly { move_id: string | null; reps: number }[]): PracticeStat[] {
  const map = new Map<string, PracticeStat>();
  for (const r of rows) {
    if (!r.move_id) continue;
    const cur = map.get(r.move_id) ?? { moveId: r.move_id, sessions: 0, reps: 0 };
    map.set(r.move_id, { ...cur, sessions: cur.sessions + 1, reps: cur.reps + r.reps });
  }
  return [...map.values()];
}

/** Moves steps are stored as a JSON array of strings; ignore anything else. */
export function parseMoveSteps(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((s): s is string => typeof s === "string" && s.trim().length > 0).map((s) => s.trim());
}
