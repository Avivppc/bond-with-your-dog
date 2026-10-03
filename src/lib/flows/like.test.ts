import { describe, expect, it } from "vitest";
import { exactLike } from "./like";

describe("exactLike", () => {
  it("escapes LIKE wildcards so an address only matches itself", () => {
    expect(exactLike("a_b%c@test.dev")).toBe("a\\_b\\%c@test.dev");
    expect(exactLike("back\\slash@test.dev")).toBe("back\\\\slash@test.dev");
  });

  it("leaves ordinary addresses alone", () => {
    expect(exactLike("Dana@Bonded.dog")).toBe("Dana@Bonded.dog");
  });
});
