/**
 * Action steps: what a flow does besides emailing. Pure definitions and checks; the runner carries
 * them out (server/actions.ts).
 */

export type ActionKind = "grant_chapter" | "revoke_chapter" | "add_tag" | "remove_tag" | "notify_team" | "webhook";

export interface ActionData {
  action: ActionKind;
  /** grant_chapter / revoke_chapter */
  courseId?: string | null;
  /** add_tag / remove_tag */
  tag?: string;
  /** notify_team: the note the team gets ({{tags}} allowed) */
  message?: string;
  /** webhook: where the event is POSTed */
  url?: string;
}

export const ACTION_KINDS: readonly ActionKind[] = ["grant_chapter", "revoke_chapter", "add_tag", "remove_tag", "notify_team", "webhook"];

export const ACTION_LABEL: Record<ActionKind, string> = {
  grant_chapter: "Give a chapter",
  revoke_chapter: "Take back a chapter",
  add_tag: "Add a tag",
  remove_tag: "Remove a tag",
  notify_team: "Notify the team",
  webhook: "Send to a webhook",
};

export const ACTION_HINT: Record<ActionKind, string> = {
  grant_chapter: "Opens a chapter for the member (members only; quiz leads are skipped).",
  revoke_chapter: "Closes a chapter this flow gave. Purchased access is never taken back.",
  add_tag: "Labels the contact, e.g. vip. Campaigns can go to a tag.",
  remove_tag: "Takes a label off the contact.",
  notify_team: "Emails the team inbox with a note about this person.",
  webhook: "POSTs the person and the event to Zapier, Make or your own service.",
};

const TAG_RE = /^[a-z0-9][a-z0-9 -]{0,39}$/;
export const MAX_NOTE = 1000;

/** Tags are lower case, single-spaced: "VIP  Members" → "vip members". Empty when unusable. */
export function normalizeTag(raw: string): string {
  const tag = raw.toLowerCase().replace(/\s+/g, " ").trim();
  return TAG_RE.test(tag) ? tag : "";
}

const PRIVATE_HOSTS = /^(localhost|.*\.localhost|.*\.local|.*\.internal|metadata\.google\.internal)$/i;
const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;

/**
 * Webhooks go only to public https addresses named by a host (no IP literals, no localhost), so a
 * flow can't be pointed at the server's own network.
 */
export function isPublicHttpsUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.username || url.password) return false;
  const host = url.hostname;
  if (!host.includes(".") || PRIVATE_HOSTS.test(host) || IPV4.test(host) || host.startsWith("[")) return false;
  return true;
}

/** What keeps an action step from going live, in plain words. */
export function actionProblems(data: ActionData): string[] {
  switch (data.action) {
    case "grant_chapter":
    case "revoke_chapter":
      return data.courseId ? [] : ["A chapter action needs the chapter picked."];
    case "add_tag":
    case "remove_tag":
      return normalizeTag(data.tag ?? "") ? [] : ["A tag action needs a tag (letters, numbers, spaces and dashes)."];
    case "notify_team": {
      const note = (data.message ?? "").trim();
      return note && note.length <= MAX_NOTE ? [] : ["A team notification needs a message."];
    }
    case "webhook":
      return isPublicHttpsUrl(data.url ?? "") ? [] : ["A webhook needs a public https:// address."];
    default:
      return ["An action step has an unknown action."];
  }
}
