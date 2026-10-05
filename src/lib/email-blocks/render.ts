import type { EmailBlock, EmailDoc, RenderContext } from "./types";
import { emailCard, pickEmailArt, type EmailArt } from "../email-art";
import { escapeHtml, fillVarsInert, markupToHtml, markupToText, safeHttpUrl, splitParagraphs } from "./markup";

/**
 * Turns an EmailDoc into the email a member receives: subject, branded HTML and a plain-text part.
 * {{tags}} are filled from ctx.vars first, then everything is escaped. The HTML is email-client
 * safe (tables, inline styles only) and matches src/lib/email-html.ts: logo header, white card,
 * small footer with the unsubscribe link. Pure, so it runs in the editor preview and on the server.
 */

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const COLORS = {
  page: "#eef6fb",
  card: "#ffffff",
  ink: "#243036",
  muted: "#85939a",
  line: "#e3ecf1",
  brand: "#0e666a",
  codeBg: "#eef8f7",
} as const;

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
const DISPLAY_FONT = "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
const MONO_FONT = "'SFMono-Regular', Menlo, Consolas, 'Liberation Mono', monospace";
const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
/** Card content width: 560 max minus 2×28 padding and the 1px borders. */
const CONTENT_WIDTH = 502;
const IMAGE_WIDTH = { min: 30, max: 100 } as const;
const SPACER_SIZE = { min: 8, max: 64 } as const;
const HEADING_SIZE = { 1: 24, 2: 19 } as const;

interface BlockOutput {
  html: string;
  text: string;
}

type Fill = (value: string) => string;

function clamp(value: number, range: { min: number; max: number }): number {
  const n = Number.isFinite(value) ? value : range.max;
  return Math.min(range.max, Math.max(range.min, Math.round(n)));
}

/** A full-width row with its own alignment: the email-safe way to align anything. */
function row(content: string, align: "left" | "center", padding = "0 0 16px"): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="${align}" style="padding:${padding};text-align:${align}">${content}</td></tr></table>`;
}

function heading(block: Extract<EmailBlock, { type: "heading" }>, fill: Fill): BlockOutput | null {
  const text = fill(block.text).trim();
  if (!text) return null;
  const size = HEADING_SIZE[block.level] ?? HEADING_SIZE[1];
  const tag = block.level === 2 ? "h2" : "h1";
  const html = `<${tag} style="margin:0;font-family:${DISPLAY_FONT};font-size:${size}px;line-height:1.3;font-weight:700;color:${COLORS.ink}">${escapeHtml(text)}</${tag}>`;
  return { html: row(html, block.align, "0 0 14px"), text: text };
}

function paragraphsHtml(text: string, align: "left" | "center", extraStyle = ""): string {
  return splitParagraphs(text)
    .map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${COLORS.ink};text-align:${align}${extraStyle}">${markupToHtml(p)}</p>`)
    .join("\n");
}

function textBlock(block: Extract<EmailBlock, { type: "text" }>, fill: Fill): BlockOutput | null {
  const text = fill(block.text);
  const paragraphs = splitParagraphs(text);
  if (paragraphs.length === 0) return null;
  return {
    html: `<div style="padding:0 0 2px">${paragraphsHtml(text, block.align)}</div>`,
    text: paragraphs.map(markupToText).join("\n\n"),
  };
}

function buttonBlock(block: Extract<EmailBlock, { type: "button" }>, fill: Fill): BlockOutput | null {
  const url = safeHttpUrl(fill(block.url));
  const label = fill(block.label).trim();
  if (!url || !label) return null;
  const color = HEX_COLOR.test(block.color) ? block.color : COLORS.brand;
  const html = `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="display:inline-table"><tr><td style="background:${color};border-radius:999px"><a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 26px;font-family:${FONT};font-size:15px;font-weight:600;line-height:1.2;color:#ffffff;text-decoration:none;border-radius:999px">${escapeHtml(label)}</a></td></tr></table>`;
  return { html: row(html, block.align, "6px 0 22px"), text: `${label}: ${url}` };
}

