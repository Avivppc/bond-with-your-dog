import { describe, expect, it } from "vitest";
import { buildIcs, icsText } from "./ics";

describe("icsText", () => {
  it("escapes commas, semicolons, backslashes and newlines", () => {
    expect(icsText("Q&A; spins, focus\nand more\\")).toBe("Q&A\\; spins\\, focus\\nand more\\\\");
  });
});

describe("buildIcs", () => {
  const ics = buildIcs(
    { uid: "m1", title: "Winter Q&A", description: "Bring questions", url: "https://bonded.dog/community", start: new Date("2027-01-14T17:00:00Z"), durationMinutes: 60 },
    new Date("2026-10-01T00:00:00Z"),
  );
  it("has UTC start/end from the duration", () => {
    expect(ics).toContain("DTSTART:20270114T170000Z");
    expect(ics).toContain("DTEND:20270114T180000Z");
  });
  it("is a valid calendar envelope with CRLF line endings", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
    expect(ics).toContain("SUMMARY:Winter Q&A");
    expect(ics).not.toContain("LOCATION:");
  });
});
