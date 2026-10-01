import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/email";
import { loadReferralSettings } from "@/lib/referrals-server";
import { requireMember } from "@/lib/member/viewer";
import { CopyButton } from "@/components/app/CopyButton";
import { Ms, StateCard, Tip } from "@/components/app/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Refer a friend" };

interface Summary {
  code: string | null;
  friends_joined: number;
  friends_converted: number;
  rewards_available: number;
  rewards_used: number;
  best_reward_percent: number | null;
}

/** "Refer a friend": the member's link, how it works, and how their referrals are doing. */
export default async function ReferPage() {
  await requireMember("/refer");
  const supabase = await createClient();
  const settings = await loadReferralSettings();
  if (!settings.enabled) {
    return <StateCard icon="card_giftcard" eyebrow="Refer a friend" title="The referral program isn't open right now">Check back soon — we&apos;ll let you know by email when it opens.</StateCard>;
  }

  const { error: codeError } = await supabase.rpc("get_or_create_referral_code");
  if (codeError) console.error("[refer] code failed", codeError.message);
  const { data } = await supabase.rpc("my_referral_summary");
  const summary = ((data ?? [])[0] ?? null) as Summary | null;
  const link = summary?.code ? `${siteUrl()}/r/${summary.code}` : null;

  return (
    <>
      <div className="card" style={{ background: "var(--teal)", color: "#eafcfd", gap: 18 }}>
        <span className="eyebrow" style={{ color: "#bff3f5" }}>
          Friend brings friend
        </span>
        <h1 className="display" style={{ color: "#fff" }}>
          Give {settings.friendDiscountPercent}%, get {settings.rewardPercent}%
        </h1>
        <p className="lede" style={{ color: "#d6f4f5" }}>
          {settings.description ||
            `Share your link. Your friend gets ${settings.friendDiscountPercent}% off their first purchase, and when they buy you get ${settings.rewardPercent}% off your next one.`}
        </p>
        {link ? (
          <div className="row">
            <input className="input" readOnly value={link} aria-label="Your referral link" style={{ flex: 1, minWidth: 220, background: "#fff" }} />
            <CopyButton value={link} label="Copy link" className="btn btn-primary btn-sm" />
          </div>
        ) : (
          <p>We couldn&apos;t create your link — please refresh.</p>
        )}
      </div>

      <div className="grid-3">
        {[
          { label: "Friends joined", value: summary?.friends_joined ?? 0 },
          { label: "Friends who bought", value: summary?.friends_converted ?? 0 },
          { label: "Rewards ready to use", value: summary?.rewards_available ?? 0 },
        ].map((s) => (
          <div key={s.label} className="card tight">
            <div className="stat">
              <b>{s.value}</b>
              <span>{s.label}</span>
            </div>
          </div>
        ))}
      </div>

      {(summary?.rewards_available ?? 0) > 0 && (
        <Tip icon="celebration">
          You have {summary?.rewards_available} reward{summary?.rewards_available === 1 ? "" : "s"} — {summary?.best_reward_percent}% off is applied automatically at your next checkout.
        </Tip>
      )}

      <div className="card">
        <h2 className="h3">How it works</h2>
        <div className="grid-3">
          {[
            { icon: "link", title: "Share your link", body: "Send it to a friend who'd love training with their dog." },
            { icon: "sell", title: "They save", body: `${settings.friendDiscountPercent}% off their first purchase, within ${settings.attributionDays} days.` },
            { icon: "card_giftcard", title: "You get rewarded", body: `${settings.rewardPercent}% off your next purchase for every friend who buys.` },
          ].map((step, i) => (
            <div key={step.title} className="card flat tight">
              <Ms name={step.icon} color="var(--teal)" />
              <b>
                {i + 1}. {step.title}
              </b>
              <span className="faint">{step.body}</span>
            </div>
          ))}
        </div>
        <p className="faint">Rewards are for new customers only and are removed if a friend&apos;s purchase is refunded. One discount per purchase.</p>
      </div>
    </>
  );
}
