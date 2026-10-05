import "server-only";
import { createServiceClient } from "@/lib/supabase/admin";
import { sendEmail, siteUrl } from "@/lib/email";
import { loadEmailSettings } from "@/lib/flows/server/email-settings";
import { teamRecipient, type NotifyEvent } from "@/lib/notifications";

export interface TeamNote {
  subject: string;
  /** Body lines; null lines are dropped. */
  lines: (string | null)[];
  /** Text a member or visitor typed: shown quoted, so it can't pass for a link button or our own words. */
  quoted?: string;
  /** Admin page to open, e.g. "/admin/orders". */
  path: string;
}

/** "> " before every line (blank ones too), so no line of it stands alone as "Label: https://…". */
export function quoteLines(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => `> ${line}`)
    .join("\n");
}

/** notifyTeam for callers that must prepare the note first (lookups, formatting): any throw is logged, never raised. */
export async function notifyTeamSafely(event: NotifyEvent, build: () => Promise<TeamNote>): Promise<boolean> {
  try {
    return await notifyTeam(event, await build());
  } catch (error: unknown) {
    console.error("[notify] preparing the team email failed", { event, error: error instanceof Error ? error.message : String(error) });
    return false;
  }
}

/**
 * Emails the team about an event when Settings → Notifications has it on. Never throws: the event
 * itself (a purchase, a question) already happened and must not fail because an email didn't go.
 * Returns whether an email went out.
 */
export async function notifyTeam(event: NotifyEvent, note: TeamNote): Promise<boolean> {
  try {
    const settings = await loadEmailSettings(createServiceClient());
    if (!settings.notify[event]) return false;
    const to = teamRecipient(settings.teamEmail, process.env.COACH_INBOX);
    if (!to) return false;
    // "They wrote:" sits in the same paragraph as the quote, so even a one-line quote is never a lone "Label: https://…" line.
    const quoted = note.quoted ? ["", "They wrote:", quoteLines(note.quoted)] : [];
    const text = [...note.lines.filter((l): l is string => l !== null), ...quoted, "", `Open it: ${siteUrl()}${note.path}`].join("\n");
    return await sendEmail({ to, subject: note.subject, text });
  } catch (error: unknown) {
    console.error("[notify] team email failed", { event, error: error instanceof Error ? error.message : String(error) });
    return false;
  }
}
