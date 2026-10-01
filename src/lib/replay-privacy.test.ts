import { describe, expect, test } from "vitest";
import { maskReplayText, showsPrivateText } from "./replay-privacy";

describe("showsPrivateText", () => {
  test("pages with notes, replies, support messages or account details are private", () => {
    for (const path of ["/feedback", "/feedback/abc", "/studio", "/help", "/settings", "/profile", "/admin/inbox", "/admin/coaching/questions", "/admin/people/1"]) {
      expect(showsPrivateText(path)).toBe(true);
    }
  });

  test("lessons, practice and the public site stay readable in replays", () => {
    for (const path of ["/", "/quiz", "/learn/c/l", "/practice", "/moves", "/home", "/feedback-tips"]) {
      expect(showsPrivateText(path)).toBe(false);
    }
  });
});

describe("maskReplayText", () => {
  test("masks text on a private page and keeps its length", () => {
    expect(maskReplayText("Luna limps a bit", "/feedback/1")).toBe("****************");
  });

  test("leaves text alone elsewhere", () => {
    expect(maskReplayText("Step 2: Spin", "/practice")).toBe("Step 2: Spin");
  });
});
