import Link from "next/link";
import type { MemberViewer } from "@/lib/member/viewer";
import { DogChip, type ChipDog } from "./DogChip";
import { Ms } from "./ui";
import { InstallAppButton } from "./install/InstallAppButton";
import { AccountMenu } from "./AccountMenu";

const AGE: Record<string, string> = { puppy: "Puppy", adult: "Adult", senior: "Senior" };

export function dogSubtitle(d: { breed: string | null; age_group: string }): string {
  return [d.breed, AGE[d.age_group]].filter(Boolean).join(" · ");
}

/** Sticky header: search, notifications, dog switcher and the account menu (on phones: logo, bell, account). */
export function Topbar({ viewer, logo = "/app/img/logo.png" }: { viewer: MemberViewer; logo?: string }) {
  const dogs: ChipDog[] = viewer.dogs.map((d) => ({ id: d.id, name: d.name, subtitle: dogSubtitle(d), photo: d.photo_url }));
  return (
    <header className="topbar">
      <Link className="brand-mini" href="/home">
        {/* eslint-disable-next-line @next/next/no-img-element -- brand logo */}
        <img src={logo} alt="Bonded" style={{ width: 108 }} />
      </Link>
      <form action="/search" role="search" style={{ flex: 1, minWidth: 0 }}>
        <label className="search" htmlFor="q">
          <Ms name="search" size="sm" />
          <input id="q" name="q" type="search" placeholder="Search lessons and notes…" autoComplete="off" maxLength={80} />
        </label>
      </form>
      <div className="top-right">
        <InstallAppButton />
        <Link className="icon-btn" href="/notifications" aria-label={viewer.unreadNotifications ? `Notifications (${viewer.unreadNotifications} new)` : "Notifications"} data-tour="notifications">
          <Ms name="notifications" />
          {viewer.unreadNotifications > 0 && <span className="dot" />}
        </Link>
        <span className="vr" />
        <DogChip dogs={dogs} activeId={viewer.activeDog?.id ?? null} />
        <AccountMenu
          name={viewer.profile.full_name?.trim() || viewer.firstName}
          email={viewer.email}
          initials={viewer.initials}
          avatarUrl={viewer.profile.avatar_url}
          dogs={dogs}
          activeDogId={viewer.activeDog?.id ?? null}
        />
      </div>
    </header>
  );
}
