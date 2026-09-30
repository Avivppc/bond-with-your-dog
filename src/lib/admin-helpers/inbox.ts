/** The support Inbox's tabs and status filter (support_requests kind / status). Pure. */
export const INBOX_TABS = [
  { key: "question", label: "Questions" },
  { key: "bug", label: "Problems" },
  { key: "story", label: "Stories" },
] as const;

export type InboxTab = (typeof INBOX_TABS)[number]["key"];

export const INBOX_STATUSES = [
  { key: "open", label: "Open" },
  { key: "answered", label: "Answered" },
  { key: "closed", label: "Closed" },
  { key: "all", label: "All" },
] as const;

export type InboxStatus = (typeof INBOX_STATUSES)[number]["key"];

export function parseInboxTab(raw: unknown): InboxTab {
  return INBOX_TABS.find((t) => t.key === raw)?.key ?? "question";
}

export function parseInboxStatus(raw: unknown): InboxStatus {
  return INBOX_STATUSES.find((s) => s.key === raw)?.key ?? "open";
}

/** Query string for an inbox view; defaults are left out so URLs stay short. */
export function inboxHref(view: { tab: InboxTab; status: InboxStatus; page?: number }, extra: Record<string, string> = {}): string {
  const params = new URLSearchParams({
    ...(view.tab !== "question" ? { tab: view.tab } : {}),
    ...(view.status !== "open" ? { status: view.status } : {}),
    ...(view.page && view.page > 1 ? { page: String(view.page) } : {}),
    ...extra,
  });
  const qs = params.toString();
  return qs ? `/admin/inbox?${qs}` : "/admin/inbox";
}
