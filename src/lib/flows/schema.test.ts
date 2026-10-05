import { describe, expect, it } from "vitest";
import { flowSettingsSchema, parseGraph } from "./schema";
import { FLOW_TEMPLATES } from "./templates";

describe("parseGraph", () => {
  it("accepts the templates", () => {
    for (const t of FLOW_TEMPLATES) expect(parseGraph(t.graph).ok).toBe(true);
  });

  it("rejects unknown step types and stray fields", () => {
    expect(parseGraph({ nodes: [{ id: "x", type: "webhook", position: { x: 0, y: 0 }, data: {} }], edges: [] }).ok).toBe(false);
    expect(parseGraph({ nodes: [{ id: "x", type: "exit", position: { x: 0, y: 0 }, data: { evil: 1 } }], edges: [] }).ok).toBe(false);
    expect(parseGraph({ nodes: [{ id: "bad id!", type: "exit", position: { x: 0, y: 0 }, data: {} }], edges: [] }).ok).toBe(false);
  });
});

describe("flowSettingsSchema", () => {
  const base = {
    name: "Moves upsell",
    trigger: "chapter_progress",
    triggerParams: { percent: 80 },
    offer: { kind: "next_chapter" },
    exits: [{ kind: "bought_offer" }],
    reentry: "each_time",
    discountPercent: 20,
    discountValidDays: 7,
    smartSendingHours: 16,
    quietHours: true,
  };
  it("needs discount % and validity together", () => {
    expect(flowSettingsSchema.safeParse(base).success).toBe(true);
    expect(flowSettingsSchema.safeParse({ ...base, discountPercent: null, discountValidDays: null }).success).toBe(true);
    expect(flowSettingsSchema.safeParse({ ...base, discountValidDays: null }).success).toBe(false);
  });

  it("needs a chapter when the flow offers a specific one, and a known trigger", () => {
    expect(flowSettingsSchema.safeParse({ ...base, offer: { kind: "chapter" } }).success).toBe(false);
    expect(flowSettingsSchema.safeParse({ ...base, trigger: "chapter_80" }).success).toBe(false);
  });
});
