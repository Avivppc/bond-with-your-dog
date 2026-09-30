"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface CommunityNavProps {
  channels: readonly { slug: string; name: string; posting: string }[];
  isStaff: boolean;
  reviewCount: number;
}

const MAIN = [
  { href: "/community", label: "Home", icon: "home" },
  { href: "/community/challenges", label: "Challenges", icon: "emoji_events" },
  { href: "/community/meetups", label: "Meetups", icon: "event" },
  { href: "/community/leaderboard", label: "Leaderboard", icon: "leaderboard" },
  { href: "/community/members", label: "Members", icon: "group" },
];

function Item({ href, label, icon, badge }: { href: string; label: string; icon: string; badge?: number }) {
  const pathname = usePathname();
  const active = href === "/community" ? pathname === "/community" : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-sm font-medium ${active ? "bg-[#e3f5f5] text-[#0e666a]" : "text-[#3d3c3a] hover:bg-[#f3f3f2]"}`}
    >
      <span className="material-symbols-outlined text-[20px]" aria-hidden>
        {icon}
      </span>
      <span className="flex-1">{label}</span>
      {badge ? <span className="rounded-full bg-[#e0607e] px-1.5 text-[11px] font-bold text-white">{badge}</span> : null}
    </Link>
  );
}

/** Kajabi community navigation: main sections, staff tools, then channels. */
export function CommunityNav({ channels, isStaff, reviewCount }: CommunityNavProps) {
  return (
    <nav className="space-y-5" aria-label="Community">
      <div className="space-y-0.5">
        {MAIN.map((m) => (
          <Item key={m.href} {...m} />
        ))}
        {isStaff && (
          <>
            <Item href="/community/scheduled" label="Scheduled posts" icon="schedule" />
            <Item href="/community/review" label="Review feed" icon="fact_check" badge={reviewCount} />
          </>
        )}
      </div>
      <div>
        <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-[#9b9997]">Channels</p>
        <div className="space-y-0.5">
          {channels.map((c) => (
            <Item key={c.slug} href={`/community/c/${c.slug}`} label={c.name} icon={c.posting === "staff" ? "campaign" : "tag"} />
          ))}
        </div>
      </div>
    </nav>
  );
}
