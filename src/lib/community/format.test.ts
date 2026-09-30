import { describe, expect, it } from "vitest";
import { linkify, pollResults, timeAgo } from "./format";

describe("timeAgo", () => {
  const now = new Date("2026-10-01T12:00:00Z");
  it("uses short relative units, then a date", () => {
    expect(timeAgo("2026-10-01T11:59:40Z", now)).toBe("just now");
    expect(timeAgo("2026-10-01T11:15:00Z", now)).toBe("45m");
    expect(timeAgo("2026-10-01T07:00:00Z", now)).toBe("5h");
    expect(timeAgo("2026-09-28T12:00:00Z", now)).toBe("3d");
    expect(timeAgo("2026-08-01T12:00:00Z", now)).toBe("Aug 1");
    expect(timeAgo("2025-08-01T12:00:00Z", now)).toBe("Aug 1, 2025");
  });
});

describe("linkify", () => {
  it("splits text into plain parts and safe http(s) links", () => {
    expect(linkify("See https://bonded.dog/tips, ok?")).toEqual([
      { text: "See " },
      { text: "https://bonded.dog/tips", href: "https://bonded.dog/tips" },
      { text: ", ok?" },
    ]);
  });

  it("never turns other schemes into links", () => {
    expect(linkify("javascript:alert(1) and ftp://x")).toEqual([{ text: "javascript:alert(1) and ftp://x" }]);
  });
});

describe("pollResults", () => {
  it("adds counts and rounded percentages per option", () => {
    expect(pollResults(["Sit", "Spin", "Bow"], [{ option_index: 0, votes: 1 }, { option_index: 1, votes: 2 }])).toEqual({
      total: 3,
      options: [
        { label: "Sit", votes: 1, percent: 33 },
        { label: "Spin", votes: 2, percent: 67 },
        { label: "Bow", votes: 0, percent: 0 },
      ],
    });
  });

  it("handles a poll nobody voted on", () => {
    expect(pollResults(["A", "B"], []).options.map((o) => o.percent)).toEqual([0, 0]);
  });
});
