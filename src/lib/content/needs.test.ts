import { describe, expect, it } from "vitest";
import { NEED_ICONS, parseNeeds, readNeeds } from "./needs";

describe("parseNeeds", () => {
  it("pairs icons with labels and drops rows without a label", () => {
    const res = parseNeeds({ icons: ["cookie", "texture", "timer"], labels: ["Soft treats", " ", "10 minutes"] });
    expect(res).toEqual({
      ok: true,
      value: [
        { icon: "cookie", label: "Soft treats" },
        { icon: "timer", label: "10 minutes" },
      ],
    });
  });

  it("rejects icons outside the curated set", () => {
    const res = parseNeeds({ icons: ["delete"], labels: ["Something"] });
    expect(res.ok).toBe(false);
  });

  it("rejects long labels and too many rows", () => {
    expect(parseNeeds({ icons: ["cookie"], labels: ["x".repeat(81)] }).ok).toBe(false);
    const icons = Array.from({ length: 9 }, () => "pets");
    expect(parseNeeds({ icons, labels: icons.map((_, i) => `Item ${i}`) }).ok).toBe(false);
  });
});

describe("readNeeds", () => {
  it("keeps valid entries only", () => {
    expect(readNeeds([{ icon: "cookie", label: "Treats" }, { icon: "bad", label: "x" }, { icon: "pets" }, null])).toEqual([
      { icon: "cookie", label: "Treats" },
    ]);
  });

  it("offers the design's icons", () => {
    const icons = NEED_ICONS.map((n) => n.icon);
    expect(icons).toEqual(expect.arrayContaining(["cookie", "texture", "crop_free", "pets", "music_note", "timer"]));
  });
});
