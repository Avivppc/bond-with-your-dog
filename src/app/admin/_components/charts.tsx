/**
 * Tiny dependency-free SVG charts for Analytics / Reports (server-rendered; hover titles as tooltips).
 */
export const CHART_COLORS = ["#4f6bed", "#f28b54", "#3fae8a", "#b565d8", "#e2b93b", "#e0607e", "#6c6a69"] as const;

export interface ChartPoint {
  label: string;
  value: number;
  /** Tooltip text; defaults to "label: value". */
  title?: string;
}

const W = 600;

export function AreaChart({ points, height = 140, color = CHART_COLORS[0] }: { points: readonly ChartPoint[]; height?: number; color?: string }) {
  if (points.length === 0) return null;
  const max = Math.max(1, ...points.map((p) => p.value));
  const step = points.length > 1 ? W / (points.length - 1) : W;
  const y = (v: number) => height - 6 - (v / max) * (height - 16);
  const coords = points.map((p, i) => [points.length > 1 ? i * step : W / 2, y(p.value)] as const);
  const line = coords.map(([x, yy], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${yy.toFixed(1)}`).join(" ");
  const area = `${line} L${coords[coords.length - 1][0].toFixed(1)},${height} L${coords[0][0].toFixed(1)},${height} Z`;
  const id = `g${color.replace("#", "")}`;
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" className="h-auto w-full" role="img" aria-label="Chart">
        <defs>
          <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${id})`} />
        <path d={line} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
        {points.map((p, i) => (
          <rect key={`${p.label}-${i}`} x={coords[i][0] - step / 2} y={0} width={step} height={height} fill="transparent">
            <title>{p.title ?? `${p.label}: ${p.value}`}</title>
          </rect>
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-[11px] text-[#9b9997]">
        <span>{points[0].label}</span>
        {points.length > 2 && <span>{points[Math.floor(points.length / 2)].label}</span>}
        {points.length > 1 && <span>{points[points.length - 1].label}</span>}
      </div>
    </div>
  );
}

export function BarChart({ points, height = 160, color = CHART_COLORS[0] }: { points: readonly ChartPoint[]; height?: number; color?: string }) {
  if (points.length === 0) return null;
  const max = Math.max(1, ...points.map((p) => p.value));
  const slot = W / points.length;
  const bar = Math.max(2, slot * 0.7);
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" className="h-auto w-full" role="img" aria-label="Chart">
        {points.map((p, i) => {
          const h = (p.value / max) * (height - 8);
          return (
            <rect key={`${p.label}-${i}`} x={i * slot + (slot - bar) / 2} y={height - h} width={bar} height={Math.max(h, p.value > 0 ? 1 : 0)} rx="2" fill={color}>
              <title>{p.title ?? `${p.label}: ${p.value}`}</title>
            </rect>
          );
        })}
      </svg>
      <div className="mt-1 flex justify-between text-[11px] text-[#9b9997]">
        <span>{points[0].label}</span>
        {points.length > 1 && <span>{points[points.length - 1].label}</span>}
      </div>
    </div>
  );
}

export interface BarListItem {
  label: string;
  value: number;
  display: string;
  href?: string;
}

/** Ranked horizontal bars (top offers / top customers). */
export function BarList({ items, color = CHART_COLORS[0] }: { items: readonly BarListItem[]; color?: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li key={item.label} className="text-sm">
          <div className="flex items-baseline justify-between gap-3">
            {item.href ? (
              <a href={item.href} className="truncate hover:underline">
                {item.label}
              </a>
            ) : (
              <span className="truncate">{item.label}</span>
            )}
            <span className="shrink-0 font-medium tabular-nums">{item.display}</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#f3f3f2]">
            <div className="h-full rounded-full" style={{ width: `${(item.value / max) * 100}%`, backgroundColor: color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Donut + legend (revenue by payment method). */
export function Donut({ slices, centerLabel, centerValue }: { slices: readonly BarListItem[]; centerLabel: string; centerValue: string }) {
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const r = 42;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 120 120" className="h-28 w-28 shrink-0" role="img" aria-label="Breakdown">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#f3f3f2" strokeWidth="14" />
        {total > 0 &&
          slices.map((s, i) => {
            const length = (s.value / total) * c;
            const el = (
              <circle
                key={s.label}
                cx="60"
                cy="60"
                r={r}
                fill="none"
                stroke={CHART_COLORS[i % CHART_COLORS.length]}
                strokeWidth="14"
                strokeDasharray={`${length} ${c - length}`}
                strokeDashoffset={-offset}
                transform="rotate(-90 60 60)"
              >
                <title>{`${s.label}: ${s.display}`}</title>
              </circle>
            );
            offset += length;
            return el;
          })}
        <text x="60" y="60" textAnchor="middle" fontSize="13" fontWeight="600" fill="#1a1a19">
          {centerValue}
        </text>
        <text x="60" y="75" textAnchor="middle" fontSize="9" fill="#9b9997">
          {centerLabel}
        </text>
      </svg>
      <ul className="min-w-0 flex-1 space-y-1.5 text-sm">
        {slices.map((s, i) => (
          <li key={s.label} className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
              <span className="truncate capitalize">{s.label.replace(/_/g, " ")}</span>
            </span>
            <span className="tabular-nums">{s.display}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
