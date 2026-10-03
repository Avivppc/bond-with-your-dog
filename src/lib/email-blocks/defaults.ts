import { z } from "zod";
import type { EmailBlock, EmailBlockType, EmailDoc } from "./types";

/**
 * New blocks, the starter email, and reading stored email data — both the block format and the
 * older { subject, preheader, body, ctaLabel } flow-step format. Pure.
 */

export type BlockOf<T extends EmailBlockType> = Extract<EmailBlock, { type: T }>;

export const BRAND_TEAL = "#0e666a";
const ID_BYTES = 6;

/** A short random id for a block (unique within an email). */
export function blockId(): string {
  const bytes = new Uint8Array(ID_BYTES);
  globalThis.crypto.getRandomValues(bytes);
  return `b${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

const FACTORIES: { [K in EmailBlockType]: (id: string) => BlockOf<K> } = {
  heading: (id) => ({ id, type: "heading", text: "A headline for {{first_name}}", level: 1, align: "left" }),
  text: (id) => ({ id, type: "text", text: "Write your message here. Use **bold**, *italic* and [links](https://www.bonded.dog).", align: "left" }),
  button: (id) => ({ id, type: "button", label: "Continue to {{next_chapter}}", url: "{{offer_url}}", align: "left", color: BRAND_TEAL }),
  image: (id) => ({ id, type: "image", src: "", alt: "", href: "", width: 100 }),
  code: (id) => ({ id, type: "code", title: "Your member code" }),
  quote: (id) => ({ id, type: "quote", text: "", author: "" }),
  divider: (id) => ({ id, type: "divider" }),
  spacer: (id) => ({ id, type: "spacer", size: 24 }),
};

export function newBlock<T extends EmailBlockType>(type: T, id: string = blockId()): BlockOf<T> {
  return FACTORIES[type](id);
}

/** A friendly first draft for a new email: heading, message, member code and checkout button. */
export function starterDoc(): EmailDoc {
  return {
    subject: "{{first_name}}, {{next_chapter}} is ready for you",
    preheader: "A member thank-you for you and {{dog_name}}",
    blocks: [
      { ...newBlock("heading"), text: "Ready for the next chapter, {{first_name}}?" },
      {
        ...newBlock("text"),
        text: "You and {{dog_name}} have come a long way in {{chapter}}.\n\n{{next_chapter}} picks up right where you left off. As a member, you get **{{discount_percent}} off** — {{discounted_price}} instead of {{price}}.",
      },
      newBlock("code"),
      newBlock("button"),
    ],
  };
}

/** Campaigns have no offer or member code, so their new buttons open the app instead. */
export function newCampaignBlock(type: EmailBlockType): EmailBlock {
  const block = newBlock(type);
  return block.type === "button" ? { ...block, label: "Open Bonded", url: "{{app_url}}" } : block;
}

/** A first draft for a campaign: heading, message and a button to the app. */
export function campaignStarterDoc(): EmailDoc {
  return {
    subject: "",
    preheader: "",
    blocks: [
      { ...newBlock("heading"), text: "Hi {{first_name}}" },
      newBlock("text"),
      newCampaignBlock("button"),
    ],
  };
}

// ---- Reading stored data ---------------------------------------------------------------------

const align = z.enum(["left", "center"]);
const blockSchema = z.discriminatedUnion("type", [
  z.object({ id: z.string(), type: z.literal("heading"), text: z.string(), level: z.union([z.literal(1), z.literal(2)]), align }),
  z.object({ id: z.string(), type: z.literal("text"), text: z.string(), align }),
  z.object({ id: z.string(), type: z.literal("button"), label: z.string(), url: z.string(), align, color: z.string() }),
  z.object({ id: z.string(), type: z.literal("image"), src: z.string(), alt: z.string(), href: z.string(), width: z.number() }),
  z.object({ id: z.string(), type: z.literal("code"), title: z.string() }),
  z.object({ id: z.string(), type: z.literal("quote"), text: z.string(), author: z.string() }),
  z.object({ id: z.string(), type: z.literal("divider") }),
  z.object({ id: z.string(), type: z.literal("spacer"), size: z.number() }),
]) satisfies z.ZodType<EmailBlock>;

const docSchema = z.object({ subject: z.string(), preheader: z.string(), blocks: z.array(blockSchema) }) satisfies z.ZodType<EmailDoc>;

export function isEmailBlock(x: unknown): x is EmailBlock {
  return blockSchema.safeParse(x).success;
}

export function isEmailDoc(x: unknown): x is EmailDoc {
  return docSchema.safeParse(x).success;
}

export interface LegacyEmailData {
  subject: string;
  preheader: string;
  body: string;
  ctaLabel: string;
}

const MENTIONS_CODE = /\{\{\s*discount_code\s*\}\}/;

/** The older flow-step email as blocks: the body as one text block, the code box, then the button. */
export function legacyEmailToDoc(data: LegacyEmailData): EmailDoc {
  const body = data.body.trim();
  const blocks: EmailBlock[] = [
    ...(body ? [{ ...newBlock("text", "legacy-text"), text: body }] : []),
    ...(MENTIONS_CODE.test(body) ? [newBlock("code", "legacy-code")] : []),
    ...(data.ctaLabel.trim() ? [{ ...newBlock("button", "legacy-button"), label: data.ctaLabel.trim() }] : []),
  ];
  return { subject: data.subject, preheader: data.preheader, blocks };
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/**
 * Whatever an email step or campaign has stored, as an EmailDoc: the block format as is (dropping
 * any malformed blocks), otherwise the legacy fields converted. Never throws.
 */
export function emailDocFromNodeData(data: unknown): EmailDoc {
  if (isEmailDoc(data)) return data;
  const record = typeof data === "object" && data !== null ? (data as Record<string, unknown>) : {};
  if (Array.isArray(record.blocks)) {
    return { subject: str(record.subject), preheader: str(record.preheader), blocks: record.blocks.filter(isEmailBlock) };
  }
  return legacyEmailToDoc({
    subject: str(record.subject),
    preheader: str(record.preheader),
    body: str(record.body),
    ctaLabel: str(record.ctaLabel),
  });
}
