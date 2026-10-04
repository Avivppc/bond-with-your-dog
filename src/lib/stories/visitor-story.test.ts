import { describe, expect, it } from "vitest";
import { visitorStorySchema, visitorStorySubject } from "./visitor-story";

const VALID = {
  name: "Dana Levi",
  email: "dana@example.com",
  dogName: "Rhythm",
  chapter: "Foundations",
  story: "Rhythm learned to spin and we both smile more on our walks.",
  consent: true,
} as const;

describe("visitorStorySchema", () => {
  it("accepts a complete story and defaults the optional parts", () => {
    const parsed = visitorStorySchema.parse({ ...VALID, dogName: undefined, chapter: undefined });
    expect(parsed.dogName).toBe("");
    expect(parsed.chapter).toBeNull();
    expect(parsed.mediaPaths).toEqual([]);
  });

  it("needs permission to share, since that's the point of the form", () => {
    expect(visitorStorySchema.safeParse({ ...VALID, consent: false }).success).toBe(false);
  });

  it("keeps links out of names", () => {
    expect(visitorStorySchema.safeParse({ ...VALID, name: "http://spam.example" }).success).toBe(false);
    expect(visitorStorySchema.safeParse({ ...VALID, dogName: "www.spam.example/x" }).success).toBe(false);
  });

  it("asks for a few sentences and a real email", () => {
    expect(visitorStorySchema.safeParse({ ...VALID, story: "Great!" }).success).toBe(false);
    expect(visitorStorySchema.safeParse({ ...VALID, email: "not-an-email" }).success).toBe(false);
  });

  it("allows at most 3 different photos", () => {
    expect(visitorStorySchema.safeParse({ ...VALID, mediaPaths: ["a", "b", "c", "d"] }).success).toBe(false);
    expect(visitorStorySchema.safeParse({ ...VALID, mediaPaths: ["a", "a"] }).success).toBe(false);
  });
});

describe("visitorStorySubject", () => {
  it("names the member, the dog and the chapter when given", () => {
    expect(visitorStorySubject({ name: "Dana", dogName: "Rhythm", chapter: "Moves" })).toBe("Dana & Rhythm · Moves");
    expect(visitorStorySubject({ name: "Dana", dogName: "", chapter: null })).toBe("Dana");
  });
});