function imageBlock(block: Extract<EmailBlock, { type: "image" }>, fill: Fill): BlockOutput | null {
  const src = safeHttpUrl(fill(block.src));
  if (!src) return null;
  const alt = fill(block.alt).trim();
  const href = safeHttpUrl(fill(block.href));
  const percent = clamp(block.width, IMAGE_WIDTH);
  const width = Math.round((CONTENT_WIDTH * percent) / 100);
  const img = `<img src="${escapeHtml(src)}" width="${width}" alt="${escapeHtml(alt)}" style="display:block;width:${percent}%;max-width:100%;height:auto;border:0;border-radius:10px;margin:0 auto">`;
  const html = href ? `<a href="${escapeHtml(href)}" style="text-decoration:none">${img}</a>` : img;
  const text = alt && href ? `${alt}: ${href}` : alt ? `[${alt}]` : href ?? "";
  return { html: row(html, "center", "4px 0 18px"), text };
}

function codeBlock(block: Extract<EmailBlock, { type: "code" }>, ctx: RenderContext, fill: Fill): BlockOutput | null {
  const code = (ctx.vars.discount_code ?? "").trim();
  if (!code) return null;
  const title = fill(block.title).trim();
  const percent = (ctx.vars.discount_percent ?? "").trim();
  const expires = (ctx.vars.discount_expires ?? "").trim();
  const detail = [percent && `${percent} off`, expires && `valid until ${expires}`].filter(Boolean).join(" · ");
  const detailText = detail ? detail.charAt(0).toUpperCase() + detail.slice(1) : "";
  const titleHtml = title
    ? `<p style="margin:0 0 8px;font-size:13px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:${COLORS.brand}">${escapeHtml(title)}</p>`
    : "";
  const detailHtml = detailText ? `<p style="margin:10px 0 0;font-size:14px;color:${COLORS.muted}">${escapeHtml(detailText)}</p>` : "";
  const box = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" style="background:${COLORS.codeBg};border:2px dashed ${COLORS.brand};border-radius:14px;padding:20px 16px;text-align:center">${titleHtml}<p style="margin:0;font-family:${MONO_FONT};font-size:22px;font-weight:700;letter-spacing:0.05em;word-break:break-all;color:${COLORS.ink}">${escapeHtml(code)}</p>${detailHtml}</td></tr></table>`;
  const text = [title ? `${title}: ${code}` : code, detailText].filter(Boolean).join("\n");
  return { html: row(box, "center", "6px 0 22px"), text };
}

function quoteBlock(block: Extract<EmailBlock, { type: "quote" }>, fill: Fill): BlockOutput | null {
  const text = fill(block.text);
  const paragraphs = splitParagraphs(text);
  if (paragraphs.length === 0) return null;
  const author = fill(block.author).trim();
  const authorHtml = author ? `<p style="margin:0;font-size:13px;font-style:normal;color:${COLORS.muted}">— ${escapeHtml(author)}</p>` : "";
  const html = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td style="border-left:3px solid ${COLORS.brand};padding:2px 0 2px 16px">${paragraphsHtml(text, "left", ";font-style:italic;font-size:16px")}${authorHtml}</td></tr></table>`;
  const plain = `"${paragraphs.map(markupToText).join("\n\n")}"${author ? `\n— ${author}` : ""}`;
  return { html: row(html, "left", "4px 0 20px"), text: plain };
}

const DIVIDER: BlockOutput = {
  html: row(`<div style="border-top:1px solid ${COLORS.line};height:1px;line-height:1px;font-size:1px">&nbsp;</div>`, "left", "8px 0 24px"),
  text: "----------",
};

function spacer(size: number): BlockOutput {
  const px = clamp(size, SPACER_SIZE);
  return { html: `<div style="height:${px}px;line-height:${px}px;font-size:1px">&nbsp;</div>`, text: "" };
}

function renderBlock(block: EmailBlock, ctx: RenderContext, fill: Fill): BlockOutput | null {
  switch (block.type) {
    case "heading":
      return heading(block, fill);
    case "text":
      return textBlock(block, fill);
    case "button":
      return buttonBlock(block, fill);
    case "image":
      return imageBlock(block, fill);
    case "code":
      return codeBlock(block, ctx, fill);
    case "quote":
      return quoteBlock(block, fill);
    case "divider":
      return DIVIDER;
    case "spacer":
      return spacer(block.size);
    default:
      return null;
  }
}

interface FrameParts {
  subject: string;
  preheader: string;
  body: string;
  site: string;
  unsubscribeUrl: string | null;
  postalAddress: string;
  art: EmailArt | null;
}

function frame({ subject, preheader, body, site, unsubscribeUrl, postalAddress, art }: FrameParts): string {
  const preheaderHtml = preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all">${escapeHtml(preheader)}</div>\n`
    : "";
  const unsubscribe = unsubscribeUrl
    ? `<br>\n        <a href="${escapeHtml(unsubscribeUrl)}" style="color:${COLORS.muted}">Unsubscribe from these emails</a>`
    : "";
  const address = postalAddress ? `<br>\n        ${postalAddress.split("\n").map(escapeHtml).join("<br>")}` : "";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.page};font-family:${FONT};-webkit-text-size-adjust:100%">
