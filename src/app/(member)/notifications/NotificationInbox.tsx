"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ms } from "@/components/app/ui";
import { LocalTime } from "@/components/ui/LocalTime";
import { groupNotifications, notificationIcon, safeNotificationHref } from "@/lib/feedback/notifications";
import { markAllNotificationsRead, markNotificationRead } from "./actions";
import { useToast } from "../feedback/_components/Toast";

export interface InboxItem {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  href: string | null;
  read_at: string | null;
  created_at: string;
}

const FROM_RONI = new Set(["feedback", "answer", "support"]);
const subscribe = () => () => {};

function Icon({ kind }: { kind: string }) {
  if (FROM_RONI.has(kind)) {
    // eslint-disable-next-line @next/next/no-img-element -- design avatar
    return <img className="avatar" src="/app/img/roni.jpg" alt="" />;
  }
  const gold = kind === "achievement";
  return (
    <span className="ic" style={gold ? { background: "var(--gold-soft)", color: "var(--gold-ink)" } : undefined}>
      <Ms name={notificationIcon(kind)} fill={gold} />
    </span>
  );
}

/** The inbox, grouped in the viewer's own time zone (UTC on the server render). */
export function NotificationInbox({ items, nowIso }: { items: InboxItem[]; nowIso: string }) {
  const router = useRouter();
  const zone = useSyncExternalStore(subscribe, () => Intl.DateTimeFormat().resolvedOptions().timeZone, () => "UTC");
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();
  const [toast, showToast] = useToast();
  const groups = groupNotifications(items, new Date(nowIso), zone);
  const unread = items.filter((n) => !n.read_at && !readIds.has(n.id)).length;

  function open(item: InboxItem) {
    const href = safeNotificationHref(item.href);
    setReadIds((prev) => new Set(prev).add(item.id));
    start(async () => {
      if (!item.read_at) {
        const res = await markNotificationRead(item.id);
        if (!res.ok) showToast(res.error);
      }
      if (href) router.push(href);
    });
  }

  function markAll() {
    start(async () => {
      const res = await markAllNotificationsRead();
      if (!res.ok) {
        showToast(res.error);
        return;
      }
      setReadIds(new Set(items.map((i) => i.id)));
      showToast("All caught up");
      router.refresh();
    });
  }

  return (
    <>
      <div className="between">
        <div className="head-block">
          <span className="eyebrow">Inbox</span>
          <h1 className="h1">Notifications</h1>
        </div>
        {unread > 0 && (
          <button className="link" type="button" onClick={markAll} disabled={pending}>
            Mark all as read
            <Ms name="done_all" />
          </button>
        )}
      </div>
      <div className="card">
        {groups.map((g, gi) => (
          <div key={g.key} className="stack" style={{ gap: 0 }}>
            <span className="eyebrow muted" style={gi > 0 ? { marginTop: 8 } : undefined}>
              {g.label}
            </span>
            <div className="list">
              {g.items.map((n) => {
                const isUnread = !n.read_at && !readIds.has(n.id);
                return (
                  <button
                    key={n.id}
                    type="button"
                    className={`notif ${isUnread ? "unread" : ""}`}
                    style={{ width: "100%", textAlign: "left" }}
                    onClick={() => open(n)}
                    aria-label={`${n.title}${isUnread ? " (new)" : ""}`}
                  >
                    <Icon kind={n.kind} />
                    <div>
                      <div className="title">
                        <b>{n.title}</b>
                      </div>
                      <div className="faint">
                        {n.body ? `${n.body} · ` : ""}
                        <LocalTime iso={n.created_at} format={g.key === "today" ? "time" : "dateTime"} />
                      </div>
                    </div>
                    <span className="ms" style={{ color: "var(--ink-3)" }} aria-hidden>
                      chevron_right
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {toast}
    </>
  );
}
