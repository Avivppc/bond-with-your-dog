import Link from "next/link";
import { communityContext } from "@/lib/community/context";
import { loadMembers } from "@/lib/community/queries";
import { createServiceClient } from "@/lib/supabase/admin";
import { formatOfferPrice, type PricedOffer } from "@/lib/pricing";
import { CommunityNav } from "@/components/community/CommunityNav";
import { Ms } from "@/components/app/ui";

export const dynamic = "force-dynamic";

export const metadata = { title: "Community", robots: { index: false, follow: false } };

/** Offers that include the community, for the "join" screen. */
async function communityOffers() {
  const { data } = await createServiceClient()
    .from("offers")
    .select("slug, title, payment_type, price_cents, currency, interval")
    .eq("includes_community", true)
    .eq("status", "published");
  return (data ?? []) as (PricedOffer & { slug: string; title: string })[];
}

/** Community inside the Member App shell: channel navigation beside the page. */
export default async function CommunityLayout({ children }: { children: React.ReactNode }) {
  const ctx = await communityContext();

  if (!ctx.viewer.canAccess) {
    const offers = await communityOffers();
    return (
      <div className="card state-card" style={{ maxWidth: 620, margin: "0 auto" }}>
        <div className="big-ic" style={{ background: "var(--teal-soft)", color: "var(--teal)" }}>
          <Ms name="groups" />
        </div>
        <span className="eyebrow muted">Community</span>
        <h1 className="h2">Join the Bonded community</h1>
        <p className="faint">Share your progress, ask Roni&apos;s team, join challenges and the live Q&amp;A. The community comes with our courses.</p>
        <div className="row" style={{ justifyContent: "center" }}>
          {offers.map((o) => (
            <Link key={o.slug} href={`/checkout/${o.slug}`} className="btn btn-primary btn-sm">
              {o.title} · {formatOfferPrice(o)}
            </Link>
          ))}
          <Link href="/my-courses" className="btn btn-ghost btn-sm">
            See the courses
          </Link>
        </div>
      </div>
    );
  }

  const [{ total }, reviewRes] = await Promise.all([
    loadMembers(ctx.supabase, "", 1),
    ctx.viewer.isStaff
      ? ctx.supabase.from("community_posts").select("id", { count: "exact", head: true }).or("status.eq.pending,report_count.gt.0").neq("status", "removed")
      : Promise.resolve({ count: 0 }),
  ]);
  const nav = <CommunityNav channels={ctx.channels} isStaff={ctx.viewer.isStaff} reviewCount={reviewRes.count ?? 0} />;

  return (
    <div className="flex gap-6">
      <aside className="hidden w-60 shrink-0 xl:block">
        <div className="sticky top-24 space-y-4">
          <div className="card tight">
            <b>{ctx.settings?.name ?? "Community"}</b>
            <Link href="/community/members" className="link">
              <Ms name="group" size="sm" />
              {total} {total === 1 ? "member" : "members"}
            </Link>
            <Link href="/community/search" className="link">
              <Ms name="search" size="sm" />
              Search the community
            </Link>
          </div>
          {nav}
        </div>
      </aside>
      <div className="min-w-0 flex-1 stack-lg">
        <details className="card tight xl:hidden">
          <summary className="row" style={{ cursor: "pointer", listStyle: "none", justifyContent: "space-between" }}>
            <b>Channels &amp; more</b>
            <Ms name="expand_more" />
          </summary>
          {nav}
        </details>
        {children}
      </div>
    </div>
  );
}
