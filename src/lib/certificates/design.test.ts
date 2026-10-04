import { describe, expect, it } from "vitest";
import { certificateText, DEFAULT_CERTIFICATE_DESIGN, readCertificateDesign } from "./design";

describe("readCertificateDesign", () => {
  it("fills anything missing with the defaults", () => {
    expect(readCertificateDesign(null)).toEqual(DEFAULT_CERTIFICATE_DESIGN);
    expect(readCertificateDesign({ signerName: "Roni" }).signerName).toBe("Roni");
  });

  it("keeps the valid fields of a partly broken save", () => {
    const design = readCertificateDesign({ title: "Well done", accentColor: "red" });
    expect(design.title).toBe("Well done");
    expect(design.accentColor).toBe(DEFAULT_CERTIFICATE_DESIGN.accentColor);
  });
});

describe("certificateText", () => {
  const facts = { studentName: "Dana", dogName: "Rhythm", lessons: 26 };

  it("names the dog and counts the lessons by default", () => {
    expect(certificateText(DEFAULT_CERTIFICATE_DESIGN, facts)).toEqual({ recipient: "Dana & Rhythm", line: "have completed all 26 lessons of" });
  });

  it("follows the switches and the completion wording", () => {
    const design = { ...DEFAULT_CERTIFICATE_DESIGN, showDogName: false, showLessonCount: false, completedText: "successfully finished" };
    expect(certificateText(design, facts)).toEqual({ recipient: "Dana", line: "has successfully finished" });
  });

  it("says 'has' when there is no dog name", () => {
    expect(certificateText(DEFAULT_CERTIFICATE_DESIGN, { ...facts, dogName: null }).line).toBe("has completed all 26 lessons of");
  });
});
