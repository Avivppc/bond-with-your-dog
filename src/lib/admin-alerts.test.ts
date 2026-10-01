import { describe, expect, test } from "vitest";
import { buildAdminAlerts, badgeLabel } from "./admin-alerts";

const ZERO = { videos: 0, replies: 0, lessonQuestions: 0, liveQuestions: 0, postsToReview: 0, inbox: 0 };

describe("buildAdminAlerts", () => {
  test("lists only what needs attention, coaching first, and totals it", () => {
    const { items, total } = buildAdminAlerts({ ...ZERO, videos: 2, lessonQuestions: 1, inbox: 4 });
    expect(items.map((i) => [i.key, i.count, i.href])).toEqual([
      ["videos", 2, "/studio"],
      ["lessonQuestions", 1, "/admin/coaching/questions"],
      ["inbox", 4, "/admin/inbox"],
    ]);
    expect(total).toBe(7);
  });

  test("uses singular labels for one item", () => {
    const { items } = buildAdminAlerts({ ...ZERO, videos: 1, replies: 1, liveQuestions: 1, postsToReview: 1 });
    expect(items.map((i) => i.label)).toEqual(["1 video to review", "1 member wrote back on a video", "1 Live Q&A question", "1 community post to review"]);
  });

  test("leaves the inbox out when the viewer can't see it (null)", () => {
    const { items, total } = buildAdminAlerts({ ...ZERO, inbox: null });
    expect(items).toEqual([]);
    expect(total).toBe(0);
  });
});

test("badgeLabel caps at 99+", () => {
  expect(badgeLabel(0)).toBeNull();
  expect(badgeLabel(7)).toBe("7");
  expect(badgeLabel(120)).toBe("99+");
});
