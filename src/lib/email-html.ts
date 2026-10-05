/**
 * The branded HTML version of every transactional email: Bonded logo header, a white card, links
 * as buttons, and a small footer. Built from the plain-text body the senders already write, so all
 * emails share one look and keep a text part. Pure (no server imports) so it is unit-tested.
 *
 * Text conventions: blank lines separate paragraphs; a paragraph that is one line "Label: https://…"
 * becomes a button (a trailing "(…)" in the label turns into a small note under it).
 */

const COLORS = {
  page: "#eef6fb",
  card: "#ffffff",
  ink: "#243036",
  muted: "#85939a",
  line: "#e3ecf1",
  button: "#0e666a",
  link: "#0e666a",
} as const;

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
const URL_RE = /https?:\/\/[^\s<>"]+/g;
const BUTTON_LINE = /^(.+?):\s*(https?:\/\/\S+)\s*$/;
const NOTE = /\s*(\([^)]*\))\s*$/;

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** Escapes a line and makes its http(s) addresses clickable. */
function linkify(line: string): string {
  let out = "";
  let last = 0;
  for (const match of line.matchAll(URL_RE)) {
    const url = match[0].replace(/[.,;:!?)]+$/, "");
    const start = match.index ?? 0;
    out += escapeHtml(line.slice(last, start));
    out += `<a href="${escapeHtml(url)}" style="color:${COLORS.link};text-decoration:underline;word-break:break-all">${escapeHtml(url)}</a>`;
    last = start + url.length;
  }
  return out + escapeHtml(line.slice(last));
}

function button(label: string, url: string): string {
  const noteMatch = label.match(NOTE);
  const text = noteMatch ? label.slice(0, noteMatch.index).trim() : label.trim();
  const note = noteMatch ? `<p style="margin:8px 0 0;font-size:13px;color:${COLORS.muted}">${escapeHtml(noteMatch[1])}</p>` : "";
  return `<div style="margin:22px 0">
  <a href="${escapeHtml(url)}" style="display:inline-block;background:${COLORS.button};color:#ffffff;font-weight:600;font-size:15px;text-decoration:none;padding:12px 24px;border-radius:999px">${escapeHtml(text)}</a>${note}
</div>`;
}

function paragraph(block: string): string {
  const lines = block.split("\n");
  const single = lines.length === 1 ? lines[0].match(BUTTON_LINE) : null;
  if (single) return button(single[1], single[2]);
  return `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${COLORS.ink}">${lines.map(linkify).join("<br>\n")}</p>`;
}

/** Marketing extras: inbox preview text, and the unsubscribe link every marketing email must carry. */
export interface EmailExtras {
  preheader?: string;
  unsubscribeUrl?: string;
}

export function renderEmailHtml(email: { subject: string; text: string }, siteUrl: string, extras: EmailExtras = {}): string {
  const site = siteUrl.replace(/\/$/, "");
  const preheader = extras.preheader?.trim()
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(extras.preheader.trim())}</div>\n`
    : "";
  const unsubscribe = extras.unsubscribeUrl
    ? `<br>\n        <a href="${escapeHtml(extras.unsubscribeUrl)}" style="color:${COLORS.muted}">Unsubscribe from these emails</a>`
    : "";
  const body = email.text
    .trim()
    .split(/\n\s*\n/)
    .map((block) => paragraph(block.trim()))
    .join("\n");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(email.subject)}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.page};font-family:${FONT}">
${preheader}<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${COLORS.page}">
  <tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px">
      <tr><td align="center" style="padding:0 0 20px">
        <a href="${escapeHtml(site)}" style="text-decoration:none"><img src="${escapeHtml(site)}/images/logo.png" width="150" height="60" alt="Bonded" style="display:block;border:0"></a>
      </td></tr>
      <tr><td style="background:${COLORS.card};border:1px solid ${COLORS.line};border-radius:16px;padding:32px 28px">
${body}
      </td></tr>
      <tr><td align="center" style="padding:20px 8px 0;font-size:12px;line-height:1.5;color:${COLORS.muted}">
        Bonded · Learn your dog's secret language<br>
        <a href="${escapeHtml(site)}" style="color:${COLORS.muted}">${escapeHtml(site.replace(/^https?:\/\//, ""))}</a>${unsubscribe}
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}
