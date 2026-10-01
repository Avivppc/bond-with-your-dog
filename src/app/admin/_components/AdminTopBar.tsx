import Link from "next/link";
import { badgeLabel, buildAdminAlerts } from "@/lib/admin-alerts";
import { loadAdminAlertCounts } from "./admin-alerts-data";
import { TopBarMenu } from "./TopBarMenu";

const MENU_ITEM = "flex w-full items-center gap-2 rounded-[8px] px-3 py-2 text-left text-[14px] text-[#1a1a19] hover:bg-[#f3f3f2]";
const PANEL_BOX = "z-30 rounded-[12px] border border-[#e7e6e4] bg-white p-1 shadow-lg";
const PANEL = `${PANEL_BOX} absolute right-0 mt-2`;
/** Full width under the top bar on phones (the bell sits mid-bar); a dropdown from sm up. */
const WIDE_PANEL = `${PANEL_BOX} fixed inset-x-4 top-14 sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-72`;
const ICON_BUTTON = "relative flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full text-[#3d3c3a] hover:bg-[#f3f3f2]";

function AccountMenu({ email, initial }: { email: string; initial: string }) {
  return (
    <TopBarMenu
      label="Account menu"
      summaryClassName="flex cursor-pointer list-none items-center gap-2 rounded-full border border-[#e7e6e4] bg-white py-1 pl-1 pr-3 text-[14px] font-medium hover:bg-[#f8f8f8]"
      panelClassName={`${PANEL} w-60`}
      trigger={
        <>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1a1a19] text-xs font-semibold text-white">{initial}</span>
          <span className="hidden sm:inline">Bonded Academy</span>
          <span className="material-symbols-outlined text-[18px] text-[#6c6a69]" aria-hidden>
            expand_more
          </span>
        </>
      }
    >
      <p className="truncate px-3 py-2 text-xs text-[#6c6a69]">{email}</p>
      <Link href="/home" className={MENU_ITEM}>
        <span className="material-symbols-outlined text-[18px]" aria-hidden>
          open_in_new
        </span>
        View member app
      </Link>
      <Link href="/studio" className={MENU_ITEM}>
        <span className="material-symbols-outlined text-[18px]" aria-hidden>
          video_camera_front
        </span>
        Roni&apos;s Studio
      </Link>
      <form action="/auth/logout" method="post" className="border-t border-[#efeeed] pt-1">
        <button type="submit" className={MENU_ITEM}>
          <span className="material-symbols-outlined text-[18px]" aria-hidden>
            logout
          </span>
          Sign out
        </button>
      </form>
    </TopBarMenu>
  );
}

/** The bell: what is waiting for the team (videos, questions, posts to review, inbox), each linking to where it's done. */
async function AlertsMenu({ canSeeInbox }: { canSeeInbox: boolean }) {
  const { items, total } = buildAdminAlerts(await loadAdminAlertCounts(canSeeInbox));
  const badge = badgeLabel(total);
  return (
    <TopBarMenu
      label={badge ? `Notifications, ${total} waiting` : "Notifications"}
      summaryClassName={ICON_BUTTON}
      panelClassName={WIDE_PANEL}
      trigger={
        <>
          <span className="material-symbols-outlined text-[22px]" aria-hidden>
            notifications
          </span>
          {badge && (
            <span className="absolute -right-0.5 -top-0.5 min-w-[18px] rounded-full bg-[#d93f3f] px-1 text-center text-[11px] font-semibold leading-[18px] text-white">
              {badge}
            </span>
          )}
        </>
      }
    >
      <p className="px-3 py-2 text-xs font-medium text-[#6c6a69]">Waiting for you</p>
      {items.length === 0 ? (
        <p className="px-3 pb-3 text-[14px] text-[#1a1a19]">You&apos;re all caught up.</p>
      ) : (
        items.map((item) => (
          <Link key={item.key} href={item.href} className={MENU_ITEM}>
            <span className="material-symbols-outlined text-[18px] text-[#4b4a48]" aria-hidden>
              {item.icon}
            </span>
            {item.label}
          </Link>
        ))
      )}
    </TopBarMenu>
  );
}

/** Kajabi's top bar: contact search, notifications bell, account menu. */
export async function AdminTopBar({ email, canSeeContacts }: { email: string; canSeeContacts: boolean }) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-end gap-2 border-b border-[#ebeae8] bg-white px-4 pl-14 lg:pl-4">
      {canSeeContacts && (
        <>
          <form action="/admin/people" method="get" role="search" className="mr-auto hidden max-w-sm flex-1 sm:block">
            <label className="relative block">
              <span className="sr-only">Search contacts</span>
              <span className="material-symbols-outlined pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[18px] text-[#9b9997]" aria-hidden>
                search
              </span>
              <input
                name="q"
                type="search"
                placeholder="Search contacts"
                className="w-full rounded-full border border-[#e7e6e4] bg-[#f8f8f8] py-1.5 pl-9 pr-3 text-[14px] placeholder:text-[#9b9997] focus:border-[#343332] focus:bg-white focus:outline-none"
              />
            </label>
          </form>
          <Link href="/admin/people" className={`${ICON_BUTTON} sm:hidden`} aria-label="Search contacts">
            <span className="material-symbols-outlined text-[22px]" aria-hidden>
              search
            </span>
          </Link>
        </>
      )}
      <AlertsMenu canSeeInbox={canSeeContacts} />
      <AccountMenu email={email} initial={(email || "?").charAt(0).toUpperCase()} />
    </header>
  );
}
