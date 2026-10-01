import "server-only";
import type { createServiceClient } from "@/lib/supabase/admin";
import { parseMemberRow, type ReminderMember } from "../members";
import type { Notice } from "../copy";
import type { DeliveryOutcome } from "../summary";

export type Service = ReturnType<typeof createServiceClient>;

const MEMBER_PAGE = 1000;
const MAX_MEMBER_PAGES = 100;

/** Every member the jobs may remind (active course or community grant), page by page. */
export async function loadReminderMembers(sb: Service): Promise<ReminderMember[]> {
  let members: ReminderMember[] = [];
  let after: string | null = null;
  for (let page = 0; page < MAX_MEMBER_PAGES; page += 1) {
    const { data, error } = await sb.rpc("reminder_members", { p_after: after, p_limit: MEMBER_PAGE });
    if (error) throw new Error(`reminder_members failed: ${error.message}`);
    const rows: unknown[] = Array.isArray(data) ? data : [];
    const parsed = rows.map((row) => ({ row, member: parseMemberRow(row) }));
    for (const bad of parsed.filter((p) => !p.member)) {
      console.error("[reminders] skipped a malformed member row", { userId: (bad.row as { user_id?: unknown } | null)?.user_id });
    }
    members = [...members, ...parsed.flatMap((p) => (p.member ? [p.member] : []))];
    if (rows.length < MEMBER_PAGE) return members;
    const last = rows[rows.length - 1] as { user_id?: unknown };
    if (typeof last.user_id !== "string") return members;
    after = last.user_id;
  }
  console.error("[reminders] member list was cut off", { pages: MAX_MEMBER_PAGES });
  return members;
}

export type DeliveryKind = "practice" | "lesson_unlocked" | "qa_day_before" | "qa_day_of" | "feedback_overdue" | "feedback_overdue_email";
export type NoticeKind = "lesson" | "event" | "system";

export interface Delivery {
  /** null = the team inbox */
  userId: string | null;
  kind: DeliveryKind;
  ref: string;
  noticeKind: NoticeKind;
  /** null = only claim (used for emails that have no in-app notice) */
  notice: Notice | null;
}

/**
 * Claims a delivery and writes its in-app notice in one transaction. "already_sent" when an earlier
 * run claimed it, so callers send emails only for "sent".
 */
export async function deliver(sb: Service, d: Delivery): Promise<DeliveryOutcome> {
  const { data, error } = await sb.rpc("deliver_reminder", {
    p_user: d.userId,
    p_kind: d.kind,
    p_ref: d.ref,
    p_notice_kind: d.noticeKind,
    p_title: d.notice?.title ?? null,
    p_body: d.notice?.body ?? null,
    p_href: d.notice?.href ?? null,
  });
  if (error) {
    console.error("[reminders] delivery failed", { kind: d.kind, ref: d.ref, userId: d.userId, error: error.message });
    return "failed";
  }
  return data === true ? "sent" : "already_sent";
}
