import Link from "next/link";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { SYSTEM_PAGES } from "@/lib/site/system-pages";
import { BTN_PRIMARY, BTN_SECONDARY, Card, INPUT, Notice, PageHeader, StatusPill, TABLE, TD, TH, THEAD, TROW, type PillTone } from "../_components/ui";
import { shortDate } from "../_components/list-kit";
import { ConfirmSubmit } from "../_components/ConfirmSubmit";
import { createSitePage, deleteSitePage, openSystemPage } from "@/app/site-editor/actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Website" };

interface Row {
  id: string;
  slug: string;
  title: string;
  system_key: string | null;
  status: "draft" | "published" | "hidden";
  has_changes: boolean;
  updated_at: string;
}

function statusOf(row: Row | undefined): { tone: PillTone; label: string } {
  if (!row) return { tone: "published", label: "Live" };
  if (row.status === "draft") return { tone: "draft", label: "Draft" };
  if (row.status === "hidden") return { tone: "warning", label: "Off the site" };
  return row.has_changes ? { tone: "info", label: "Live · unpublished changes" } : { tone: "published", label: "Live" };
}

/** Website: the built-in pages, pages made here, and the theme. */
export default async function WebsitePage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireStaff("content");
  const { ok, error } = await searchParams;
  const { data, error: loadError } = await createServiceClient().from("site_pages").select("id, slug, title, system_key, status, has_changes, updated_at").order("created_at");
  if (loadError) console.error("[website] pages failed", loadError.message);
  const rows = (data ?? []) as Row[];
  const bySystem = new Map(rows.filter((r) => r.system_key).map((r) => [r.system_key as string, r]));
  const custom = rows.filter((r) => !r.system_key);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Website"
        description="Edit your pages like in Shopify: sections, text, photos and buttons, with a live preview. Nothing changes on the site until you publish."
        actions={
          <Link href="/site-editor/theme" className={BTN_SECONDARY}>
            <span className="material-symbols-outlined text-[18px]" aria-hidden>
              palette
            </span>
            Theme, header and footer
          </Link>
        }
      />
      {ok && <Notice tone="success">{ok}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}

      <Card flush title="Pages">
        <div className="relative overflow-x-auto">
          <table className={TABLE}>
            <thead className={THEAD}>
              <tr>
                <th className={TH}>Page</th>
                <th className={`${TH} max-md:hidden`}>Address</th>
                <th className={TH}>Status</th>
                <th className={`${TH} max-md:hidden`}>Last edited</th>
                <th className={TH}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {SYSTEM_PAGES.map((p) => {
                const row = bySystem.get(p.key);
                const st = statusOf(row);
                return (
                  <tr key={p.key} className={TROW}>
                    <td className={`${TD} font-medium`}>
                      {row?.title ?? p.title}
                      <span className="block text-[12px] font-normal text-[#6c6a69] md:hidden">/{p.slug}</span>
                    </td>
                    <td className={`${TD} text-[#6c6a69] max-md:hidden`}>/{p.slug}</td>
                    <td className={TD}>
                      <StatusPill tone={st.tone}>{st.label}</StatusPill>
                    </td>
                    <td className={`${TD} whitespace-nowrap text-[#6c6a69] max-md:hidden`}>{row ? shortDate(row.updated_at) : "Never"}</td>
                    <td className={`${TD} text-right`}>
                      <form action={openSystemPage}>
                        <input type="hidden" name="key" value={p.key} />
                        <button type="submit" className="text-[14px] font-medium hover:underline">
                          Edit
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
              {custom.map((row) => {
                const st = statusOf(row);
                return (
                  <tr key={row.id} className={TROW}>
                    <td className={`${TD} font-medium`}>
                      {row.title}
                      <span className="block text-[12px] font-normal text-[#6c6a69] md:hidden">/{row.slug}</span>
                    </td>
                    <td className={`${TD} text-[#6c6a69] max-md:hidden`}>/{row.slug}</td>
                    <td className={TD}>
                      <StatusPill tone={st.tone}>{st.label}</StatusPill>
                    </td>
                    <td className={`${TD} whitespace-nowrap text-[#6c6a69] max-md:hidden`}>{shortDate(row.updated_at)}</td>
                    <td className={`${TD} text-right`}>
                      <div className="flex items-center justify-end gap-3">
                        <Link href={`/site-editor/${row.id}`} className="text-[14px] font-medium hover:underline">
                          Edit
                        </Link>
                        <form action={deleteSitePage}>
                          <input type="hidden" name="id" value={row.id} />
                          <ConfirmSubmit className="text-[14px] font-medium text-[#a4262c] hover:underline" message={`Delete "${row.title}"? Its address stops working and its versions are deleted.`}>
                            Delete
                          </ConfirmSubmit>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="New page" description="A landing page for a workshop, a seminar or a special offer, built from the same sections.">
        <form action={createSitePage} className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-56 flex-1 flex-col gap-1.5">
            <span className="text-[14px] font-medium">Page name</span>
            <input name="title" required maxLength={120} className={INPUT} placeholder="Summer workshop 2027" />
          </label>
          <label className="flex min-w-56 flex-1 flex-col gap-1.5">
            <span className="text-[14px] font-medium">Address (optional)</span>
            <input name="slug" maxLength={60} pattern="[a-z0-9]+(-[a-z0-9]+)*" className={INPUT} placeholder="summer-workshop" />
          </label>
          <button type="submit" className={BTN_PRIMARY}>
            Create page
          </button>
        </form>
      </Card>
    </div>
  );
}
