import { describe, expect, it } from "vitest";
import { EXAMPLE_VARS, fillTags } from "./template";

describe("fillTags", () => {
  it("fills known tags, tolerating spaces, and blanks unknown ones", () => {
    expect(fillTags("Hi {{ first_name }}, {{dog_name}} is ready{{nope}}!", EXAMPLE_VARS)).toBe("Hi Dana, Luna is ready!");
  });
});
