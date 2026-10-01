import { describe, expect, it } from "vitest";
import { playbackErrorMessage, watchedEnough } from "./watch";

describe("watchedEnough", () => {
  it("counts a lesson as watched from 90% of its length", () => {
    expect(watchedEnough(261, 290)).toBe(true);
    expect(watchedEnough(260, 290)).toBe(false);
  });

  it("never completes when the length is unknown", () => {
    expect(watchedEnough(500, 0)).toBe(false);
    expect(watchedEnough(500, Number.NaN)).toBe(false);
  });
});

describe("playbackErrorMessage", () => {
  it("explains the common cases in plain words", () => {
    expect(playbackErrorMessage(401)).toMatch(/sign in/i);
    expect(playbackErrorMessage(403)).toMatch(/isn't open/i);
    expect(playbackErrorMessage(404)).toMatch(/on its way/i);
  });

  it("falls back to a retry message for anything else", () => {
    expect(playbackErrorMessage(500)).toMatch(/refresh/i);
  });
});
