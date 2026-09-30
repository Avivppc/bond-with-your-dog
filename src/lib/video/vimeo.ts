/**
 * Vimeo link handling. Editors paste whatever link they have (public, unlisted,
 * player, showcase, manage page); we store the video id + unlisted hash and build
 * the player URL ourselves. Pure — shared by admin, web and the future app.
 */
export interface VimeoRef {
  id: string;
  /** Unlisted-video hash ("h" param); required to play unlisted videos. */
  hash: string | null;
}

const VIMEO_HOSTS = new Set(["vimeo.com", "www.vimeo.com", "player.vimeo.com"]);
const ID = /^\d{5,12}$/;
const HASH = /^[0-9a-f]{6,20}$/i;

export function parseVimeoUrl(input: string): VimeoRef | null {
  const raw = input.trim();
  if (!raw) return null;

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  if (!["http:", "https:"].includes(url.protocol) || !VIMEO_HOSTS.has(url.hostname.toLowerCase())) return null;

  const parts = url.pathname.split("/").filter(Boolean);
  const idIndex = parts.findIndex((p) => ID.test(p) && !isContainerSegment(parts, p));
  if (idIndex === -1) return null;

  const next = parts[idIndex + 1];
  const queryHash = url.searchParams.get("h");
  const hash = next && HASH.test(next) ? next : queryHash && HASH.test(queryHash) ? queryHash : null;
  return { id: parts[idIndex], hash };
}

/** Numeric segments that identify a showcase/album/group, not the video itself. */
function isContainerSegment(parts: string[], segment: string): boolean {
  const before = parts[parts.indexOf(segment) - 1];
  return before === "showcase" || before === "album" || before === "groups";
}

export function vimeoEmbedUrl(ref: VimeoRef): string {
  const url = new URL(`https://player.vimeo.com/video/${ref.id}`);
  if (ref.hash) url.searchParams.set("h", ref.hash);
  url.searchParams.set("dnt", "1"); // no tracking cookies for students
  url.searchParams.set("title", "0");
  url.searchParams.set("byline", "0");
  url.searchParams.set("portrait", "0");
  return url.toString();
}