${preheaderHtml}<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${COLORS.page}">
  <tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px">
      <tr><td align="center" style="padding:0 0 20px">
        <a href="${escapeHtml(site)}" style="text-decoration:none"><img src="${escapeHtml(site)}/images/logo.png" width="150" height="60" alt="Bonded" style="display:block;border:0"></a>
      </td></tr>
      <tr><td style="background:${COLORS.card};border:1px solid ${COLORS.line};border-radius:16px">
${emailCard(body, art, site, `font-family:${FONT};color:${COLORS.ink}`)}
      </td></tr>
      <tr><td align="center" style="padding:20px 8px 0;font-size:12px;line-height:1.5;color:${COLORS.muted}">
        Bonded · Learn your dog's secret language<br>
        <a href="${escapeHtml(site)}" style="color:${COLORS.muted}">${escapeHtml(site.replace(/^https?:\/\//, ""))}</a>${address}${unsubscribe}
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function plainText(blocks: readonly BlockOutput[], site: string, unsubscribeUrl: string | null, postalAddress: string): string {
  const body = blocks
    .map((b) => b.text.trim())
    .filter(Boolean)
    .join("\n\n");
  const footer = ["--", "Bonded · Learn your dog's secret language", site, postalAddress, unsubscribeUrl ? `Unsubscribe: ${unsubscribeUrl}` : ""]
    .filter(Boolean)
    .join("\n");
  return body ? `${body}\n\n${footer}` : footer;
}

export function renderEmailDoc(doc: EmailDoc, ctx: RenderContext): RenderedEmail {
  const fill: Fill = (value) => fillVarsInert(value ?? "", ctx.vars);
  const site = ctx.siteUrl.trim().replace(/\/+$/, "");
  const unsubscribeUrl = ctx.unsubscribeUrl ? safeHttpUrl(ctx.unsubscribeUrl) : null;
  const subject = fill(doc.subject).replace(/\s+/g, " ").trim();
  const preheader = fill(doc.preheader).replace(/\s+/g, " ").trim();
  const postalAddress = (ctx.postalAddress ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
  const blocks = doc.blocks.map((b) => renderBlock(b, ctx, fill)).filter((b): b is BlockOutput => b !== null);
  const body = blocks.map((b) => b.html).join("\n");
  // A flow or campaign that opens with its own image keeps that image as the picture.
  const art = pickEmailArt(ctx.art ?? (doc.blocks[0]?.type === "image" ? "none" : "photo"), ctx.now ?? new Date(), subject);
  return {
    subject,
    html: frame({ subject, preheader, body, site, unsubscribeUrl, postalAddress, art }),
    text: plainText(blocks, site, unsubscribeUrl, postalAddress),
  };
}
