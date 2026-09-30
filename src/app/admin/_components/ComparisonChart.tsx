import { CHART_COLORS } from "./charts";

export interface ComparisonChartPoint {
  label: string;
  current: number;
  previous: number | null;
}

const W = 600;
const PREVIOUS_COLOR = "#b8b6b4";
const GRID = [0, 0.5, 1] as const;

function linePath(values: readonly (number | null)[], x: (i: number) => number, y: (v: number) => number): string {
  const parts = values.flatMap((v, i) => (v === null ? [] : [`${x(i).toFixed(1)},${y(v).toFixed(1)}`]));
  return parts.length ? `M${parts.join(" L")}` : "";
}

function Legend() {
  return (
    <div className="mt-3 flex flex-wrap gap-4 text-[12px] text-[#6c6a69]">
      <span className="flex items-center gap-1.5">
        <span className="h-0.5 w-4 rounded-full" style={{ backgroundColor: CHART_COLORS[0] }} aria-hidden />
        This period
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-4 border-t-2 border-dashed" style={{ borderColor: PREVIOUS_COLOR }} aria-hidden />
        Previous period
      </span>
    </div>
  );
}

/**
 * Kajabi's dashboard chart: this period as a solid line, the previous period dashed, light
 * gridlines, hover titles as tooltips. Server-rendered SVG.
 */
export function ComparisonChart({
  points,
  format,
  height = 220,
}: {
  points: readonly ComparisonChartPoint[];
  format: (value: number) => string;
  height?: number;
}) {
  if (points.length === 0) return null;
  const max = Math.max(1, ...points.map((p) => Math.max(p.current, p.previous ?? 0)));
  const top = 10;
  const bottom = height - 4;
  const x = (i: number) => (points.length > 1 ? (i / (points.length - 1)) * W : W / 2);
  const y = (v: number) => bottom - (v / max) * (bottom - top);
  const step = points.length > 1 ? W / (points.length - 1) : W;

  return (
    <div>
      <div className="flex gap-2">
        <div className="flex w-14 shrink-0 flex-col justify-between py-1 text-right text-[11px] tabular-nums text-[#9b9997]" style={{ height }}>
          {[...GRID].reverse().map((g) => (
            <span key={g}>{format(Math.round(max * g))}</span>
          ))}
        </div>
        <svg
          viewBox={`0 0 ${W} ${height}`}
          preserveAspectRatio="none"
          className="w-full"
          style={{ height }}
          role="img"
          aria-label="Chart comparing this period with the previous period"
        >
          {GRID.map((g) => (
            <line key={g} x1={0} x2={W} y1={y(max * g)} y2={y(max * g)} stroke="#efeeed" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          ))}
          <path
            d={linePath(points.map((p) => p.previous), x, y)}
            fill="none"
            stroke={PREVIOUS_COLOR}
            strokeWidth="2"
            strokeDasharray="5 4"
            vectorEffect="non-scaling-stroke"
          />
          <path d={linePath(points.map((p) => p.current), x, y)} fill="none" stroke={CHART_COLORS[0]} strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
          {points.map((p, i) => (
            <rect key={`${p.label}-${i}`} x={x(i) - step / 2} y={0} width={step} height={height} fill="transparent">
              <title>{`${p.label}: ${format(p.current)}${p.previous === null ? "" : ` · previous period: ${format(p.previous)}`}`}</title>
            </rect>
          ))}
        </svg>
      </div>
      <div className="ml-16 mt-1 flex justify-between text-[11px] text-[#9b9997]">
        <span>{points[0].label}</span>
        {points.length > 2 && <span>{points[Math.floor(points.length / 2)].label}</span>}
        {points.length > 1 && <span>{points[points.length - 1].label}</span>}
      </div>
      <Legend />
    </div>
  );
}
