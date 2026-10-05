import { describe, expect, it } from "vitest";
import { cleanExit, exitProblems, exitReasonLabel, exitsOf } from "./exits";

describe("exitsOf", () => {
  it("reads the saved list and drops unknown kinds", () => {
    expect(exitsOf([{ kind: "practiced" }, { kind: "nope" }, null], null)).toEqual([{ kind: "practiced" }]);
  });

  it("turns an older flow's single goal into the list", () => {
    expect(exitsOf(undefined, { kind: "bought_offer" })).toEqual([{ kind: "bought_offer" }]);
    expect(exitsOf(null, { kind: "none" })).toEqual([]);
  });
});

describe("exitProblems", () => {
  it("needs a chapter or a tag where the kind asks for one", () => {
    expect(exitProblems([{ kind: "owns_chapter" }])).toEqual(["An exit about a chapter needs the chapter picked."]);
    expect(exitProblems([{ kind: "has_tag", tag: " " }])).toEqual(["An exit about a tag needs the tag."]);
    expect(exitProblems([{ kind: "has_tag", tag: "VIP" }, { kind: "completed_chapter", courseId: "moves" }])).toEqual([]);
  });
});

describe("cleanExit", () => {
  it("keeps only the fields a kind uses", () => {
    expect(cleanExit({ kind: "practiced", courseId: "x", tag: "y" })).toEqual({ kind: "practiced" });
    expect(cleanExit({ kind: "has_tag", tag: " VIP  Club " })).toEqual({ kind: "has_tag", tag: "vip club" });
  });
});

describe("exitReasonLabel", () => {
  it("says why someone left", () => {
    expect(exitReasonLabel("exit:any_purchase")).toBe("bought anything");
    expect(exitReasonLabel("removed")).toBe("removed by the team");
    expect(exitReasonLabel("goal")).toBe("reached the goal");
  });
});
