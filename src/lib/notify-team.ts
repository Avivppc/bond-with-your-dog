import "server-only";
import { createServiceClient } from "@/lib/supabase/admin";
import { sendEmail, siteUrl } from "@/lib/email";
import { loadEmailSettings } from "@/lib/flows/server/email-settings";
import { teamRecipient, type NotifyEvent } from "@/lib/notifications";

export interface TeamNote {
  subject: string;
  /** Body lines; null lines are dropped. */
  lines: (string | null)[];
  /** Admin page to open, e.g. "/admin/orders". */
  path: string;
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
    const text = [...note.lines.filter((l): l is string => l !== null), "", `Open it: ${siteUrl()}${note.path}`].join("\n");
    return await sendEmail({ to, subject: note.subject, text });
  } catch (error: unknown) {
    console.error("[notify] team email failed", { event, error: error instanceof Error ? error.message : String(error) });
    return false;
  }
}
