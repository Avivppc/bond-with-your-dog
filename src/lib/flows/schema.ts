import { z } from "zod";
import type { EmailDoc } from "@/lib/email-blocks/types";
import type { FlowGraph } from "./graph";
import { TRIGGERS, type FlowTrigger } from "./triggers";
import { normalizeTag } from "./actions";

/** What the admin may save: graphs, emails and settings are checked field by field before they reach the database. */

const position = z.object({ x: z.number().finite(), y: z.number().finite() });
const id = z.string().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/);
const empty = z.object({}).strict();
const align = z.enum(["left", "center"]);
const text = (max: number) => z.string().max(max);
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);

const block = z.discriminatedUnion("type", [
  z.object({ id, type: z.literal("heading"), text: text(300), level: z.union([z.literal(1), z.literal(2)]), align }),
  z.object({ id, type: z.literal("text"), text: text(10_000), align }),
  z.object({ id, type: z.literal("button"), label: text(80), url: text(2000), align, color }),
  z.object({ id, type: z.literal("image"), src: text(2000), alt: text(300), href: text(2000), width: z.number().int().min(30).max(100) }),
  z.object({ id, type: z.literal("code"), title: text(120) }),
  z.object({ id, type: z.literal("quote"), text: text(1000), author: text(120) }),
  z.object({ id, type: z.literal("divider") }),
  z.object({ id, type: z.literal("spacer"), size: z.number().int().min(8).max(64) }),
]);

export const emailDocSchema = z.object({ subject: text(200), preheader: text(200), blocks: z.array(block).max(60) });
const legacyEmail = z.object({ subject: text(200), preheader: text(200), body: text(10_000), ctaLabel: text(80) });

const courseId = z.string().min(1).max(100).nullish();
const node = z.discriminatedUnion("type", [
  z.object({ id, type: z.literal("trigger"), position, data: empty }),
  z.object({ id, type: z.literal("exit"), position, data: empty }),
  z.object({ id, type: z.literal("wait"), position, data: z.object({ days: z.number().int().min(0).max(60), hours: z.number().int().min(0).max(23) }) }),
  z.object({ id, type: z.literal("email"), position, data: z.union([emailDocSchema, legacyEmail]) }),
  z.object({
    id,
    type: z.literal("condition"),
    position,
    data: z.object({
      check: z.enum(["opened", "clicked", "owns_chapter", "completed_chapter", "practiced_recently", "has_purchased", "is_member", "has_tag"]),
      courseId,
      days: z.number().int().min(1).max(365).optional(),
      tag: text(40).optional(),
    }),
  }),
  z.object({
    id,
    type: z.literal("action"),
    position,
    data: z.object({
      action: z.enum(["grant_chapter", "revoke_chapter", "add_tag", "remove_tag", "notify_team", "webhook"]),
      courseId,
      tag: text(40).optional(),
      message: text(1000).optional(),
      url: text(2000).optional(),
    }),
  }),
  z.object({ id, type: z.literal("split"), position, data: z.object({ percentA: z.number().int().min(1).max(99) }) }),
]);

const edge = z.object({ id, source: id, target: id, sourceHandle: z.enum(["yes", "no", "a", "b"]).nullish() });

export const graphSchema = z.object({ nodes: z.array(node).max(80), edges: z.array(edge).max(160) });

const triggerKeys = TRIGGERS.map((t) => t.key) as [FlowTrigger, ...FlowTrigger[]];

export const flowSettingsSchema = z
  .object({
    name: z.string().trim().min(1, "Give the flow a name.").max(120),
    trigger: z.enum(triggerKeys),
    triggerParams: z.object({ courseId, percent: z.number().int().optional(), days: z.number().int().optional(), hours: z.number().int().optional() }),
    offer: z.object({ kind: z.enum(["none", "next_chapter", "chapter", "abandoned_offer"]), courseId }),
    goal: z.object({ kind: z.enum(["none", "bought_offer", "any_purchase", "practiced", "signed_up"]) }),
    reentry: z.enum(["once", "each_time"]),
    discountPercent: z.number().int().min(1).max(90).nullable(),
    discountValidDays: z.number().int().min(1).max(90).nullable(),
    smartSendingHours: z.number().int().min(0).max(168),
    quietHours: z.boolean(),
  })
  .refine((s) => (s.discountPercent === null) === (s.discountValidDays === null), { message: "Set both the discount and how long the code lasts, or neither." })
  .refine((s) => s.offer.kind !== "chapter" || Boolean(s.offer.courseId), { message: "Pick which chapter the flow offers." });

export type FlowSettings = z.infer<typeof flowSettingsSchema>;

export function parseGraph(input: unknown): { ok: true; graph: FlowGraph } | { ok: false; error: string } {
  const parsed = graphSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "The flow couldn't be read. Refresh the page and try again." };
  return { ok: true, graph: parsed.data as FlowGraph };
}

export function parseEmailDoc(input: unknown): { ok: true; doc: EmailDoc } | { ok: false; error: string } {
  const parsed = emailDocSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "The email couldn't be read. Refresh the page and try again." };
  return { ok: true, doc: parsed.data as EmailDoc };
}

/** A campaign's audience (public.campaign_audience reads the same shape). */
export const audienceSchema = z
  .object({
    kind: z.enum(["all_members", "owns_chapter", "not_owns_chapter", "completed_chapter", "inactive_practice", "quiz_leads", "everyone", "has_tag"]),
    courseId,
    days: z.number().int().min(1).max(365).optional(),
    // Stored the way tags are stored ("VIP  Members" → "vip members"), so it matches.
    tag: z.string().max(60).transform(normalizeTag).optional(),
  })
  .refine((a) => !["owns_chapter", "not_owns_chapter", "completed_chapter"].includes(a.kind) || Boolean(a.courseId), { message: "Pick the chapter for this audience." })
  .refine((a) => a.kind !== "has_tag" || Boolean(a.tag), { message: "Type the tag for this audience." });

export const campaignSchema = z.object({
  name: z.string().trim().min(1, "Give the campaign a name.").max(120),
  audience: audienceSchema,
  email: emailDocSchema,
});
