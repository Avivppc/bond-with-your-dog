import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { percent } from "@/lib/flows/stats";
import { Card, MUTED, PageHeader, StatusPill, TABLE, TD, TH, THEAD, TROW } from "../_components/ui";
import { StatCard, shortDate } from "../_components/list-kit";

export const dynamic = "force-dynamic";
export const metadata = { title: "Discount codes" };

/** How many recent codes the table shows. */
const LIMIT = 200;

interface CodeRow {
  id: string;
  code: string;
  user_id: string;
  percent: number;
  expires_at: string;
  redeemed_at: string | null;
  created_at: string;
  courses: { title: string } | null;
  email_flows: { name: string } | null;
}

/** Personal codes the email flows issued: who got which, and whether they used it. */
export default async function DiscountCodesPage() {
  await requireStaff("sales");
  const sb = createServiceClient();
  const { data, error } = await sb
    .from("discount_codes")
    .select("id, code, user_id, percent, expires_at, redeemed_at, created_at, courses(title), email_flows(name)")
    .order("created_at", { ascending: false })
    .limit(LIMIT);
  if (error) console.error("[discount codes] load failed", { error: error.message });
  const codes = (data ?? []) as unknown as CodeRow[];
  const emails = new Map(
    await Promise.all([...new Set(codes.map((c) => c.user_id))].map(async (id) => [id, (await sb.auth.admin.getUserById(id)).data.user?.email ?? "—"] as const)),
  );
  const now = new Date();
  const used = codes.filter((c) => c.redeemed_at).length;
  const active = codes.filter((c) => !c.redeemed_at && new Date(c.expires_at) > now).length;

  return (
    <>
      <PageHeader title="Discount codes" description="Personal codes members get from email flows. Each works once, for one member and one chapter, until it expires." />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Issued" value={String(codes.length)} />
        <StatCard label="Active" value={String(active)} />
        <StatCard label="Used" value={String(used)} />
        <StatCard label="Use rate" value={percent(codes.length ? used / codes.length : 0)} />
      </div>
      <Card flush>
        {codes.length === 0 ? (
          <p className={`p-5 text-[14px] ${MUTED}`}>No codes yet. They&apos;re created when a live flow sends its first email, or when a member sees the next-chapter offer in the app.</p>
        ) : (
          <div className="relative overflow-x-auto">
            <table className={TABLE}>
              <thead className={THEAD}>
                <tr>
                  <th className={TH}>Code</th>
                  <th className={TH}>Member</th>
                  <th className={TH}>Chapter</th>
                  <th className={TH}>Discount</th>
                  <th className={TH}>Status</th>
                  <th className={TH}>Expires</th>
                  <th className={TH}>Flow</th>
                </tr>
              </thead>
              <tbody>
                {codes.map((c) => {
                  const expired = !c.redeemed_at && new Date(c.expires_at) <= now;
                  return (
                    <tr key={c.id} className={TROW}>
                      <td className={`${TD} font-mono`}>{c.code}</td>
                      <td className={TD}>{emails.get(c.user_id)}</td>
                      <td className={TD}>{c.courses?.title ?? "—"}</td>
                      <td className={TD}>{c.percent}%</td>
                      <td className={TD}>
                        {c.redeemed_at ? <StatusPill tone="published">Used {shortDate(c.redeemed_at)}</StatusPill> : expired ? <StatusPill tone="draft">Expired</StatusPill> : <StatusPill tone="info">Active</StatusPill>}
                      </td>
                      <td className={TD}>{shortDate(c.expires_at)}</td>
                      <td className={`${TD} ${MUTED}`}>{c.email_flows?.name ?? "In-app offer"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
