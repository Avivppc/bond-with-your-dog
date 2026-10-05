import { describe, expect, it } from "vitest";
import { isWatchRequired, minutesLeftToWatch, playbackErrorMessage, playedEnough, playedStep, watchedEnough } from "./watch";

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

describe("playedStep", () => {
  it("counts normal playback between two time updates, including fast playback", () => {
    expect(playedStep(10, 10.25)).toBeCloseTo(0.25);
    expect(playedStep(10, 12)).toBe(2);
  });

  it("ignores seeks forward or back and a paused clock", () => {
    expect(playedStep(10, 80)).toBe(0);
    expect(playedStep(80, 10)).toBe(0);
    expect(playedStep(10, 10)).toBe(0);
  });
});

describe("playedEnough", () => {
  it("needs 80% of the video actually played", () => {
    expect(playedEnough(80, 100)).toBe(true);
    expect(playedEnough(79, 100)).toBe(false);
  });

  it("asks nothing when the length is unknown", () => {
    expect(playedEnough(0, null)).toBe(true);
    expect(playedEnough(0, 0)).toBe(true);
  });
});

describe("minutesLeftToWatch", () => {
  it("rounds the remaining watch time up to whole minutes", () => {
    expect(minutesLeftToWatch(0, 300)).toBe(4);
    expect(minutesLeftToWatch(230, 300)).toBe(1);
    expect(minutesLeftToWatch(240, 300)).toBe(0);
  });
});

describe("isWatchRequired", () => {
  it("recognises the database's refusal", () => {
    expect(isWatchRequired({ hint: "watch_required", message: "watch the lesson video first" })).toBe(true);
    expect(isWatchRequired({ hint: "", message: "no access" })).toBe(false);
    expect(isWatchRequired(null)).toBe(false);
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
