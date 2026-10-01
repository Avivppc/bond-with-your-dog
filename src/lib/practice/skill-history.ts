import type { SkillLevel } from "@/lib/member/viewer";
import { daysBetween, isoDateInZone, longDateLabel } from "./dates";
import { LEVEL_RANK } from "./moves";

/**
 * A dog's skill-level history (public.dog_skill_events, one row per level change) turned into
 * the Progress page's "Reliable since …" lines and recent milestones. Pure.
 */
export interface SkillEvent {
  moveId: string;
  fromLevel: SkillLevel | null;
  toLevel: SkillLevel;
  setBy: "member" | "coach";
  createdAt: string;
}

export interface MoveHistory {
  level: SkillLevel;
  /** Calendar date (viewer's zone) the move last reached its current level. */
  since: string;
  /** Days from first marking it Learning to reaching the current level (reliable/performance only). */
  daysFromLearning: number | null;
}

export interface SkillMilestone {
  moveId: string;
  level: SkillLevel;
  /** Calendar date in the viewer's zone. */
  on: string;
  byCoach: boolean;
}

const LEVEL_LABEL: Record<SkillLevel, string> = { learning: "Learning", reliable: "Reliable", performance: "Performance-ready" };

function byTime(a: SkillEvent, b: SkillEvent): number {
  return a.createdAt.localeCompare(b.createdAt);
}

/** Per move with a current level: since when, and how long it took from Learning. */
export function summarizeSkillHistory(
  events: readonly SkillEvent[],
  levels: ReadonlyMap<string, SkillLevel>,
  timeZone: string
): Map<string, MoveHistory> {
  const sorted = [...events].sort(byTime);
  const dayOf = (e: SkillEvent) => isoDateInZone(new Date(e.createdAt), timeZone);
  const entries = [...levels.entries()].flatMap(([moveId, level]): [string, MoveHistory][] => {
    const moveEvents = sorted.filter((e) => e.moveId === moveId);
    const reached = moveEvents.filter((e) => e.toLevel === level).at(-1);
    if (!reached) return [];
    const learning = level === "learning" ? undefined : moveEvents.find((e) => e.toLevel === "learning");
    const firstAtLevel = learning ? moveEvents.find((e) => e.toLevel === level && e.createdAt >= learning.createdAt) : undefined;
    const daysFromLearning = learning && firstAtLevel ? daysBetween(dayOf(learning), dayOf(firstAtLevel)) : null;
    return [[moveId, { level, since: dayOf(reached), daysFromLearning }]];
  });
  return new Map(entries);
}

/** "September 2", with the year when it isn't this year. */
export function dateLabel(iso: string, todayIso: string): string {
  return iso.slice(0, 4) === todayIso.slice(0, 4) ? longDateLabel(iso) : `${longDateLabel(iso)}, ${iso.slice(0, 4)}`;
}

/** "Reliable since September 12 · 9 days from Learning" (or "Learning since …"). */
export function historyLine(history: MoveHistory, todayIso: string): string {
  const since = `${LEVEL_LABEL[history.level]} since ${dateLabel(history.since, todayIso)}`;
  if (history.daysFromLearning === null) return since;
  const days = history.daysFromLearning;
  return `${since} · ${days === 0 ? "same day" : `${days} ${days === 1 ? "day" : "days"}`} from Learning`;
}

/** The latest step-ups to Reliable or Performance-ready, newest first. */
export function recentMilestones(events: readonly SkillEvent[], timeZone: string, limit: number): SkillMilestone[] {
  return [...events]
    .filter((e) => e.toLevel !== "learning" && (e.fromLevel === null || LEVEL_RANK[e.toLevel] > LEVEL_RANK[e.fromLevel]))
    .sort((a, b) => byTime(b, a))
    .slice(0, limit)
    .map((e) => ({ moveId: e.moveId, level: e.toLevel, on: isoDateInZone(new Date(e.createdAt), timeZone), byCoach: e.setBy === "coach" }));
}
