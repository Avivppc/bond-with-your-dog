import { createServiceClient } from "@/lib/supabase/admin";
import { requireMember } from "@/lib/member/viewer";
import { formatCents } from "@/lib/sales/pricing";
import { affiliateForMember, affiliateLink, loadAffiliateStats } from "@/lib/affiliates/server";
import { CopyButton } from "@/components/app/CopyButton";
import { StateCard, Tip } from "@/components/app/ui";
import { LocalTime } from "@/components/ui/LocalTime";

export const dynamic = "force-dynamic";
export const metadata = { title: "Affiliate" };

const RECENT = 20;

/** An affiliate's own page: their link, visits, sales and earnings (not visible to anyone else). */
export default async function AffiliatePage() {
  const viewer = await requireMember("/affiliate");
  const affiliate = await affiliateForMember({ id: viewer.userId, email: viewer.email ?? undefined });
  if (!affiliate) {
    return (
      <StateCard icon="handshake" eyebrow="Affiliates" title="This page is for Bonded affiliates">
        Want to share Bonded and earn a commission? Write to us from Help and tell us a little about you.
      </StateCard>
    );
  }

  const [stats, { data: recent, error }] = await Promise.all([
    loadAffiliateStats(affiliate.id),
    createServiceClient()
      .from("affiliate_commissions")
      .select("id, amount_cents, currency, status, created_at")
      .eq("affiliate_id", affiliate.id)
      .order("created_at", { ascending: false })
      .limit(RECENT),
  ]);
  if (error) console.error("[affiliate] recent failed", { affiliateId: affiliate.id, error: error.message });
  const link = affiliateLink(affiliate.code);
  const conversion = stats.visits > 0 ? Math.round((stats.sales / stats.visits) * 1000) / 10 : null;

  return (
    <>
      <div className="card" style={{ background: "var(--teal)", color: "#eafcfd", gap: 18 }}>
        <span className="eyebrow" style={{ color: "#bff3f5" }}>
          Bonded affiliate
        </span>
        <h1 className="display" style={{ color: "#fff" }}>
          You earn {affiliate.commission_percent}% of every purchase
        </h1>
        <p className="lede" style={{ color: "#d6f4f5" }}>
          Share your link. Anyone who buys within 30 days of opening it earns you {affiliate.commission_percent}% of what they pay.
        </p>
        <div className="row">
          <input className="input" readOnly value={link} aria-label="Your affiliate link" style={{ flex: 1, minWidth: 220, background: "#fff", color: "var(--ink)" }} />
          <CopyButton value={link} label="Copy link" className="btn btn-primary btn-sm" />
        </div>
      </div>

      {!affiliate.active && <Tip icon="pause_circle">Your link is paused right now, so new purchases don&apos;t earn a commission. Ask us from Help if that&apos;s a surprise.</Tip>}

      <div className="stat-row">
        {[
          { label: "Link visits", value: String(stats.visits) },
          { label: conversion !== null ? `Sales (${conversion}% of visits)` : "Sales", value: String(stats.sales) },
          { label: "Earned, to be paid", value: formatCents(stats.pendingCents, "USD") },
          { label: "Paid to you", value: formatCents(stats.paidCents, "USD") },
        ].map((s) => (
          <div key={s.label} className="card tight">
            <div className="stat">
              <b>{s.value}</b>
              <span>{s.label}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h2 className="h3">Recent sales</h2>
        {(recent ?? []).length === 0 ? (
          <p className="muted">No sales yet. Share your link where dog people hang out.</p>
        ) : (
          <div className="stack" style={{ gap: 0 }}>
            {(recent ?? []).map((c) => (
              <div key={c.id} className="list-row">
                <div className="grow">
                  <div className="title">{formatCents(c.amount_cents as number, c.currency as string)}</div>
                  <div className="faint">
                    <LocalTime iso={c.created_at as string} format="longDate" />
                  </div>
                </div>
                <span className="faint">{c.status === "paid" ? "Paid" : c.status === "void" ? "Refunded" : "To be paid"}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
