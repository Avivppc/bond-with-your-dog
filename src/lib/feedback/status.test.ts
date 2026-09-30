import { describe, expect, test } from "vitest";
import { feedbackCountsLine, feedbackPill, inTab, isOverdue, parseFeedbackTab } from "./status";

describe("feedbackPill", () => {
  test("shows the design's pills", () => {
    expect(feedbackPill({ status: "replied", member_read_at: null })).toEqual({ tone: "reliable", label: "Feedback ready" });
    expect(feedbackPill({ status: "replied", member_read_at: "2026-09-27T10:00:00Z" })).toEqual({ tone: "neutral", label: "Read" });
    expect(feedbackPill({ status: "waiting", member_read_at: null })).toEqual({ tone: "learning", label: "In review" });
    expect(feedbackPill({ status: "uploading", member_read_at: null }).label).toBe("Processing");
    expect(feedbackPill({ status: "errored", member_read_at: null }).tone).toBe("danger");
  });
});

describe("tabs", () => {
  test("parses the tab query parameter safely", () => {
    expect(parseFeedbackTab("waiting")).toBe("waiting");
    expect(parseFeedbackTab(["replied"])).toBe("replied");
    expect(parseFeedbackTab("nope")).toBe("all");
    expect(parseFeedbackTab(undefined)).toBe("all");
  });

  test("waiting includes videos still processing", () => {
    expect(inTab("uploading", "waiting")).toBe(true);
    expect(inTab("waiting", "waiting")).toBe(true);
    expect(inTab("replied", "waiting")).toBe(false);
    expect(inTab("replied", "replied")).toBe(true);
    expect(inTab("errored", "all")).toBe(true);
  });
});

test("feedbackCountsLine counts sent videos and Roni's replies", () => {
  expect(feedbackCountsLine(["replied", "replied", "waiting"])).toBe("3 sent · 2 replies from Roni");
  expect(feedbackCountsLine(["replied", "errored"])).toBe("1 sent · 1 reply from Roni");
  expect(feedbackCountsLine([])).toBe("0 sent · 0 replies from Roni");
});

test("isOverdue after two days in the queue", () => {
  const now = new Date("2026-10-01T12:00:00Z");
  expect(isOverdue("2026-09-30T12:00:00Z", now)).toBe(false);
  expect(isOverdue("2026-09-28T11:00:00Z", now)).toBe(true);
});
