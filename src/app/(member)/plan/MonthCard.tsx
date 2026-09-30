import Link from "next/link";
import { Ms } from "@/components/app/ui";
import { MONTH_NAMES, monthKey, shiftMonth, type MonthRef } from "@/lib/practice/dates";
import type { MonthCalendar } from "@/lib/practice/month";

const HEADS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const LEGEND = ["var(--tint)", "#cfeff0", "#86d3d6", "var(--teal)"];

function cellLabel(date: string, minutes: number, sessions: number): string {
  if (sessions === 0) return `${date}: no practice`;
  return `${date}: ${sessions} ${sessions === 1 ? "session" : "sessions"}, ${minutes} min`;
}

/** Month heatmap (the design's .cal) with previous / next month links. */
export function MonthCard({ month, calendar, today, isCurrentMonth }: { month: MonthRef; calendar: MonthCalendar; today: string; isCurrentMonth: boolean }) {
  const prev = shiftMonth(month, -1);
  const next = shiftMonth(month, 1);
  return (
    <div className="card">
      <div className="card-head">
        <div className="row" style={{ gap: 4 }}>
          <Link className="icon-btn" href={`/plan?month=${monthKey(prev)}`} aria-label={`${MONTH_NAMES[prev.month - 1]} ${prev.year}`} scroll={false}>
            <Ms name="chevron_left" />
          </Link>
          <h2 className="h3">
            {MONTH_NAMES[month.month - 1]}
            {isCurrentMonth ? "" : ` ${month.year}`}
          </h2>
          {!isCurrentMonth && (
            <Link className="icon-btn" href={`/plan?month=${monthKey(next)}`} aria-label={`${MONTH_NAMES[next.month - 1]} ${next.year}`} scroll={false}>
              <Ms name="chevron_right" />
            </Link>
          )}
        </div>
        <div className="row faint" style={{ gap: 6 }} aria-hidden>
          Less
          {LEGEND.map((bg) => (
            <span key={bg} style={{ width: 14, height: 14, borderRadius: 4, background: bg }} />
          ))}
          More
        </div>
      </div>
      <div className="cal" role="list" aria-label={`Practice in ${MONTH_NAMES[month.month - 1]}`}>
        {HEADS.map((h) => (
          <span key={h} className="h" aria-hidden>
            {h}
          </span>
        ))}
        {Array.from({ length: calendar.leadingBlanks }, (_, i) => (
          <span key={`x${i}`} className="x" aria-hidden />
        ))}
        {calendar.cells.map((c) => (
          <span
            key={c.date}
            className={[c.level ? `l${c.level}` : "", c.date === today ? "today" : ""].join(" ").trim()}
            title={cellLabel(c.date, c.minutes, c.sessions)}
            aria-label={cellLabel(c.date, c.minutes, c.sessions)}
            role="listitem"
          >
            {c.day}
          </span>
        ))}
      </div>
    </div>
  );
}
