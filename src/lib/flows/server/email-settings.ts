import "server-only";
import type { ServiceClient } from "./data";
import { DEFAULT_NOTIFY, readNotifyPrefs, type NotifyPrefs } from "@/lib/notifications";

/** Settings → Email: how marketing email presents the sender, and where team notes go. */
export interface EmailSettings {
  senderName: string;
  replyTo: string | null;
  postalAddress: string | null;
  /** Where team notifications and "Notify the team" flow steps go (else COACH_INBOX). */
  teamEmail: string | null;
  /** Which events email the team (Settings → Notifications). */
  notify: NotifyPrefs;
}

export const DEFAULT_EMAIL_SETTINGS: EmailSettings = { senderName: "Bonded", replyTo: null, postalAddress: null, teamEmail: null, notify: DEFAULT_NOTIFY };

export async function loadEmailSettings(sb: ServiceClient): Promise<EmailSettings> {
  const { data, error } = await sb.from("email_settings").select("sender_name, reply_to, postal_address, team_email, notify").eq("id", 1).maybeSingle();
  if (error) throw new Error(`email settings unavailable: ${error.message}`);
  if (!data) return DEFAULT_EMAIL_SETTINGS;
  return { senderName: data.sender_name, replyTo: data.reply_to, postalAddress: data.postal_address, teamEmail: data.team_email, notify: readNotifyPrefs(data.notify) };
}

/** Marketing email may only go out once the business postal address is filled in. */
export const MISSING_ADDRESS_ERROR = "Add your business postal address in Settings → Email first. The law asks for it in every marketing email.";

export function hasPostalAddress(settings: EmailSettings): boolean {
  return Boolean(settings.postalAddress?.trim());
}
