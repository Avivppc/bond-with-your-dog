import Link from "next/link";
import { communityContext } from "@/lib/community/context";
import { loadMembers } from "@/lib/community/queries";
import { createServiceClient } from "@/lib/supabase/admin";
import { formatOfferPrice, type PricedOffer } from "@/lib/pricing";
import { CommunityNav } from "@/components/community/CommunityNav";

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

function TopBar({ name }: { name: string }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[#e7e6e4] bg-white/95 px-4 backdrop-blur">
      <Link href="/dashboard" className="inline-flex items-center gap-1 rounded-full border border-[#e7e6e4] px-3 py-1 text-sm font-medium hover:bg-[#f3f3f2]">
        <span className="material-symbols-outlined text-[18px]" aria-hidden>
          chevron_left
        </span>
        Bonded
      </Link>
      <span className="text-sm font-semibold">{name}</span>
      <Link href="/community/search" className="flex rounded-full p-2 hover:bg-[#f3f3f2]" aria-label="Search the community">
        <span className="material-symbols-outlined text-[20px]" aria-hidden>
          search
        </span>
      </Link>
    </header>
  );
}

export default async function CommunityLayout({ children }: { children: React.ReactNode }) {
  const ctx = await communityContext();

  if (!ctx.viewer.canAccess) {
    const offers = await communityOffers();
    return (
      <div className="min-h-screen bg-[#f7f7f8] text-[#1a1a19]">
        <TopBar name="Community" />
        <main className="mx-auto max-w-lg px-4 py-16 text-center">
          <span className="material-symbols-outlined text-5xl text-[#0e666a]" aria-hidden>
            forum
          </span>
          <h1 className="mt-3 text-2xl font-bold">Join the Bonded community</h1>
          <p className="mt-2 text-sm text-[#6c6a69]">
            Share your progress, ask the coaches, join challenges and meetups with other dog lovers. The community is included with our courses.
          </p>
          <div className="mt-6 flex flex-col items-center gap-2">
            {offers.map((o) => (
              <Link key={o.slug} href={`/checkout/${o.slug}`} className="rounded-full bg-[#0e666a] px-5 py-2.5 text-sm font-semibold text-white">
                {o.title} — {formatOfferPrice(o)}
              </Link>
            ))}
            <Link href="/courses" className="text-sm font-semibold text-[#0e666a] hover:underline">
              Browse courses
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const [{ total }, reviewRes] = await Promise.all([
    loadMembers(ctx.supabase, "", 1),
    ctx.viewer.isStaff
      ? ctx.supabase.from("community_posts").select("id", { count: "exact", head: true }).or("status.eq.pending,report_count.gt.0").neq("status", "removed")
      : Promise.resolve({ count: 0 }),
  ]);
  const settings = ctx.settings;

  return (
    <div className="min-h-screen bg-[#f7f7f8] text-[#1a1a19]">
      <TopBar name={settings?.name ?? "Community"} />
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-20 space-y-5">
            <div className="overflow-hidden rounded-[14px] border border-[#e7e6e4] bg-white">
              {settings?.cover_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element -- community cover set by the team
                <img src={settings.cover_image_url} alt="" className="h-24 w-full object-cover" />
              ) : (
                <div className="h-16 bg-gradient-to-r from-[#0e666a] to-[#3fae8a]" aria-hidden />
              )}
              <div className="p-4">
                <p className="font-bold">{settings?.name ?? "Community"}</p>
                {settings?.description && <p className="mt-1 text-xs text-[#6c6a69]">{settings.description}</p>}
                <Link href="/community/members" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#0e666a] hover:underline">
                  <span className="material-symbols-outlined text-[16px]" aria-hidden>
                    group
                  </span>
                  {total} {total === 1 ? "member" : "members"}
                </Link>
              </div>
            </div>
            <CommunityNav channels={ctx.channels} isStaff={ctx.viewer.isStaff} reviewCount={reviewRes.count ?? 0} />
          </div>
        </aside>
        <main className="min-w-0 flex-1">
          <details className="mb-4 rounded-[14px] border border-[#e7e6e4] bg-white lg:hidden">
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold">☰ Menu</summary>
            <div className="border-t border-[#e7e6e4] p-3">
              <CommunityNav channels={ctx.channels} isStaff={ctx.viewer.isStaff} reviewCount={reviewRes.count ?? 0} />
            </div>
          </details>
          {children}
        </main>
      </div>
    </div>
  );
}
