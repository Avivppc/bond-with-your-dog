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
  revoke_chapter: "Closes a chapter this same flow gave. Purchases and other access are never taken back.",
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

const PRIVATE_SUFFIXES = /(^|\.)(localhost|local|internal|intranet|lan|corp|home|home\.arpa|private|localdomain)$/i;
const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;
/** Hosts written as a bare number (2130706433 = 127.0.0.1) or in hex. */
const NUMERIC_HOST = /^(0x[0-9a-f]+|\d+)$/i;

/**
 * Webhooks go only to public https addresses on port 443, named by a host (no IP literals, no
 * internal names), so a flow can't be pointed at the server's own network. The runner also checks
 * where the name resolves before sending (see isPrivateAddress).
 */
export function isPublicHttpsUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.username || url.password) return false;
  if (url.port && url.port !== "443") return false;
  const host = url.hostname.replace(/\.$/, "");
  if (!host.includes(".") || PRIVATE_SUFFIXES.test(host) || IPV4.test(host) || NUMERIC_HOST.test(host) || host.startsWith("[")) return false;
  return true;
}

function ipv4Private(ip: string): boolean {
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

/** Whether a resolved address is anything but the public internet (loopback, private, link-local…). */
export function isPrivateAddress(ip: string): boolean {
  const addr = ip.toLowerCase();
  if (IPV4.test(addr)) return ipv4Private(addr);
  const mapped = addr.match(/^::ffff:(\d{1,3}(\.\d{1,3}){3})$/);
  if (mapped) return ipv4Private(mapped[1]);
  if (addr === "::" || addr === "::1") return true;
  // fc00::/7 unique local, fe80::/10 link-local, ff00::/8 multicast.
  return /^(f[cd][0-9a-f]{2}|fe[89ab][0-9a-f]|ff[0-9a-f]{2}):/.test(addr);
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
