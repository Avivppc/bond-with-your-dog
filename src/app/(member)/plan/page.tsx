import Link from "next/link";
import { requireMember } from "@/lib/member/viewer";
import { Ms, Tip } from "@/components/app/ui";
import {
  addDays,
  firstOfMonth,
  isIsoDate,
  lastOfMonth,
  longDateLabel,
  mondayOf,
  monthKey,
  monthOf,
  parseMonth,
  shortDayLabel,
} from "@/lib/practice/dates";
import { buildWeek, weekTotals } from "@/lib/practice/week-plan";
import { buildMonthCalendar, busiestDayPart, inMonth, monthStats, type MonthSession } from "@/lib/practice/month";
import { viewerToday } from "@/lib/practice/server/zone";
import { loadPracticeCatalog } from "@/lib/practice/server/catalog";
import { NoDogCard } from "../practice/_components/NoDogCard";
import { TimeZoneSync } from "../practice/_components/TimeZoneSync";
import { AddSessionForm } from "./AddSessionForm";
import { PracticePrefs } from "./PracticePrefs";
import { WeekStrip } from "./WeekStrip";
import { MonthCard } from "./MonthCard";
import { loadPlanData } from "./load";

export const metadata = { title: "Weekly plan · Bonded" };

/** How many days ahead "Add a session" offers. */
const PLAN_DAYS_OFFERED = 14;

type Search = Promise<Record<string, string | string[] | undefined>>;

function PlanTip({ sessions, timeZone, dogName }: { sessions: MonthSession[]; timeZone: string; dogName: string }) {
  const best = busiestDayPart(sessions.map((s) => s.createdAt), timeZone);
  if (best) {
    return (
      <Tip icon="insights">
        Most of your sessions this month were logged in the {best.part} ({best.count} of {best.total}). If that suits {dogName}, keep that slot for practice.
      </Tip>
    );
  }
  return (
    <Tip icon="insights">
      Short and often beats long and rare. After a few more sessions you&apos;ll see here what time of day you practise most.
    </Tip>
  );
}

export default async function PlanPage({ searchParams }: { searchParams: Search }) {
  const viewer = await requireMember("/plan");
  const sp = await searchParams;
  const dog = viewer.activeDog;
  const header = (action?: React.ReactNode) => (
    <div className="between">
      <div className="head-block">
        <span className="eyebrow">Practice</span>
        <h1 className="h1">This week with {dog?.name ?? "your dog"}</h1>
        <p className="lede">Short and often beats long and rare. Roni recommends 3–5 sessions of 5–10 minutes.</p>
      </div>
      {action}
    </div>
  );
  if (!dog) return <>{header()}<NoDogCard eyebrow="Weekly plan" what="Your plan and practice history are kept per dog." /></>;

  const { today, timeZone } = await viewerToday();
  const weekParam = typeof sp.week === "string" && isIsoDate(sp.week) ? sp.week : today;
  const monday = mondayOf(weekParam);
  const sunday = addDays(monday, 6);
  const month = parseMonth(typeof sp.month === "string" ? sp.month : undefined, monthOf(today));
  const from = [monday, firstOfMonth(month)].sort()[0];
  const to = [sunday, lastOfMonth(month)].sort()[1];

  const [data, catalog] = await Promise.all([loadPlanData(dog.id, { from, to }, { from: monday, to: sunday }), loadPracticeCatalog(viewer.userId)]);
  const week = buildWeek({
    monday,
    today,
    sessions: data.done,
    planned: data.planned,
    practiceDays: viewer.profile.practice_days,
    sessionMinutes: viewer.profile.session_minutes,
  });
  const totals = weekTotals(week);
  const stats = monthStats(month, data.month);
  const isCurrentMonth = monthKey(month) === monthKey(monthOf(today));
  const isThisWeek = monday === mondayOf(today);

  const dayOptions = Array.from({ length: PLAN_DAYS_OFFERED }, (_, i) => {
    const d = addDays(today, i);
    return { value: d, label: i === 0 ? `Today (${shortDayLabel(d)})` : i === 1 ? `Tomorrow (${shortDayLabel(d)})` : shortDayLabel(d) };
  });
  const lessonOptions = catalog.lessons
    .filter((l) => l.accessible)
    .sort((a, b) => b.stepCount - a.stepCount)
    .map((l) => ({ id: l.id, label: `${l.title} · ${l.courseTitle}${l.stepCount ? "" : " (no practice steps yet)"}` }));

  return (
    <>
      <TimeZoneSync />
      {header(<AddSessionForm dogId={dog.id} days={dayOptions} lessons={lessonOptions} defaultMinutes={viewer.profile.session_minutes} />)}
      <div className="stack">
        <div className="between" style={{ alignItems: "center" }}>
          <div className="row">
            <Link className="icon-btn" href={`/plan?week=${addDays(monday, -7)}`} aria-label="Previous week" scroll={false}>
              <Ms name="chevron_left" />
            </Link>
            <b className="num">
              {isThisWeek ? "This week" : `${longDateLabel(monday)} – ${longDateLabel(sunday)}`}
            </b>
            {!isThisWeek && (
              <Link className="icon-btn" href={`/plan?week=${addDays(monday, 7)}`} aria-label="Next week" scroll={false}>
                <Ms name="chevron_right" />
              </Link>
            )}
            <span className="faint num">
              {totals.doneSessions} {totals.doneSessions === 1 ? "session" : "sessions"} · {totals.doneMinutes} min together
              {totals.upcoming > 0 ? ` · ${totals.upcoming} still planned` : ""}
            </span>
          </div>
          <PracticePrefs days={viewer.profile.practice_days} minutes={viewer.profile.session_minutes} />
        </div>
        <WeekStrip days={week} />
      </div>
      <div className="grid-7-5">
        <MonthCard month={month} calendar={buildMonthCalendar(month, data.month)} today={today} isCurrentMonth={isCurrentMonth} />
        <div className="card">
          <span className="eyebrow muted">{isCurrentMonth ? "This month" : "That month"}</span>
          <div className="grid-2" style={{ gap: 18 }}>
            <div className="stat">
              <b>{stats.sessions}</b>
              <span>Sessions</span>
            </div>
            <div className="stat">
              <b>{stats.minutes}</b>
              <span>Minutes together</span>
            </div>
            <div className="stat">
              <b>
                {stats.longestRhythm} {stats.longestRhythm === 1 ? "day" : "days"}
              </b>
              <span>Longest rhythm</span>
            </div>
            <div className="stat">
              <b>{stats.averageMinutes} min</b>
              <span>Average session</span>
            </div>
          </div>
          <PlanTip sessions={data.month.filter((s) => inMonth(month, s.practicedOn))} timeZone={timeZone} dogName={dog.name} />
          {stats.sessions === 0 && (
            <Link className="btn btn-primary btn-sm" href="/practice" style={{ alignSelf: "flex-start" }}>
              <Ms name="pets" size="sm" />
              Start a session
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
