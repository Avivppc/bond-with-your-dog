import { describe, expect, test } from "vitest";
import { currentNoteId, formatClock, formatTimer, markerPercent, muxThumbnailUrl, noteMarkers, plural, splitSummary } from "./format";

describe("formatClock", () => {
  test("formats seconds as m:ss and h:mm:ss", () => {
    expect(formatClock(4)).toBe("0:04");
    expect(formatClock(75.9)).toBe("1:15");
    expect(formatClock(3723)).toBe("1:02:03");
  });

  test("treats missing or negative values as zero", () => {
    expect(formatClock(null)).toBe("0:00");
    expect(formatClock(-3)).toBe("0:00");
    expect(formatClock(Number.NaN)).toBe("0:00");
  });
});

test("formatTimer pads minutes like the design's player", () => {
  expect(formatTimer(4)).toBe("00:04");
  expect(formatTimer(75)).toBe("01:15");
  expect(formatTimer(undefined)).toBe("00:00");
});

describe("markerPercent", () => {
  test("places a note proportionally along the clip", () => {
    expect(markerPercent(4, 34)).toBe(11.76);
    expect(markerPercent(17, 34)).toBe(50);
  });

  test("clamps to the bar and handles an unknown duration", () => {
    expect(markerPercent(40, 34)).toBe(100);
    expect(markerPercent(-2, 34)).toBe(0);
    expect(markerPercent(5, 0)).toBe(0);
    expect(markerPercent(5, null)).toBe(0);
  });
});

describe("noteMarkers", () => {
  test("returns one marker per note in time order", () => {
    const notes = [
      { id: "b", at_seconds: 19, body: "reward" },
      { id: "a", at_seconds: 4, body: "lure" },
    ];
    expect(noteMarkers(notes, 38)).toEqual([
      { id: "a", percent: 10.53, label: "0:04" },
      { id: "b", percent: 50, label: "0:19" },
    ]);
  });
});

describe("currentNoteId", () => {
  const notes = [
    { id: "a", at_seconds: 4, body: "" },
    { id: "b", at_seconds: 11, body: "" },
  ];

  test("is null before the first note and follows the playhead after", () => {
    expect(currentNoteId(notes, 1)).toBeNull();
    expect(currentNoteId(notes, 4)).toBe("a");
    expect(currentNoteId(notes, 10.9)).toBe("b");
    expect(currentNoteId(notes, 30)).toBe("b");
  });
});

describe("muxThumbnailUrl", () => {
  test("builds a Mux image URL, optionally at a moment", () => {
    expect(muxThumbnailUrl("abc")).toBe("https://image.mux.com/abc/thumbnail.jpg?width=480");
    expect(muxThumbnailUrl("abc", 7.6)).toBe("https://image.mux.com/abc/thumbnail.jpg?width=480&time=7");
  });
});

test("splitSummary separates the headline sentence", () => {
  expect(splitSummary("Beautiful rhythm. Now slow the cue down. Try the notes.")).toEqual({
    headline: "Beautiful rhythm.",
    rest: "Now slow the cue down. Try the notes.",
  });
  expect(splitSummary("Lovely work")).toEqual({ headline: "Lovely work", rest: "" });
  expect(splitSummary(null)).toEqual({ headline: "", rest: "" });
});

test("plural picks the right noun", () => {
  expect(plural(1, "note")).toBe("1 note");
  expect(plural(3, "note")).toBe("3 notes");
  expect(plural(2, "reply", "replies")).toBe("2 replies");
});
