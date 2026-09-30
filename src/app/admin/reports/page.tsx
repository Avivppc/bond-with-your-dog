import Link from "next/link";
import { requireStaff } from "@/lib/admin";
import { REPORTS } from "@/lib/analytics/reports";
import { Card, EmptyState, INPUT, PageHeader } from "@/app/admin/_components/ui";

export const dynamic = "force-dynamic";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireStaff("sales");
  const { q } = await searchParams;
  const needle = q?.trim().toLowerCase() ?? "";
  const reports = needle
    ? REPORTS.filter((r) => `${r.name} ${r.category} ${r.description}`.toLowerCase().includes(needle))
    : REPORTS;

  return (
    <div>
      <PageHeader title="Reports" crumbs={[{ label: "Analytics", href: "/admin/analytics" }, { label: "Reports" }]} />
      <Card flush>
        <form className="-mt-1 px-5 pb-1 pt-4">
          <label className="relative block">
            <span className="sr-only">Search for a report</span>
            <span className="material-symbols-outlined pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[18px] text-[#9b9997]" aria-hidden>
              search
            </span>
            <input name="q" defaultValue={q ?? ""} placeholder="Search for a report" className={`${INPUT} pl-9`} />
          </label>
        </form>
        {reports.length === 0 ? (
          <EmptyState title="No reports match your search." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-y border-[#efeeed] text-left text-[#6c6a69]">
                <tr>
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-3 py-3 font-medium">Category</th>
                  <th className="px-5 py-3 font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#efeeed]">
                {reports.map((r) => (
                  <tr key={r.slug} className="hover:bg-[#fafaf9]">
                    <td className="whitespace-nowrap px-5 py-3">
                      <Link href={`/admin/reports/${r.slug}`} className="font-medium hover:underline">
                        {r.name}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-[#6c6a69]">{r.category}</td>
                    <td className="px-5 py-3 text-[#6c6a69]">{r.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
