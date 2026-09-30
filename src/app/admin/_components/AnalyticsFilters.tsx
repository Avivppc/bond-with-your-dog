"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RANGE_PRESETS, type RangeKey } from "@/lib/analytics/range";

interface AnalyticsFiltersProps {
  range: RangeKey;
  from: string;
  to: string;
  currency: string;
  currencies: readonly string[];
}

const PILL = "inline-flex items-center gap-1.5 rounded-full border border-[#d9d8d6] bg-white px-3 py-1.5 text-sm";

/** Date range + currency controls; state lives in the URL so views are shareable. */
export function AnalyticsFilters({ range, from, to, currency, currencies }: AnalyticsFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [custom, setCustom] = useState(range === "custom");

  function go(next: Record<string, string | null>) {
    const q = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === null) q.delete(k);
      else q.set(k, v);
    }
    router.push(`${pathname}?${q.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className={PILL}>
        <span className="material-symbols-outlined text-[18px] text-[#6c6a69]" aria-hidden>
          calendar_month
        </span>
        <span className="sr-only">Date range</span>
        <select
          value={custom ? "custom" : range}
          onChange={(e) => {
            if (e.target.value === "custom") {
              setCustom(true);
              return;
            }
            setCustom(false);
            go({ range: e.target.value, from: null, to: null });
          }}
          className="bg-transparent focus:outline-none"
        >
          {RANGE_PRESETS.map((p) => (
            <option key={p.key} value={p.key}>
              {p.label}
            </option>
          ))}
          <option value="custom">Custom…</option>
        </select>
      </label>

      {custom && (
        <form
          className="flex items-center gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            go({ from: String(data.get("from")), to: String(data.get("to")), range: null });
          }}
        >
          <input type="date" name="from" defaultValue={from} required aria-label="From" className={PILL} />
          <span className="text-sm text-[#6c6a69]">to</span>
          <input type="date" name="to" defaultValue={to} required aria-label="To" className={PILL} />
          <button type="submit" className="rounded-full bg-[#343332] px-3 py-1.5 text-sm font-medium text-white">
            Apply
          </button>
        </form>
      )}

      <span className="text-sm text-[#6c6a69]">compared to</span>
      <span className={`${PILL} text-[#6c6a69]`}>Previous period</span>

      <label className={PILL}>
        <span className="sr-only">Currency</span>
        <select value={currency} onChange={(e) => go({ currency: e.target.value })} className="bg-transparent focus:outline-none">
          {(currencies.length ? currencies : [currency]).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
