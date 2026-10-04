import { describe, expect, test } from "vitest";
import { isMemberPath } from "./member-paths";

describe("isMemberPath", () => {
  test("member pages and their children, not look-alikes or the website", () => {
    expect(isMemberPath("/home")).toBe(true);
    expect(isMemberPath("/learn/abc/def")).toBe(true);
    expect(isMemberPath("/homework")).toBe(false);
    expect(isMemberPath("/login")).toBe(false);
    expect(isMemberPath("/")).toBe(false);
    expect(isMemberPath("/courses")).toBe(false);
  });
});
