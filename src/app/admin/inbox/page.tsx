import Link from "next/link";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { pageWindow, parsePage } from "@/lib/admin-helpers/pagination";
import { INBOX_STATUSES, INBOX_TABS, inboxHref, parseInboxStatus, parseInboxTab, type InboxStatus, type InboxTab } from "@/lib/admin-helpers/inbox";
import { BTN_SECONDARY, EmptyState, Notice, PageHeader } from "../_components/ui";
import { Pagination } from "../_components/list-kit";
import { InboxItem, type SupportRequestRow } from "./InboxItem";

export const dynamic = "force-dynamic";

const PER_PAGE = 20;

async function loadCounts(): Promise<Map<string, number>> {
  const { data, error } = await createServiceClient().rpc("admin_support_counts");
  if (error) console.error("[inbox] counts failed", error.message);
  return new Map(((data ?? []) as { kind: string; status: string; requests: number }[]).map((r) => [`${r.kind}:${r.status}`, Number(r.requests)]));
}

async function loadRequests(tab: InboxTab, status: InboxStatus, offset: number) {
  const { data, error } = await createServiceClient().rpc("admin_list_support_requests", {
    p_kind: tab,
    p_status: status === "all" ? null : status,
    p_limit: PER_PAGE,
    p_offset: offset,
  });
  if (error) console.error("[inbox] list failed", { tab, status, error: error.message });
  const rows = (data ?? []) as (SupportRequestRow & { total_count: number })[];
  return { rows, total: Number(rows[0]?.total_count ?? 0), failed: Boolean(error) };
}

/** Past the last page (e.g. after closing the last item on it): show the last real page. */
async function loadRequestsClamped(tab: InboxTab, status: InboxStatus, requested: number) {
  const page = await loadRequests(tab, status, (requested - 1) * PER_PAGE);
  if (page.rows.length > 0 || requested === 1 || page.failed) return page;
  const firstPage = await loadRequests(tab, status, 0);
  const win = pageWindow(firstPage.total, requested, PER_PAGE);
  return win.page === 1 ? firstPage : loadRequests(tab, status, win.offset);
}

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; status?: string; page?: string; ok?: string; error?: string }>;
}) {
  await requireStaff("sales");
  const params = await searchParams;
  const tab = parseInboxTab(params.tab);
  const status = parseInboxStatus(params.status);
  const requested = parsePage(params.page);
  const [counts, list] = await Promise.all([loadCounts(), loadRequestsClamped(tab, status, requested)]);
  const win = pageWindow(list.total, requested, PER_PAGE);
  const view = { tab, status, page: win.page };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Inbox"
        description="Questions, problem reports and stories members send from the app. Answers reach them in the app (and by email when it's set up)."
        actions={
          <Link href="/studio" className={BTN_SECONDARY}>
            Feedback studio
          </Link>
        }
      />
      {typeof params.ok === "string" && <Notice tone="success">{params.ok}</Notice>}
      {typeof params.error === "string" && <Notice tone="error">{params.error}</Notice>}

      <nav className="flex gap-5 border-b border-[#e7e6e4] text-[14px]" aria-label="Inbox sections">
        {INBOX_TABS.map((t) => {
          const open = counts.get(`${t.key}:open`) ?? 0;
          const active = t.key === tab;
          return (
            <Link
              key={t.key}
              href={inboxHref({ tab: t.key, status })}
              aria-current={active ? "page" : undefined}
              className={`-mb-px flex items-center gap-1.5 border-b-2 pb-2 font-medium ${active ? "border-[#1a1a19] text-[#1a1a19]" : "border-transparent text-[#6c6a69] hover:text-[#1a1a19]"}`}
            >
              {t.label}
              {open > 0 && <span className="rounded-full bg-[#d93f3f] px-1.5 text-[11px] font-semibold leading-[18px] text-white">{open}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Status">
          {INBOX_STATUSES.map((s) => (
            <Link
              key={s.key}
              href={inboxHref({ tab, status: s.key })}
              aria-current={s.key === status ? "true" : undefined}
              className={`rounded-full border px-3 py-1 text-[14px] ${s.key === status ? "border-[#343332] bg-[#343332] text-white" : "border-[#d9d8d6] bg-white hover:bg-[#f3f3f2]"}`}
            >
              {s.label}
              {s.key !== "all" && <span className="ml-1 opacity-70">{counts.get(`${tab}:${s.key}`) ?? 0}</span>}
            </Link>
          ))}
        </div>
        <Pagination page={win.page} pages={win.pages} hrefFor={(page) => inboxHref({ tab, status, page })} />
      </div>

      {list.failed ? (
        <div className="rounded-[12px] border border-[#e7e6e4] bg-white">
          <EmptyState title="The inbox couldn't be loaded.">Please refresh the page.</EmptyState>
        </div>
      ) : list.rows.length === 0 ? (
        <div className="rounded-[12px] border border-[#e7e6e4] bg-white">
          <EmptyState title="Nothing here.">{status === "open" ? "You're all caught up." : "No items with this status."}</EmptyState>
        </div>
      ) : (
        <ul className="space-y-3">
          {list.rows.map((item) => (
            <InboxItem key={item.id} item={item} view={view} />
          ))}
        </ul>
      )}
    </div>
  );
}
