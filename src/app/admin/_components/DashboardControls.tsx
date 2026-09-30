"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DASHBOARD_METRICS, DASHBOARD_RANGES, type DashboardMetric, type DashboardRange } from "@/lib/admin-helpers/dashboard-metrics";

const PILL = "inline-flex items-center gap-1.5 rounded-full border border-[#d9d8d6] bg-white px-3 py-1.5 text-[14px] hover:bg-[#f8f8f8]";

interface Props {
  range: DashboardRange;
  currency: string;
  currencies: readonly string[];
  metric: DashboardMetric;
}

/** Date range, currency and metric pills; state lives in the URL so the view can be shared. */
export function DashboardControls({ range, currency, currencies, metric }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function go(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    next.set(key, value);
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className={PILL}>
        <span className="material-symbols-outlined text-[18px] text-[#6c6a69]" aria-hidden>
          calendar_month
        </span>
        <span className="sr-only">Date range</span>
        <select value={range} onChange={(e) => go("range", e.target.value)} className="bg-transparent focus:outline-none">
          {DASHBOARD_RANGES.map((r) => (
            <option key={r.key} value={r.key}>
              {r.label}
            </option>
          ))}
        </select>
      </label>
      <label className={PILL}>
        <span className="sr-only">Currency</span>
        <select value={currency} onChange={(e) => go("currency", e.target.value)} className="bg-transparent focus:outline-none">
          {(currencies.length ? currencies : [currency]).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <label className={`${PILL} ml-auto font-medium`}>
        <span className="sr-only">Metric</span>
        <select value={metric} onChange={(e) => go("metric", e.target.value)} className="bg-transparent font-medium focus:outline-none">
          {DASHBOARD_METRICS.map((m) => (
            <option key={m.key} value={m.key}>
              {m.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
