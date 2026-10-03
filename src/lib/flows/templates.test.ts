import { describe, expect, it } from "vitest";
import { validateGraph } from "./graph";
import { FLOW_TEMPLATES, newNode } from "./templates";
import { FLOW_TAGS } from "./template";

describe("flow templates", () => {
  it.each(FLOW_TEMPLATES.map((t) => [t.key, t] as const))("%s is ready to go live as-is", (_, template) => {
    expect(validateGraph(template.graph)).toEqual([]);
  });

  it("only uses tags the editor knows", () => {
    const known = new Set(FLOW_TAGS.map((t) => t.tag));
    for (const template of FLOW_TEMPLATES) {
      for (const node of template.graph.nodes) {
        if (node.type !== "email") continue;
        const text = `${node.data.subject} ${node.data.preheader} ${node.data.body} ${node.data.ctaLabel}`;
        for (const [, tag] of text.matchAll(/\{\{\s*([a-z_]+)\s*\}\}/g)) expect(known.has(tag as never)).toBe(true);
      }
    }
  });
});

describe("newNode", () => {
  it("creates steps with sensible defaults", () => {
    expect(newNode("wait", "w", { x: 1, y: 2 })).toEqual({ id: "w", type: "wait", position: { x: 1, y: 2 }, data: { days: 2, hours: 0 } });
    expect(newNode("split", "s", { x: 0, y: 0 }).data).toEqual({ percentA: 50 });
  });
});
