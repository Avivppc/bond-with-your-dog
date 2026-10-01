import { describe, expect, it } from "vitest";
import { chapterUrl, ChaptersSchema, formatChapters, formatTimestamp, parseChapters, parseStoredChapters, parseTimestamp } from "./chapters";

describe("formatTimestamp", () => {
  it("shows m:ss under an hour and h:mm:ss after", () => {
    expect(formatTimestamp(0)).toBe("0:00");
    expect(formatTimestamp(90)).toBe("1:30");
    expect(formatTimestamp(3725)).toBe("1:02:05");
  });
});

describe("parseTimestamp", () => {
  it("reads m:ss, mm:ss and h:mm:ss", () => {
    expect(parseTimestamp("1:30")).toBe(90);
    expect(parseTimestamp("75:00")).toBe(4500);
    expect(parseTimestamp("1:02:05")).toBe(3725);
  });

  it("rejects out-of-range parts and non-times", () => {
    expect(parseTimestamp("1:60")).toBeNull();
    expect(parseTimestamp("1:60:00")).toBeNull();
    expect(parseTimestamp("90")).toBeNull();
    expect(parseTimestamp("a:bc")).toBeNull();
  });
});

describe("parseChapters", () => {
  it("parses one chapter per line, skipping blanks and sorting by time", () => {
    const res = parseChapters("12:00 Your questions\n\n0:00 Welcome\n1:30 - Loose-lead walking\r\n1:02:05 | Wrap-up");
    expect(res).toEqual({
      ok: true,
      chapters: [
        { t: 0, title: "Welcome" },
        { t: 90, title: "Loose-lead walking" },
        { t: 720, title: "Your questions" },
        { t: 3725, title: "Wrap-up" },
      ],
    });
  });

  it("treats an empty box as no chapters", () => {
    expect(parseChapters("  \n ")).toEqual({ ok: true, chapters: [] });
  });

  it("names the line that has no time or no title", () => {
    expect(parseChapters("0:00 Welcome\nIntro")).toEqual({ ok: false, error: "Line 2: start with a time like 1:30, then the title." });
    expect(parseChapters("0:45")).toEqual({ ok: false, error: "Line 1: add a title after the time." });
  });

  it("rejects duplicate timestamps, long titles, late starts and too many chapters", () => {
    expect(parseChapters("1:00 A\n1:00 B")).toEqual({ ok: false, error: "Two chapters start at 1:00." });
    expect(parseChapters(`1:00 ${"x".repeat(121)}`).ok).toBe(false);
    expect(parseChapters("10:00:01 Too late").ok).toBe(false);
    const many = Array.from({ length: 51 }, (_, i) => `${i}:00 Chapter ${i}`).join("\n");
    expect(parseChapters(many)).toEqual({ ok: false, error: "Up to 50 chapters." });
  });

  it("round-trips through formatChapters", () => {
    const text = "0:00 Welcome\n1:30 Loose-lead walking\n1:02:05 Wrap-up";
    const res = parseChapters(text);
    expect(res.ok && formatChapters(res.chapters)).toBe(text);
  });
});

describe("ChaptersSchema / parseStoredChapters", () => {
  it("accepts what parseChapters produces", () => {
    const res = parseChapters("0:00 Welcome\n1:30 Walking");
    expect(res.ok && ChaptersSchema.safeParse(res.chapters).success).toBe(true);
  });

  it("drops malformed stored data", () => {
    expect(parseStoredChapters([{ t: 30, title: "B" }, { t: 10, title: "A" }])).toEqual([]);
    expect(parseStoredChapters([{ t: 1.5, title: "A" }])).toEqual([]);
    expect(parseStoredChapters([{ t: 5, title: "A", extra: 1 }])).toEqual([]);
    expect(parseStoredChapters(null)).toEqual([]);
    expect(parseStoredChapters([{ t: 5, title: "A" }])).toEqual([{ t: 5, title: "A" }]);
  });
});

describe("chapterUrl", () => {
  it("uses ?t= seconds on YouTube, keeping other params", () => {
    expect(chapterUrl("https://www.youtube.com/watch?v=abc123", 90)).toBe("https://www.youtube.com/watch?v=abc123&t=90");
    expect(chapterUrl("https://youtu.be/abc123?t=5", 3725)).toBe("https://youtu.be/abc123?t=3725");
  });

  it("uses #t=1m30s on Vimeo", () => {
    expect(chapterUrl("https://vimeo.com/123456789", 90)).toBe("https://vimeo.com/123456789#t=1m30s");
    expect(chapterUrl("https://vimeo.com/123456789/abcdef1234", 3725)).toBe("https://vimeo.com/123456789/abcdef1234#t=1h2m5s");
    expect(chapterUrl("https://player.vimeo.com/video/123456789?h=abc#t=10s", 0)).toBe("https://player.vimeo.com/video/123456789?h=abc#t=0s");
  });

  it("falls back to a media fragment elsewhere and leaves bad links alone", () => {
    expect(chapterUrl("https://example.com/recording.mp4", 90)).toBe("https://example.com/recording.mp4#t=90");
    expect(chapterUrl("not a url", 90)).toBe("not a url");
  });
});
