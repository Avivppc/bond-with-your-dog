/**
 * The admin dashboard's "Needs attention" list and "Recent activity" feed. Pure (database rows in,
 * display items out) so the rules can be tested without a database.
 */

// ---------- Needs attention: setup and health ----------

export interface JobHeartbeat {
  lastOkAt: string | null;
  lastErrorAt: string | null;
  lastError: string | null;
}

export interface SetupFacts {
  hasPostalAddress: boolean;
  /** Emails that failed to send in the last 7 days. */
  failedEmails: number;
  flows: JobHeartbeat | null;
  /** Public forms have Cloudflare Turnstile keys. */
  spamProtection: boolean;
  /** Only production nags about Turnstile; development never has the keys. */
  isProduction: boolean;
}

export interface SetupWarning {
  key: "postal" | "flows" | "failedEmails" | "spam";
  tone: "error" | "warning";
  label: string;
  hint: string;
  href: string;
  icon: string;
}

/** Flows run every 15 minutes; an hour without a good run means they've stopped. */
export const FLOWS_STALE_MS = 60 * 60 * 1000;

function flowsWarning(job: JobHeartbeat | null, now: Date): SetupWarning | null {
  const base = { key: "flows" as const, tone: "error" as const, href: "/admin/email-flows", icon: "sync_problem" };
  if (!job?.lastOkAt) {
    if (job?.lastError) return { ...base, label: "Automations are failing", hint: job.lastError };
    return { ...base, tone: "warning", label: "Automations haven't run yet", hint: "Flows and campaigns go out when the 15-minute schedule runs." };
  }
  const lastOk = new Date(job.lastOkAt).getTime();
  const failedSince = job.lastErrorAt !== null && new Date(job.lastErrorAt).getTime() > lastOk;
  if (failedSince) return { ...base, label: "Automations are failing", hint: job.lastError ?? "The last run didn't finish." };
  if (now.getTime() - lastOk > FLOWS_STALE_MS) return { ...base, label: "Automations stopped running", hint: "No run in the last hour. Check the schedule's secret." };
  return null;
}

/** What's missing or broken, worst first. Empty when all is well. */
export function setupWarnings(facts: SetupFacts, now: Date): SetupWarning[] {
  const flows = flowsWarning(facts.flows, now);
  const items: (SetupWarning | null)[] = [
    flows?.tone === "error" ? flows : null,
    facts.hasPostalAddress
      ? null
      : {
          key: "postal",
          tone: "error",
          label: "Add your postal address",
          hint: "Marketing emails don't go out without it.",
          href: "/admin/settings/email",
          icon: "home_pin",
        },
    facts.failedEmails > 0
      ? {
          key: "failedEmails",
          tone: "warning",
          label: `${facts.failedEmails} ${facts.failedEmails === 1 ? "email" : "emails"} failed this week`,
          hint: "Usually a bad address. Open a flow or campaign to see who.",
          href: "/admin/email-flows",
          icon: "mail_off",
        }
      : null,
    flows?.tone === "warning" ? flows : null,
    facts.isProduction && !facts.spamProtection
      ? {
          key: "spam",
          tone: "warning",
          label: "Forms have no spam protection",
          hint: "Add the Turnstile keys in Vercel to block bots on sign-up and the quiz.",
          href: "/admin/settings/general",
          icon: "shield",
        }
      : null,
  ];
  return items.filter((i): i is SetupWarning => i !== null);
}

// ---------- Recent activity ----------

export type ActivityKind = "signup" | "lead" | "order" | "lesson" | "video" | "question" | "survey";

export interface ActivityRow {
  kind: ActivityKind;
  at: string;
  userId: string | null;
  email: string | null;
  name: string | null;
  detail: string | null;
  amountCents: number | null;
  currency: string | null;
}

export interface ActivityItem extends ActivityRow {
  /** How many rows of the same kind by the same person were folded into this one. */
  count: number;
}

/** Rows this close together, same person and kind, read as one burst ("finished 7 lessons"). */
export const BURST_MS = 30 * 60 * 1000;

function sameBurst(a: ActivityItem, b: ActivityRow): boolean {
  if (a.kind !== b.kind || a.kind === "order" || a.kind === "signup") return false;
  const who = (r: ActivityRow) => r.userId ?? r.email?.toLowerCase() ?? null;
  return who(a) !== null && who(a) === who(b) && Math.abs(new Date(a.at).getTime() - new Date(b.at).getTime()) <= BURST_MS;
}

/** Folds bursts (rows arrive newest first) and keeps the newest `limit` items. */
export function groupActivity(rows: readonly ActivityRow[], limit: number): ActivityItem[] {
  const items = rows.reduce<ActivityItem[]>((acc, row) => {
    const last = acc.at(-1);
    if (last && sameBurst(last, row)) return [...acc.slice(0, -1), { ...last, count: last.count + 1 }];
    return [...acc, { ...row, count: 1 }];
  }, []);
  return items.slice(0, limit);
}

const ICON: Record<ActivityKind, string> = {
  signup: "person_add",
  lead: "quiz",
  order: "payments",
  lesson: "task_alt",
  video: "video_camera_front",
  question: "help",
  survey: "rate_review",
};

const TIER_LABEL: Record<string, string> = { foundations: "Foundations", moves: "Moves", letsDance: "Let's Dance" };

export function activityIcon(kind: ActivityKind): string {
  return ICON[kind];
}

/** "Dana finished 7 lessons" (without the name, which the page shows in bold). */
export function activityText(item: ActivityItem, money: (cents: number, currency: string) => string): string {
  const quoted = item.detail ? `“${item.detail}”` : "";
  switch (item.kind) {
    case "signup":
      return "created an account";
    case "lead":
      return `took the website quiz${item.detail ? ` (${TIER_LABEL[item.detail] ?? item.detail})` : ""}`;
    case "order":
      return `bought ${item.detail ?? "an offer"}${item.amountCents && item.currency ? ` for ${money(item.amountCents, item.currency)}` : ""}`;
    case "lesson":
      return item.count > 1 ? `finished ${item.count} lessons` : `finished ${quoted || "a lesson"}`;
    case "video":
      return item.count > 1 ? `sent ${item.count} videos for feedback` : `sent a video for feedback: ${quoted}`;
    case "question":
      return item.count > 1 ? `asked ${item.count} lesson questions` : `asked a question on ${quoted || "a lesson"}`;
    case "survey":
      return `answered ${quoted || "a survey"}`;
  }
}

/** Where a click goes: the person's page, or the leads list for quiz takers without an account. */
export function activityHref(item: ActivityItem): string {
  if (item.userId) return `/admin/people/${item.userId}`;
  return item.email ? `/admin/leads?q=${encodeURIComponent(item.email)}` : "/admin/leads";
}

export function activityName(item: ActivityItem): string {
  return item.name?.trim() || item.email || "Someone";
}
