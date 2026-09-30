"use client";

import { useRouter } from "next/navigation";

interface Props {
  segments: readonly { key: string; label: string }[];
  segment: string;
  query: string;
}

function hrefFor(segment: string, query: string): string {
  const params = new URLSearchParams();
  if (segment !== "all") params.set("segment", segment);
  if (query) params.set("q", query);
  const qs = params.toString();
  return qs ? `/admin/people?${qs}` : "/admin/people";
}

/** Segment select + "Search contacts", both reflected in the URL (page resets to 1). */
export function ContactsToolbar({ segments, segment, query }: Props) {
  const router = useRouter();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="inline-flex items-center gap-1.5 rounded-full border border-[#d9d8d6] bg-white px-3 py-1.5 text-[14px]">
        <span className="sr-only">Segment</span>
        <select value={segment} onChange={(e) => router.push(hrefFor(e.target.value, query))} className="bg-transparent font-medium focus:outline-none">
          {segments.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <form
        role="search"
        className="min-w-56 flex-1 sm:max-w-sm"
        onSubmit={(e) => {
          e.preventDefault();
          router.push(hrefFor(segment, String(new FormData(e.currentTarget).get("q") ?? "").trim()));
        }}
      >
        <label className="relative block">
          <span className="sr-only">Search contacts</span>
          <span className="material-symbols-outlined pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[18px] text-[#9b9997]" aria-hidden>
            search
          </span>
          <input
            name="q"
            type="search"
            defaultValue={query}
            placeholder="Search contacts"
            className="w-full rounded-full border border-[#d9d8d6] bg-white py-1.5 pl-9 pr-3 text-[14px] placeholder:text-[#9b9997] focus:border-[#343332] focus:outline-none"
          />
        </label>
      </form>
    </div>
  );
}
