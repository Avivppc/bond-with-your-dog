import { describe, expect, test } from "vitest";
import { countOutcomes, mapInChunks } from "./summary";

test("countOutcomes tallies each outcome", () => {
  expect(countOutcomes(["sent", "sent", "already_sent", "failed"], 1)).toEqual({ notified: 2, alreadySent: 1, failed: 1, emailed: 1 });
  expect(countOutcomes([])).toEqual({ notified: 0, alreadySent: 0, failed: 0, emailed: 0 });
});

describe("mapInChunks", () => {
  test("keeps input order and never runs more than the chunk size at once", async () => {
    let running = 0;
    let peak = 0;
    const out = await mapInChunks([1, 2, 3, 4, 5], 2, async (n) => {
      running += 1;
      peak = Math.max(peak, running);
      await new Promise((r) => setTimeout(r, 5 - n));
      running -= 1;
      return n * 10;
    });
    expect(out).toEqual([10, 20, 30, 40, 50]);
    expect(peak).toBe(2);
  });

  test("handles empty input and silly sizes", async () => {
    expect(await mapInChunks([], 3, async (n: number) => n)).toEqual([]);
    expect(await mapInChunks([1, 2], 0, async (n) => n + 1)).toEqual([2, 3]);
  });
});
