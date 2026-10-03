import { describe, expect, it } from "vitest";
import { validateGraph } from "./graph";
import { FLOW_TEMPLATES, newNode } from "./templates";
import { FLOW_TAGS } from "./template";
import { parseGraph } from "./schema";

const tagsIn = (value: unknown): string[] => [...JSON.stringify(value).matchAll(/\{\{\s*([a-z_]+)\s*\}\}/g)].map((m) => m[1]);

describe("flow templates", () => {
  it.each(FLOW_TEMPLATES.map((t) => [t.key, t] as const))("%s is ready to go live as-is", (_, template) => {
    expect(validateGraph(template.graph)).toEqual([]);
    expect(parseGraph(template.graph).ok).toBe(true);
  });

  it("only uses tags the editor knows", () => {
    const known = new Set<string>(FLOW_TAGS.map((t) => t.tag));
    for (const template of FLOW_TEMPLATES) for (const tag of tagsIn(template.graph)) expect(known.has(tag)).toBe(true);
  });

  it("gives every block a unique id", () => {
    const ids = FLOW_TEMPLATES.flatMap((t) => t.graph.nodes.flatMap((n) => (n.type === "email" && "blocks" in n.data ? n.data.blocks.map((b) => b.id) : [])));
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("newNode", () => {
  it("creates steps with sensible defaults", () => {
    expect(newNode("wait", "w", { x: 1, y: 2 })).toEqual({ id: "w", type: "wait", position: { x: 1, y: 2 }, data: { days: 2, hours: 0 } });
    expect(newNode("split", "s", { x: 0, y: 0 }).data).toEqual({ percentA: 50 });
  });
});
