"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** The design's pill tabs, backed by a query parameter so the view is linkable and server-rendered. */
export function QueryTabs({ param, tabs, current, label }: { param: string; tabs: { value: string; label: string }[]; current: string; label: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  function select(value: string) {
    const next = new URLSearchParams(search.toString());
    if (value === tabs[0]?.value) next.delete(param);
    else next.set(param, value);
    for (const transient of ["sent", "id"]) next.delete(transient);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <div className="tabs" role="group" aria-label={label}>
      {tabs.map((t) => (
        <button key={t.value} type="button" className={t.value === current ? "on" : undefined} aria-pressed={t.value === current} onClick={() => select(t.value)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}
