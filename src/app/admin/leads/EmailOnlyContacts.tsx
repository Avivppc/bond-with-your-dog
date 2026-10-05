import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/admin";
import { pageWindow } from "@/lib/admin-helpers/pagination";
import { EmptyState, TABLE, TD, TH, THEAD, TROW } from "../_components/ui";
import { Pagination, shortDate } from "../_components/list-kit";

const PER_PAGE = 50;

interface EmailContact {
  id: string;
  email: string;
  full_name: string | null;
  marketing_opt_in: boolean;
  created_at: string;
  tags: string[];
  total: number;
}

async function loadEmailContacts(search: string, page: number): Promise<{ rows: EmailContact[]; total: number; failed: boolean }> {
  const { data, error } = await createServiceClient().rpc("admin_list_email_contacts", { p_search: search, p_limit: PER_PAGE, p_offset: (page - 1) * PER_PAGE });
  if (error) {
    console.error("[leads] email-only contacts failed", { search, page, error: error.message });
    return { rows: [], total: 0, failed: true };
  }
  const rows = (data ?? []) as EmailContact[];
  return { rows, total: Number(rows[0]?.total ?? 0), failed: false };
}

/** Leads → Email-only: imported people who don't have an account (yet). */
export async function EmailOnlyContacts({ q, page }: { q: string; page: number }) {
  const first = await loadEmailContacts(q, page);
  // An empty page past the end: the count comes with the rows, so ask for page 1 to learn it.
  const result = first.rows.length === 0 && page > 1 && !first.failed ? await loadEmailContacts(q, 1) : first;
  const win = pageWindow(result.total, result === first ? page : 1, PER_PAGE);
  const hrefFor = (p: number) => `/admin/leads?${new URLSearchParams({ tab: "imported", ...(q ? { q } : {}), page: String(p) }).toString()}`;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-[14px] text-[#6c6a69]">
        <span>
          Displaying {win.first}–{win.last} of <b className="text-[#1a1a19]">{result.total.toLocaleString("en-US")}</b> email-only contacts
        </span>
        <Pagination page={win.page} pages={win.pages} hrefFor={hrefFor} />
      </div>
      {result.failed ? (
        <EmptyState title="Contacts couldn't be loaded.">Please refresh the page.</EmptyState>
      ) : result.rows.length === 0 ? (
        <EmptyState title={q ? "No contacts match your search." : "No email-only contacts yet."}>{!q && (
            <>
              Import a CSV from{" "}
              <Link href="/admin/people/import" className="font-medium text-[#1a1a19] underline">
                Contacts → Import
              </Link>
              .
            </>
          )}</EmptyState>
      ) : (
        <div className="relative overflow-x-auto">
          <table className={TABLE}>
            <thead className={THEAD}>
              <tr>
                <th className={TH}>Name</th>
                <th className={TH}>Email</th>
                <th className={TH}>Email marketing</th>
                <th className={TH}>Tags</th>
                <th className={TH}>Added</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((c) => (
                <tr key={c.id} className={TROW}>
                  <td className={`${TD} font-medium`}>{c.full_name ?? "—"}</td>
                  <td className={`${TD} text-[#3d3c3a]`}>{c.email}</td>
                  <td className={TD}>
                    {c.marketing_opt_in ? (
                      <span className="rounded-full bg-[#e3f5e8] px-2.5 py-0.5 text-[12px] font-medium text-[#1c6b35]">Subscribed</span>
                    ) : (
                      <span className="text-[#9b9997]">Not subscribed</span>
                    )}
                  </td>
                  <td className={`${TD} text-[#6c6a69]`}>{c.tags.join(", ") || "—"}</td>
                  <td className={`${TD} whitespace-nowrap text-[#6c6a69]`}>{shortDate(c.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
