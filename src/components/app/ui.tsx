/**
 * Member App building blocks. Styling lives in src/styles/member-app.css (the design's classes,
 * scoped under .member-app); these components only render the right markup.
 */
import Link from "next/link";
import type { SkillLevel } from "@/lib/member/viewer";

export function Ms({ name, fill = false, size, className = "", color }: { name: string; fill?: boolean; size?: "sm"; className?: string; color?: string }) {
  return (
    <span className={`ms ${fill ? "fill" : ""} ${size ?? ""} ${className}`.trim()} style={color ? { color } : undefined} aria-hidden>
      {name}
    </span>
  );
}

export function Eyebrow({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) {
  return <span className={`eyebrow ${muted ? "muted" : ""}`}>{children}</span>;
}

/** Circular progress (orange arc on a tint track) with the percentage in the middle. */
export function Ring({ percent, size = 60 }: { percent: number; size?: number }) {
  const r = size / 2 - 5;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div className="ring" role="img" aria-label={`${pct}% complete`}>
      <svg width={size} height={size} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--tint-2)" strokeWidth="5" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--orange)" strokeWidth="5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} />
      </svg>
      <b style={{ fontSize: size > 60 ? 16 : 13 }}>{pct}%</b>
    </div>
  );
}

export function ProgressLine({ label, value, percent }: { label: React.ReactNode; value: React.ReactNode; percent: number }) {
  return (
    <div className="progress-line">
      <div className="row">
        <span>{label}</span>
        <span className="num">{value}</span>
      </div>
      <div className="bar" role="progressbar" aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100}>
        <i style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} />
      </div>
    </div>
  );
}

const LEVEL: Record<SkillLevel, { cls: string; label: string }> = {
  learning: { cls: "learning", label: "Learning" },
  reliable: { cls: "reliable", label: "Reliable" },
  performance: { cls: "perform", label: "Performance-ready" },
};

export function LevelPill({ level }: { level: SkillLevel }) {
  return <span className={`pill ${LEVEL[level].cls}`}>{LEVEL[level].label}</span>;
}

export function Pill({ tone = "neutral", children }: { tone?: "neutral" | "learning" | "reliable" | "perform"; children: React.ReactNode }) {
  return <span className={`pill ${tone}`}>{children}</span>;
}

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
/** Monday-first order used by every week strip. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

export interface DayState {
  weekday: number; // 0 = Sunday
  done?: boolean;
  planned?: boolean;
  today?: boolean;
  minutes?: number;
}

/** Mon–Sun strip: teal check = practised, orange ring = planned. */
export function Days({ days }: { days: DayState[] }) {
  const byDay = new Map(days.map((d) => [d.weekday, d]));
  return (
    <div className="days">
      {WEEK_ORDER.map((wd) => {
        const d = byDay.get(wd);
        const cls = ["day", d?.done ? "done" : d?.planned ? "plan" : "", d?.today ? "today" : ""].join(" ").trim();
        return (
          <div key={wd} className={cls}>
            <i>{d?.done ? <Ms name="check" size="sm" /> : d?.planned ? `${d.minutes ?? ""}'` : null}</i>
            {WEEKDAYS[wd]}
          </div>
        );
      })}
    </div>
  );
}

export type LessonMark = "done" | "next" | "lock" | "open";

export function StateIc({ mark, small = false }: { mark: LessonMark; small?: boolean }) {
  const icon = mark === "done" ? "check" : mark === "next" ? "play_arrow" : mark === "lock" ? "lock" : "play_arrow";
  const cls = mark === "open" ? "" : mark;
  return (
    <span className={`state-ic ${cls}`} style={small ? { width: 24, height: 24 } : undefined}>
      <Ms name={icon} size="sm" />
    </span>
  );
}

/** One dot per lesson: teal = done, orange ring = the one in progress. */
export function Dots({ total, done }: { total: number; done: number }) {
  return (
    <div className="dots" role="img" aria-label={`${done} of ${total} lessons done`}>
      {Array.from({ length: total }, (_, i) => (
        <i key={i} className={i < done ? "done" : i === done ? "now" : ""}>
          {i + 1}
        </i>
      ))}
    </div>
  );
}

export function Tip({ icon = "favorite", warm = false, children }: { icon?: string; warm?: boolean; children: React.ReactNode }) {
  return (
    <div className={`tip ${warm ? "warm" : ""}`}>
      <Ms name={icon} />
      <div>{children}</div>
    </div>
  );
}

export function Sketch({ src, size = 96, imgSize, round = false }: { src: string; size?: number; imgSize?: number; round?: boolean }) {
  return (
    <div className="sketch" style={{ width: size, height: size, borderRadius: round ? "50%" : undefined }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- small design illustration */}
      <img src={src} alt="" style={{ width: imgSize ?? size - 12 }} />
    </div>
  );
}

export function ArrowLink({ href, children, external = false }: { href: string; children: React.ReactNode; external?: boolean }) {
  if (external) {
    return (
      <a className="link" href={href} target="_blank" rel="noopener noreferrer">
        {children}
        <Ms name="open_in_new" />
      </a>
    );
  }
  return (
    <Link className="link" href={href}>
      {children}
      <Ms name="arrow_forward" />
    </Link>
  );
}

/** Empty / locked / error card — one consistent voice for "not ready" moments. */
export function StateCard({
  icon,
  tone = "tint",
  eyebrow,
  title,
  children,
  action,
}: {
  icon: string;
  tone?: "tint" | "orange" | "danger" | "teal";
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  const style =
    tone === "orange"
      ? { background: "var(--orange-soft)", color: "var(--cognac)" }
      : tone === "danger"
        ? { background: "var(--danger-soft)", color: "var(--danger)" }
        : tone === "teal"
          ? { background: "var(--teal-soft)", color: "var(--teal)" }
          : undefined;
  return (
    <div className="card state-card">
      <div className="big-ic" style={style}>
        <Ms name={icon} />
      </div>
      <span className="eyebrow muted">{eyebrow}</span>
      <h2 className="h3">{title}</h2>
      {children && <p className="faint">{children}</p>}
      {action}
    </div>
  );
}

export function Breadcrumbs({ items }: { items: { href?: string; label: string }[] }) {
  return (
    <nav className="row faint" aria-label="Breadcrumb">
      {items.map((it, i) => (
        <span key={i} className="row" style={{ gap: 6 }}>
          {i > 0 && <Ms name="chevron_right" size="sm" />}
          {it.href ? <Link href={it.href}>{it.label}</Link> : <span style={{ color: "var(--ink)" }}>{it.label}</span>}
        </span>
      ))}
    </nav>
  );
}

export function formatMinutes(seconds: number | null | undefined): string | null {
  if (!seconds) return null;
  const m = Math.max(1, Math.round(seconds / 60));
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`;
}
