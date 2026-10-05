import Link from "next/link";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { readAssistantSettings } from "@/lib/assistant/settings";
import { LocalTime } from "@/components/ui/LocalTime";
import { Card, EmptyState, MUTED, Notice, PageHeader, StatusPill, TABLE, TD, TH, THEAD, TROW } from "../_components/ui";
import { Pagination } from "../_components/list-kit";
import { PAGE_SIZE, PROVIDER_LABEL, loadConversationPage, type ConversationRow } from "./data";
import { SettingsCard } from "./SettingsCard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Assistant" };

const QUESTION_PREVIEW_CHARS = 90;

function preview(text: string | null): string {
  if (!text) return "—";
  return text.length > QUESTION_PREVIEW_CHARS ? `${text.slice(0, QUESTION_PREVIEW_CHARS).trimEnd()}…` : text;
}

function pageNumber(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : 1;
}

function Row({ c }: { c: ConversationRow }) {
  return (
    <tr className={TROW}>
      <td className={`${TD} whitespace-nowrap`}>
        <LocalTime iso={c.last_message_at} format="dateTime" />
      </td>
      <td className={TD}>{c.mode === "member" ? "Lesson" : "Sales page"}</td>
      <td className={TD}>{c.user_email ?? <span className={MUTED}>Visitor</span>}</td>
      <td className={`${TD} max-w-[360px]`}>
        <Link href={`/admin/assistant/${c.id}`} className="font-medium text-[#1a1a19] hover:underline" dir="auto">
          {preview(c.first_question)}
        </Link>
      </td>
      <td className={TD}>{c.message_count}</td>
      <td className={TD}>{c.handed_off ? <StatusPill tone="warning">To Roni</StatusPill> : <span className={MUTED}>—</span>}</td>
      <td className={TD}>{c.last_provider ? (PROVIDER_LABEL[c.last_provider] ?? c.last_provider) : "—"}</td>
    </tr>
  );
}

function ConversationTable({ rows }: { rows: readonly ConversationRow[] }) {
  return (
    <div className="relative overflow-x-auto">
      <table className={TABLE}>
        <thead className={THEAD}>
          <tr>
            <th className={TH}>When</th>
            <th className={TH}>Where</th>
            <th className={TH}>Who</th>
            <th className={TH}>First question</th>
            <th className={TH}>Messages</th>
            <th className={TH}>Handed off</th>
            <th className={TH}>Answered by</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <Row key={c.id} c={c} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** "Ask Bonded": switches, the owner's tone notes, and every conversation. */
export default async function AssistantAdminPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string; page?: string }> }) {
  await requireStaff("content");
  const { saved, error, page: rawPage } = await searchParams;
  const page = pageNumber(rawPage);
  const sb = createServiceClient();
  const [settings, list] = await Promise.all([readAssistantSettings(sb), loadConversationPage(sb, page)]);
  const pages = Math.max(1, Math.ceil(list.total / PAGE_SIZE));

  return (
    <>
      <PageHeader title="Assistant" description="“Ask Bonded” answers members inside lessons and visitors on the sales pages." />
      {saved && <Notice tone="success">Assistant settings saved.</Notice>}
      {typeof error === "string" && <Notice tone="error">{error}</Notice>}
      <div className="flex flex-col gap-6">
        <SettingsCard settings={settings} />
        <Card title="Conversations" description={`${list.total} in total. Questions the assistant hands to Roni also land in the Inbox.`} flush>
          {list.rows.length === 0 ? (
            <div className="px-5 pb-5">
              <EmptyState title="No conversations yet">They show up here as soon as someone asks a question.</EmptyState>
            </div>
          ) : (
            <>
              <ConversationTable rows={list.rows} />
              <div className="flex justify-end px-5 py-4">
                <Pagination page={page} pages={pages} hrefFor={(p) => `/admin/assistant?page=${p}`} />
              </div>
            </>
          )}
        </Card>
      </div>
    </>
  );
}
