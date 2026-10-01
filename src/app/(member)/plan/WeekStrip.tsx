import Link from "next/link";
import { WEEKDAY_SHORT, dayOfMonth } from "@/lib/practice/dates";
import type { WeekDay, WeekItem } from "@/lib/practice/week-plan";
import { RemovePlanButton } from "./RemovePlanButton";

function itemNote(item: WeekItem): string {
  if (item.kind === "done") return `${item.minutes} min · done`;
  if (item.past) return `${item.minutes} min · not logged`;
  return item.kind === "planned" ? `${item.minutes} min · planned` : `${item.minutes} min · your rhythm`;
}

function practiceHref(item: WeekItem): string | null {
  if (item.kind === "done" || item.past) return null;
  return item.kind === "planned" && item.lessonId ? `/practice?lesson=${item.lessonId}` : "/practice";
}

function Item({ item, isToday }: { item: WeekItem; isToday: boolean }) {
  const href = isToday ? practiceHref(item) : null;
  const body = (
    <>
      {item.kind === "planned" && !item.past && <RemovePlanButton id={item.id} label={`${item.title} on this day`} />}
      <b>{item.title}</b>
      {itemNote(item)}
    </>
  );
  const cls = `session ${item.kind === "done" ? "done" : ""}`;
  const style = item.kind !== "done" && item.past ? { opacity: 0.6 } : undefined;
  return href ? (
    <div className={cls} style={style}>
      {body}
      <Link className="link" href={href} style={{ fontSize: 12.5, marginTop: 4 }}>
        Start now
      </Link>
    </div>
  ) : (
    <div className={cls} style={style}>
      {body}
    </div>
  );
}

/** The design's Mon–Sun strip: practiced (teal), planned, rest days, today outlined. */
export function WeekStrip({ days }: { days: WeekDay[] }) {
  return (
    <div className="week">
      {days.map((d) => (
        <div key={d.date} className={`wday ${d.isRest ? "rest" : ""} ${d.isToday ? "today" : ""}`} aria-current={d.isToday ? "date" : undefined}>
          <div className="d">
            {WEEKDAY_SHORT[d.weekday]} <b>{dayOfMonth(d.date)}</b>
          </div>
          {d.isRest ? (
            <span className="faint">Rest day</span>
          ) : (
            d.items.map((item, i) => <Item key={item.kind === "default" ? `default-${i}` : item.id} item={item} isToday={d.isToday} />)
          )}
        </div>
      ))}
    </div>
  );
}
