/**
 * The email editor's tiny inline markup — **bold**, *italic*, [label](https://url) — turned into
 * safe HTML or plain text. Everything is escaped; markup is the only way to produce tags, and links
 * survive only with an http(s) or mailto address. Bare http(s) addresses become links too.
 * Tag filling ({{first_name}}) happens before any of this (see fillVars). Pure.
 */

const TAG_RE = /\{\{\s*([a-z0-9_]+)\s*\}\}/gi;
/** [label](url); the url may hold one level of balanced parentheses. */
const LINK_RE = /\[([^\]\n]+)\]\(\s*((?:[^()\s]|\([^()\s]*\))+)\s*\)/g;
const BARE_URL_RE = /https?:\/\/[^\s<>"]+/g;
const TRAILING_PUNCTUATION = /[.,;:!?)]+$/;
const BOLD_RE = /\*\*(?=\S)(.+?)(?<=\S)\*\*/g;
const ITALIC_RE = /\*(?=[^\s*])([^*\n]+?)(?<=[^\s*])\*/g;
const DEFAULT_LINK_COLOR = "#0e666a";

export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** Fills {{tags}} from vars; unknown tags become empty so braces never reach a member. */
export function fillVars(text: string, vars: Readonly<Record<string, string>>): string {
  return text.replace(TAG_RE, (_, key: string) => (Object.hasOwn(vars, key) ? (vars[key] ?? "") : ""));
}

/** Markup a typed-in value could use to pose as a link or formatting: [ ] * and "http(s)://". */
const MARKUP_CHARS = /[[\]*]/g;
const URL_SCHEME = /(https?):\/\//gi;

/**
 * A value that stays plain text after it is filled into markup. Names come from public forms (the
 * quiz, sign-up), so "[Verify your account](https://…)" must not become a link in our email.
 */
export function inertText(value: string): string {
  return value.replace(MARKUP_CHARS, "").replace(URL_SCHEME, "$1: //");
}

/** Fills {{tags}} like fillVars, but only *_url tags may add links or formatting. */
export function fillVarsInert(text: string, vars: Readonly<Record<string, string>>): string {
  return text.replace(TAG_RE, (_, key: string) => {
    const value = Object.hasOwn(vars, key) ? (vars[key] ?? "") : "";
    return key.toLowerCase().endsWith("_url") ? value : inertText(value);
  });
}

const UNSAFE_URL_CHARS = /[\s\u0000-\u001f\u007f]/;

/** The protocol of an absolute URL written as-is (no spaces or control characters), else null. */
function protocolOf(value: string): string | null {
  if (!value || UNSAFE_URL_CHARS.test(value)) return null;
  try {
    return new URL(value).protocol;
  } catch {
    return null;
  }
}

/** The address when it is an absolute http(s) URL; otherwise null (javascript:, data:, relative…). */
export function safeHttpUrl(raw: string): string | null {
  const value = raw.trim();
  const protocol = protocolOf(value);
  return protocol === "http:" || protocol === "https:" ? value : null;
}

/** Links inside text may also be mailto:. */
export function safeLinkUrl(raw: string): string | null {
  const value = raw.trim();
  return protocolOf(value) === "mailto:" ? value : safeHttpUrl(value);
}

export interface MarkupOptions {
  linkColor?: string;
}

type Segment = { kind: "text"; text: string } | { kind: "link"; label: string; href: string | null };

/** Splits text into plain runs and links (explicit [label](url) and bare http(s) addresses). */
function segments(text: string): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  for (const match of text.matchAll(LINK_RE)) {
    const start = match.index ?? 0;
    out.push(...bareUrlSegments(text.slice(last, start)));
    out.push({ kind: "link", label: match[1], href: safeLinkUrl(match[2]) });
    last = start + match[0].length;
  }
  out.push(...bareUrlSegments(text.slice(last)));
  return out.filter((s) => s.kind === "link" || s.text !== "");
}

function bareUrlSegments(text: string): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  for (const match of text.matchAll(BARE_URL_RE)) {
    const url = match[0].replace(TRAILING_PUNCTUATION, "");
    const start = match.index ?? 0;
    out.push({ kind: "text", text: text.slice(last, start) });
    out.push({ kind: "link", label: url, href: safeHttpUrl(url) });
    last = start + url.length;
  }
  out.push({ kind: "text", text: text.slice(last) });
  return out;
}

/** Escapes a run, then applies **bold** and *italic* (the escaped run has no <, >, " or '). */
function emphasis(raw: string): string {
  return escapeHtml(raw).replace(BOLD_RE, "<strong>$1</strong>").replace(ITALIC_RE, "<em>$1</em>");
}

function stripEmphasis(raw: string): string {
  return raw.replace(BOLD_RE, "$1").replace(ITALIC_RE, "$1");
}

/** One paragraph of markup as inline HTML; single newlines become <br>. */
export function markupToHtml(text: string, options: MarkupOptions = {}): string {
  const color = options.linkColor ?? DEFAULT_LINK_COLOR;
  return segments(text)
    .map((s) => {
      if (s.kind === "text") return emphasis(s.text);
      if (!s.href) return emphasis(s.label);
      return `<a href="${escapeHtml(s.href)}" style="color:${color};text-decoration:underline;word-break:break-word">${emphasis(s.label)}</a>`;
    })
    .join("")
    .replace(/\r?\n/g, "<br>\n");
}

/** The same paragraph as plain text: markers dropped, links as "label (url)". */
export function markupToText(text: string): string {
  return segments(text)
    .map((s) => {
      if (s.kind === "text") return stripEmphasis(s.text);
      const label = stripEmphasis(s.label);
      if (!s.href) return label;
      const href = s.href.startsWith("mailto:") ? s.href.slice("mailto:".length) : s.href;
      return label === s.href || label === href ? href : `${label} (${href})`;
    })
    .join("");
}

/** Blank lines separate paragraphs; empty paragraphs are dropped. */
export function splitParagraphs(text: string): string[] {
  return text
    .replace(/\r\n/g, "\n")
    .split(/\n[ \t]*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}
