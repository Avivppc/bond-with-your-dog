import { z } from "zod";
import type { FlowGraph } from "./graph";

/** What the admin builder may save: the graph is checked field by field before it reaches the database. */

const position = z.object({ x: z.number().finite(), y: z.number().finite() });
const id = z.string().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/);
const empty = z.object({}).strict();

const node = z.discriminatedUnion("type", [
  z.object({ id, type: z.literal("trigger"), position, data: empty }),
  z.object({ id, type: z.literal("exit"), position, data: empty }),
  z.object({ id, type: z.literal("wait"), position, data: z.object({ days: z.number().int().min(0).max(60), hours: z.number().int().min(0).max(23) }) }),
  z.object({
    id,
    type: z.literal("email"),
    position,
    data: z.object({
      subject: z.string().max(200),
      preheader: z.string().max(200),
      body: z.string().max(10_000),
      ctaLabel: z.string().max(80),
    }),
  }),
  z.object({ id, type: z.literal("condition"), position, data: z.object({ check: z.enum(["opened", "clicked"]) }) }),
  z.object({ id, type: z.literal("split"), position, data: z.object({ percentA: z.number().int().min(1).max(99) }) }),
]);

const edge = z.object({ id, source: id, target: id, sourceHandle: z.enum(["yes", "no", "a", "b"]).nullish() });

export const graphSchema = z.object({ nodes: z.array(node).max(60), edges: z.array(edge).max(120) });

export const flowSettingsSchema = z
  .object({
    name: z.string().trim().min(1, "Give the flow a name.").max(120),
    trigger: z.enum(["chapter_80", "chapter_completed"]),
    courseId: z.string().min(1).max(100).nullable(),
    discountPercent: z.number().int().min(1).max(90).nullable(),
    discountValidDays: z.number().int().min(1).max(90).nullable(),
  })
  .refine((s) => (s.discountPercent === null) === (s.discountValidDays === null), { message: "Set both the discount and how long the code lasts, or neither." });

export type FlowSettings = z.infer<typeof flowSettingsSchema>;

export function parseGraph(input: unknown): { ok: true; graph: FlowGraph } | { ok: false; error: string } {
  const parsed = graphSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "The flow couldn't be read. Refresh the page and try again." };
  return { ok: true, graph: parsed.data as FlowGraph };
}
