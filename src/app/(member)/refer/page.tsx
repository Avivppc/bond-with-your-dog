import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/email";
import { loadReferralSettings } from "@/lib/referrals-server";
import MemberShell from "@/components/member/MemberShell";
import { CopyLink } from "./CopyLink";

export const dynamic = "force-dynamic";

const TEAL = "#0e666a";

interface Summary {
  code: string | null;
  friends_joined: number;
  friends_converted: number;
  rewards_available: number;
  rewards_used: number;
  best_reward_percent: number | null;
}

/** "Refer a friend": the student's link, how it works, and how their referrals are doing. */
export default async function ReferPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/refer");

  const settings = await loadReferralSettings();
  if (!settings.enabled) {
    return (
      <MemberShell>
        <div className="mx-auto max-w-3xl p-6 md:p-10">
          <div className="rounded-[20px] bg-white p-10 text-center shadow-sm">
            <h1 className="text-2xl font-extrabold" style={{ fontFamily: "var(--font-headline)" }}>
              Refer a friend
            </h1>
            <p className="mt-2 text-sm text-slate-600">The referral program isn&apos;t open right now. Check back soon!</p>
          </div>
        </div>
      </MemberShell>
    );
  }

  const { error: codeError } = await supabase.rpc("get_or_create_referral_code");
  if (codeError) console.error("[refer] code failed", codeError.message);
  const { data } = await supabase.rpc("my_referral_summary");
  const summary = ((data ?? [])[0] ?? null) as Summary | null;
  const link = summary?.code ? `${siteUrl()}/r/${summary.code}` : null;

  const stats = [
    { label: "Friends joined", value: summary?.friends_joined ?? 0 },
    { label: "Friends who bought", value: summary?.friends_converted ?? 0 },
    { label: "Rewards ready to use", value: summary?.rewards_available ?? 0 },
  ];

  return (
    <MemberShell>
      <div className="mx-auto max-w-4xl space-y-6 p-6 md:p-10">
        <section className="relative overflow-hidden rounded-[20px] p-8 text-white shadow-sm sm:p-10" style={{ backgroundColor: TEAL }}>
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10" aria-hidden />
          <p className="text-[11px] font-bold uppercase tracking-widest text-white/75">Friend brings friend</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl" style={{ fontFamily: "var(--font-headline)" }}>
            Give {settings.friendDiscountPercent}%, get {settings.rewardPercent}%
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-white/85 sm:text-base">
            {settings.description ||
              `Share your link. Your friend gets ${settings.friendDiscountPercent}% off their first purchase, and when they buy you get ${settings.rewardPercent}% off your next one.`}
          </p>
          <div className="mt-6">{link ? <CopyLink url={link} /> : <p className="text-sm">We couldn&apos;t create your link — please refresh.</p>}</div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-[16px] bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{s.label}</p>
              <p className="mt-1 text-3xl font-extrabold" style={{ fontFamily: "var(--font-headline)", color: "#243036" }}>
                {s.value}
              </p>
            </div>
          ))}
        </section>

        {(summary?.rewards_available ?? 0) > 0 && (
          <p className="rounded-[16px] bg-[#e3f5f5] p-5 text-sm font-semibold" style={{ color: TEAL }}>
            🎉 You have {summary?.rewards_available} reward{summary?.rewards_available === 1 ? "" : "s"} — {summary?.best_reward_percent}% off is applied automatically at
            your next checkout.
          </p>
        )}

        <section className="rounded-[16px] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-extrabold" style={{ fontFamily: "var(--font-headline)", color: "#243036" }}>
            How it works
          </h2>
          <ol className="mt-4 grid gap-4 sm:grid-cols-3">
            {[
              { icon: "link", title: "Share your link", body: "Send it to a friend who'd love training with their dog." },
              { icon: "sell", title: "They save", body: `${settings.friendDiscountPercent}% off their first purchase, within ${settings.attributionDays} days.` },
              { icon: "card_giftcard", title: "You get rewarded", body: `${settings.rewardPercent}% off your next purchase for every friend who buys.` },
            ].map((step, i) => (
              <li key={step.title} className="rounded-[12px] bg-[#f3f9fd] p-5">
                <span className="material-symbols-outlined" style={{ color: TEAL }} aria-hidden>
                  {step.icon}
                </span>
                <p className="mt-2 font-bold" style={{ color: "#243036" }}>
                  {i + 1}. {step.title}
                </p>
                <p className="text-sm text-slate-600">{step.body}</p>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-xs text-slate-500">Rewards are for new customers only and are removed if a friend&apos;s purchase is refunded. One discount per purchase.</p>
        </section>
      </div>
    </MemberShell>
  );
}
