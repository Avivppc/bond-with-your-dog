import { describe, expect, it } from "vitest";
import { fromWithName } from "./sender";

describe("fromWithName", () => {
  it("keeps the verified address and swaps the display name", () => {
    expect(fromWithName("Bonded <hello@bonded.dog>", "Roni from Bonded")).toBe('"Roni from Bonded" <hello@bonded.dog>');
    expect(fromWithName("hello@bonded.dog", "Roni")).toBe('"Roni" <hello@bonded.dog>');
  });

  it("strips characters that would break the header", () => {
    expect(fromWithName("hello@bonded.dog", 'Roni "the" <trainer>\r\n')).toBe('"Roni the trainer" <hello@bonded.dog>');
  });

  it("falls back to the configured sender when there's no name", () => {
    expect(fromWithName("Bonded <hello@bonded.dog>", "  ")).toBe("Bonded <hello@bonded.dog>");
  });
});
