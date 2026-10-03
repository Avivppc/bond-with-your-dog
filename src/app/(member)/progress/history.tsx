import { SoonLink } from "@/components/app/SoonLink";
import type { SkillLevel } from "@/lib/member/viewer";
import { dateLabel, type SkillMilestone } from "@/lib/practice/skill-history";

const PILL: Record<SkillLevel, { className: string; label: string }> = {
  learning: { className: "learning", label: "Learning" },
  reliable: { className: "reliable", label: "Reliable" },
  performance: { className: "perform", label: "Performance-ready" },
};

export interface MilestoneRow extends SkillMilestone {
  name: string;
  slug: string;
}

/** The dog's latest step-ups (from the skill-level history), newest first. */
export function RecentMilestonesCard({ rows, todayIso }: { rows: readonly MilestoneRow[]; todayIso: string }) {
  if (rows.length === 0) return null;
  return (
    <div className="card tight">
      <span className="eyebrow muted">Recent milestones</span>
      <div className="list">
        {rows.map((m) => (
          <SoonLink key={`${m.moveId}-${m.level}-${m.on}`} className="list-row" href={`/moves?move=${m.slug}`} style={{ padding: "10px 0", gap: 12 }} quiet>
            <div className="grow">
              <b>{m.name}</b>
              <div className="faint">
                {dateLabel(m.on, todayIso)}
                {m.byCoach ? " · marked by Roni" : ""}
              </div>
            </div>
            <span className={`pill ${PILL[m.level].className}`}>{PILL[m.level].label}</span>
          </SoonLink>
        ))}
      </div>
    </div>
  );
}
