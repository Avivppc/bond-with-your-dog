import { describe, expect, test } from "vitest";
import { reachedMilestones } from "./video-milestones";

describe("reachedMilestones", () => {
  test("reports every quarter passed that wasn't reported yet", () => {
    expect(reachedMilestones(30, 100, new Set())).toEqual([25]);
    expect(reachedMilestones(80, 100, new Set([25]))).toEqual([50, 75]);
  });

  test("a seek far ahead reports all the quarters it skipped", () => {
    expect(reachedMilestones(76, 100, new Set())).toEqual([25, 50, 75]);
  });

  test("nothing new once reported", () => {
    expect(reachedMilestones(60, 100, new Set([25, 50]))).toEqual([]);
  });

  test("100% is left to the ended event, so a near-finish never counts as finished", () => {
    expect(reachedMilestones(99.5, 100, new Set([25, 50, 75]))).toEqual([]);
  });

  test("an unknown or zero duration reports nothing", () => {
    expect(reachedMilestones(30, 0, new Set())).toEqual([]);
    expect(reachedMilestones(30, Number.NaN, new Set())).toEqual([]);
  });
});
