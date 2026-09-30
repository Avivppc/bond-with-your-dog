import { describe, expect, it } from "vitest";
import { parseNeeds } from "./needs";

describe("parseNeeds", () => {
  it("keeps well-formed items and trims labels", () => {
    expect(parseNeeds([{ icon: "cookie", label: " Soft treats " }])).toEqual([{ icon: "cookie", label: "Soft treats" }]);
  });

  it("falls back to a check icon for unknown icon names", () => {
    expect(parseNeeds([{ icon: "<script>", label: "Mat" }])).toEqual([{ icon: "check", label: "Mat" }]);
  });

  it("drops items without a label and non-array input", () => {
    expect(parseNeeds([{ icon: "cookie" }, null, "x"])).toEqual([]);
    expect(parseNeeds({ icon: "cookie", label: "x" })).toEqual([]);
  });
});
