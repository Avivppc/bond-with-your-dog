/**
 * An email as the block editor builds it (flows and campaigns share it). Text fields may contain
 * {{tags}} (see src/lib/flows/template.ts); the renderer fills them before escaping. Text blocks use
 * a tiny inline markup: **bold**, *italic*, [label](https://url). Pure data, stored as JSON.
 */

import type { EmailArtKind } from "../email-art";

export type Align = "left" | "center";

export interface HeadingBlock {
  id: string;
  type: "heading";
  text: string;
  level: 1 | 2;
  align: Align;
}
export interface TextBlock {
  id: string;
  type: "text";
  /** Blank lines separate paragraphs. */
  text: string;
  align: Align;
}
export interface ButtonBlock {
  id: string;
  type: "button";
  label: string;
  /** Usually {{offer_url}} or {{app_url}}; any https:// address works. */
  url: string;
  align: Align;
  /** Hex colour; defaults to the brand teal. */
  color: string;
}
export interface ImageBlock {
  id: string;
  type: "image";
  /** Public https URL (uploaded to the email-assets bucket). Empty = placeholder. */
  src: string;
  alt: string;
  /** Optional link when the image is clicked. */
  href: string;
  /** Percent of the email width, 30–100. */
  width: number;
}
/** The member's personal discount code, percentage and expiry, in a highlighted box. */
export interface CodeBlock {
  id: string;
  type: "code";
  /** Line above the code, e.g. "Your member code". */
  title: string;
}
export interface QuoteBlock {
  id: string;
  type: "quote";
  text: string;
  author: string;
}
export interface DividerBlock {
  id: string;
  type: "divider";
}
export interface SpacerBlock {
  id: string;
  type: "spacer";
  /** Pixels, 8–64. */
  size: number;
}

export type EmailBlock = HeadingBlock | TextBlock | ButtonBlock | ImageBlock | CodeBlock | QuoteBlock | DividerBlock | SpacerBlock;
export type EmailBlockType = EmailBlock["type"];

export interface EmailDoc {
  subject: string;
  /** Inbox preview line. */
  preheader: string;
  blocks: EmailBlock[];
}

/** Values the renderer needs besides the tags: links for the frame and the code box. */
export interface RenderContext {
  siteUrl: string;
  /** Filled into {{tags}} in every text field. */
  vars: Record<string, string>;
  unsubscribeUrl?: string;
  /** The business postal address marketing email must show (Settings → Email). */
  postalAddress?: string | null;
  /** Picture at the top of the card. Default: a photo, unless the email's first block is an image. */
  art?: EmailArtKind;
  /** The send time, which decides the day's picture (default: now). */
  now?: Date;
}
