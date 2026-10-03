import Link from "next/link";
import { formatMoney } from "@/lib/pricing";
import { buildAdminAlerts } from "@/lib/admin-alerts";
import { timeAgo } from "@/lib/community/format";
import { activityHref, activityIcon, activityName, activityText, groupActivity, setupWarnings } from "@/lib/admin-dashboard";
import { Card, EmptyState } from "./ui";
import { Avatar } from "./list-kit";
import { loadAdminAlertCounts } from "./admin-alerts-data";
import { lastDay, recentActivityRows, setupFacts, type LastDayMetric } from "./dashboard-data";

/** The dashboard's "Last 24 hours", "Needs attention" and "Recent activity" panels. */

const LAST_DAY: { metric: LastDayMetric; label: string; money?: boolean; href: string; needsSales: boolean }[] = [
  { metric: "signups", label: "New accounts", href: "/admin/people", needsSales: true },
  { metric: "leads", label: "Quiz leads", href: "/admin/leads", needsSales: true },
  { metric: "revenue", label: "Revenue", money: true, href: "/admin/orders", needsSales: true },
  { metric: "lessons", label: "Lessons finished", href: "/admin/analytics", needsSales: false },
  { metric: "practice", label: "Practice sessions", href: "/admin/analytics", needsSales: false },
];

function Delta({ current, previous }: { current: number; previous: number }) {
  if (current === previous) return <span className="text-[12px] text-[#9b9997]">Same as the day before</span>;
  const up = current > previous;
  return (
    <span className={`text-[12px] font-medium ${up ? "text-[#1c6b35]" : "text-[#a4262c]"}`}>
      {up ? "↑" : "↓"} {Math.abs(current - previous).toLocaleString("en-US")} vs the day before
    </span>
  );
}

export async function LastDayStrip({ currency, canSell }: { currency: string; canSell: boolean }) {
  const numbers = await lastDay(currency);
  const cards = LAST_DAY.filter((c) => canSell || !c.needsSales);
  return (
    <section aria-label="Last 24 hours">
      <h2 className="mb-2 text-[14px] font-medium text-[#6c6a69]">Last 24 hours</h2>
      <div className={`grid grid-cols-2 gap-3 ${canSell ? "md:grid-cols-5" : "md:grid-cols-2"}`}>
        {cards.map((c) => {
          const n = numbers?.[c.metric];
          const value = n === undefined ? "—" : c.money ? formatMoney(n.current, currency) : n.current.toLocaleString("en-US");
          return (
            <Link
              key={c.metric}
              href={c.href}
              className="block rounded-[12px] border border-[#e7e6e4] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:border-[#d9d8d6] hover:bg-[#fafaf9]"
            >
              <p className="text-[13px] text-[#6c6a69]">{c.label}</p>
              <p className="mt-1 text-[22px] font-semibold tracking-tight text-[#1a1a19]">{value}</p>
              {n && !c.money && <Delta current={n.current} previous={n.previous} />}
              {n && c.money && n.current !== n.previous && (
                <span className="text-[12px] text-[#9b9997]">Day before: {formatMoney(n.previous, currency)}</span>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

const TONE = {
  error: "bg-[#fde8e8] text-[#a4262c]",
  warning: "bg-[#fdf1dc] text-[#8a5a00]",
  todo: "bg-[#efeeed] text-[#4b4a48]",
} as const;

function AttentionRow({ href, icon, tone, label, hint }: { href: string; icon: string; tone: keyof typeof TONE; label: string; hint?: string }) {
  return (
    <li>
      <Link href={href} className="flex items-center gap-3 px-5 py-3 hover:bg-[#fafaf9]">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${TONE[tone]}`}>
          <span className="material-symbols-outlined text-[18px]" aria-hidden>
            {icon}
          </span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-medium text-[#1a1a19]">{label}</span>
          {hint && <span className="block truncate text-[12px] text-[#6c6a69]">{hint}</span>}
        </span>
        <span className="material-symbols-outlined text-[18px] text-[#9b9997]" aria-hidden>
          chevron_right
        </span>
      </Link>
    </li>
  );
}

export async function NeedsAttention({ canSell }: { canSell: boolean }) {
  const [counts, facts] = await Promise.all([loadAdminAlertCounts(canSell), canSell ? setupFacts() : Promise.resolve(null)]);
  const warnings = facts ? setupWarnings(facts, new Date()) : [];
  const { items } = buildAdminAlerts(counts);
  const empty = warnings.length === 0 && items.length === 0;
  return (
    <Card flush title="Needs attention" description={empty ? undefined : "Setup first, then what members are waiting for."}>
      {empty ? (
        <EmptyState title="You're all caught up.">Nothing is waiting and everything is running.</EmptyState>
      ) : (
        <ul className="divide-y divide-[#efeeed] border-t border-[#efeeed]">
          {warnings.map((w) => (
            <AttentionRow key={w.key} href={w.href} icon={w.icon} tone={w.tone} label={w.label} hint={w.hint} />
          ))}
          {items.map((a) => (
            <AttentionRow key={a.key} href={a.href} icon={a.icon} tone="todo" label={a.label} />
          ))}
        </ul>
      )}
    </Card>
  );
}

/** Fetch more rows than we show: bursts (a member finishing 7 lessons) fold into one line. */
const ACTIVITY_ROWS = 100;
const ACTIVITY_SHOWN = 8;

export async function RecentActivity() {
  const rows = await recentActivityRows(ACTIVITY_ROWS);
  const items = rows ? groupActivity(rows, ACTIVITY_SHOWN) : [];
  const now = new Date();
  return (
    <Card flush title="Recent activity" description="What members and visitors did lately.">
      {rows === null ? (
        <EmptyState title="Couldn't load the activity.">Refresh the page to try again.</EmptyState>
      ) : items.length === 0 ? (
        <EmptyState title="Nothing yet.">Sign-ups, purchases and finished lessons show up here.</EmptyState>
      ) : (
        <ul className="divide-y divide-[#efeeed] border-t border-[#efeeed]">
          {items.map((item) => (
            <li key={`${item.kind}-${item.at}-${item.userId ?? item.email}`}>
              <Link href={activityHref(item)} className="flex items-center gap-3 px-5 py-3 hover:bg-[#fafaf9]">
                <span className="relative">
                  <Avatar name={activityName(item)} size={32} />
                  <span className="material-symbols-outlined absolute -bottom-1 -right-1 rounded-full bg-white text-[14px] text-[#6c6a69]" aria-hidden>
                    {activityIcon(item.kind)}
                  </span>
                </span>
                <span className="min-w-0 flex-1 text-[14px] text-[#1a1a19]">
                  <span className="font-medium">{activityName(item)}</span> {activityText(item, formatMoney)}
                </span>
                <span className="shrink-0 text-[12px] text-[#9b9997]">{timeAgo(item.at, now)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
