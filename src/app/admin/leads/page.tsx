import Link from "next/link";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { pageWindow, parsePage } from "@/lib/admin-helpers/pagination";
import { ilikePattern, parseSearch } from "@/lib/admin-helpers/search";
import { leadTierLabel } from "@/lib/admin-helpers/display";
import { BTN_SECONDARY, Card, EmptyState, INPUT, PageHeader, TABLE, TD, TH, THEAD, TROW, Tabs } from "../_components/ui";
import { Pagination, shortDate } from "../_components/list-kit";
import { EmailOnlyContacts } from "./EmailOnlyContacts";

export const metadata = { title: "Leads" };

export const dynamic = "force-dynamic";

const PER_PAGE = 50;
const RANGE_NOT_SATISFIABLE = "PGRST103";

interface LeadRow {
  id: string;
  first_name: string;
  email: string;
  tier: string;
  created_at: string;
}

interface LeadsPage {
  rows: LeadRow[];
  total: number;
  failed: boolean;
}

async function loadLeads(search: string, page: number): Promise<LeadsPage> {
  const offset = (page - 1) * PER_PAGE;
  let query = createServiceClient()
    .from("quiz_leads")
    .select("id, first_name, email, tier, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + PER_PAGE - 1);
  const pattern = ilikePattern(search);
  if (pattern) query = query.or(`email.ilike.${pattern},first_name.ilike.${pattern}`);
  const { data, count, error } = await query;
  // Past the end PostgREST answers 416; page 1 then tells the caller the real total.
  if (error?.code === RANGE_NOT_SATISFIABLE && page > 1) return loadLeads(search, 1);
  if (error) {
    console.error("[leads] list failed", { search, page, error: error.message });
    return { rows: [], total: 0, failed: true };
  }
  return { rows: (data ?? []) as LeadRow[], total: count ?? 0, failed: false };
}

const TABS = [
  { key: "quiz", label: "Quiz leads", href: "/admin/leads" },
  { key: "imported", label: "Email-only contacts", href: "/admin/leads?tab=imported" },
] as const;

function SearchBox({ q, imported }: { q: string; imported: boolean }) {
  return (
    <form className="-mt-1 px-5 pt-4" role="search">
      {imported && <input type="hidden" name="tab" value="imported" />}
      <label className="relative block max-w-sm">
        <span className="sr-only">Search</span>
        <span className="material-symbols-outlined pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[18px] text-[#9b9997]" aria-hidden>
          search
        </span>
        <input name="q" type="search" defaultValue={q} placeholder="Search by name or email" className={`${INPUT} pl-9`} />
      </label>
    </form>
  );
}

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string; tab?: string }> }) {
  await requireStaff("sales");
  const params = await searchParams;
  const q = parseSearch(params.q);
  const requested = parsePage(params.page);
  if (params.tab === "imported") {
    return (
      <div className="space-y-5">
        <PageHeader title="Leads" description="People without an account: quiz takers and imported contacts. Campaigns reach them by their consent." />
        <Tabs items={TABS} active="imported" />
        <Card flush>
          <SearchBox q={q} imported />
          <EmailOnlyContacts q={q} page={requested} />
        </Card>
      </div>
    );
  }
  const first = await loadLeads(q, requested);
  // Past the last page (e.g. after a search narrowed the list): show the last real page.
  const win = pageWindow(first.total, requested, PER_PAGE);
  const result = win.page === requested || first.failed ? first : await loadLeads(q, win.page);
  const hrefFor = (page: number) => `/admin/leads?${new URLSearchParams({ ...(q ? { q } : {}), page: String(page) }).toString()}`;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Leads"
        description="People without an account: quiz takers and imported contacts. Campaigns reach them by their consent."
        actions={
          <Link href="/admin/leads/export" className={BTN_SECONDARY} prefetch={false}>
            <span className="material-symbols-outlined text-[18px]" aria-hidden>
              download
            </span>
            Download CSV
          </Link>
        }
      />
      <Tabs items={TABS} active="quiz" />
      <Card flush>
        <SearchBox q={q} imported={false} />
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-[14px] text-[#6c6a69]">
          <span>
            Displaying {win.first}–{win.last} of <b className="text-[#1a1a19]">{result.total.toLocaleString("en-US")}</b> leads
          </span>
          <Pagination page={win.page} pages={win.pages} hrefFor={hrefFor} />
        </div>
        {result.failed ? (
          <EmptyState title="Leads couldn't be loaded.">Please refresh the page.</EmptyState>
        ) : result.rows.length === 0 ? (
          <EmptyState title={q ? "No leads match your search." : "No leads yet."}>{!q && "Leads appear here when someone finishes the quiz."}</EmptyState>
        ) : (
          <div className="relative overflow-x-auto">
            <table className={TABLE}>
              <thead className={THEAD}>
                <tr>
                  <th className={TH}>Name</th>
                  <th className={TH}>Email</th>
                  <th className={TH}>Quiz result</th>
                  <th className={TH}>Date</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((l) => (
                  <tr key={l.id} className={TROW}>
                    <td className={`${TD} font-medium`}>{l.first_name}</td>
                    <td className={`${TD} text-[#3d3c3a]`}>{l.email}</td>
                    <td className={TD}>
                      <span className="whitespace-nowrap rounded-full bg-[#f0efee] px-2.5 py-0.5 text-[12px] font-medium text-[#4b4a48]">{leadTierLabel(l.tier)}</span>
                    </td>
                    <td className={`${TD} whitespace-nowrap text-[#6c6a69]`}>{shortDate(l.created_at)}</td>
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
