/** Feedback video states as the member and the Studio see them. Pure. */

export type FeedbackStatus = "uploading" | "waiting" | "replied" | "errored";
export type PillTone = "neutral" | "learning" | "reliable" | "perform" | "danger";

export interface FeedbackStateInput {
  status: FeedbackStatus;
  member_read_at: string | null;
}

export interface FeedbackPill {
  tone: PillTone;
  label: string;
}

export function feedbackPill(video: FeedbackStateInput): FeedbackPill {
  switch (video.status) {
    case "replied":
      return video.member_read_at ? { tone: "neutral", label: "Read" } : { tone: "reliable", label: "Feedback ready" };
    case "waiting":
      return { tone: "learning", label: "In review" };
    case "uploading":
      return { tone: "neutral", label: "Processing" };
    default:
      return { tone: "danger", label: "Upload failed" };
  }
}

export const FEEDBACK_TABS = ["all", "waiting", "replied"] as const;
export type FeedbackTab = (typeof FEEDBACK_TABS)[number];

export function parseFeedbackTab(value: string | string[] | undefined): FeedbackTab {
  const v = Array.isArray(value) ? value[0] : value;
  return (FEEDBACK_TABS as readonly string[]).includes(v ?? "") ? (v as FeedbackTab) : "all";
}

/** "Waiting" = still with Roni (processing or in review). */
export function inTab(status: FeedbackStatus, tab: FeedbackTab): boolean {
  if (tab === "all") return true;
  if (tab === "replied") return status === "replied";
  return status === "waiting" || status === "uploading";
}

/** Header line: "3 sent · 2 replies from Roni". Failed uploads were never sent. */
export function feedbackCountsLine(statuses: readonly FeedbackStatus[]): string {
  const sent = statuses.filter((s) => s !== "errored").length;
  const replies = statuses.filter((s) => s === "replied").length;
  return `${sent} sent · ${replies} ${replies === 1 ? "reply" : "replies"} from Roni`;
}

/** Studio queue: a video waiting more than two days is overdue. */
export const OVERDUE_AFTER_DAYS = 2;

export function isOverdue(createdAt: string, now: Date): boolean {
  return now.getTime() - new Date(createdAt).getTime() > OVERDUE_AFTER_DAYS * 86_400_000;
}

/** Queue "Sent" column: "Today", "1 day", "3 days". */
export function ageLabel(createdAt: string, now: Date): string {
  const days = Math.floor((now.getTime() - new Date(createdAt).getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  return days === 1 ? "1 day" : `${days} days`;
}

/** Done videos where the member wrote after Roni's last word need another look. */
export function hasUnansweredMessage(messages: readonly { from_staff: boolean; created_at: string }[]): boolean {
  const last = [...messages].sort((a, b) => a.created_at.localeCompare(b.created_at)).at(-1);
  return Boolean(last && !last.from_staff);
}

/** Coach levels offered in the Studio ("Ready" = performance-ready). */
export const COACH_LEVELS = [
  { value: "learning", label: "Learning" },
  { value: "reliable", label: "Reliable" },
  { value: "performance", label: "Ready" },
] as const;
export type CoachLevel = (typeof COACH_LEVELS)[number]["value"];
