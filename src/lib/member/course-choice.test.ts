import { describe, expect, test } from "vitest";
import type { CourseCardData } from "./courses";
import { chapterChoices, defaultChoiceId, toCourseChoice, unlockLabel, unlockSentence } from "./course-choice";

const foundations = { id: "foundations", chapterNumber: 1, owned: false };
const moves = { id: "moves", chapterNumber: 2, owned: false };
const letsDance = { id: "lets-dance", chapterNumber: 3, owned: false };

describe("defaultChoiceId", () => {
  test("starts new members on the first chapter (Foundations)", () => {
    expect(defaultChoiceId([moves, letsDance, foundations], null)).toBe("foundations");
  });

  test("keeps the member's own pick when it is still offered", () => {
    expect(defaultChoiceId([foundations, moves, letsDance], "moves")).toBe("moves");
  });

  test("ignores a pick that is no longer published", () => {
    expect(defaultChoiceId([foundations, moves], "retired-course")).toBe("foundations");
  });

  test("prefers a course the member already owns (e.g. moved over from Kajabi)", () => {
    expect(defaultChoiceId([foundations, { ...moves, owned: true }, letsDance], null)).toBe("moves");
  });

  test("puts courses without a chapter number last", () => {
    expect(defaultChoiceId([{ id: "extra", chapterNumber: null, owned: false }, moves], null)).toBe("moves");
  });

  test("returns null when nothing is published", () => {
    expect(defaultChoiceId([], null)).toBeNull();
  });
});

describe("chapterChoices", () => {
  const demo = { id: "demo", chapterNumber: null, owned: false };

  test("shows only the numbered chapters, in order", () => {
    expect(chapterChoices([letsDance, demo, foundations, moves]).map((c) => c.id)).toEqual(["foundations", "moves", "lets-dance"]);
  });

  test("keeps a course the member owns even without a chapter number", () => {
    const ownedDemo = { ...demo, owned: true };
    expect(chapterChoices([foundations, ownedDemo]).map((c) => c.id)).toEqual(["foundations", "demo"]);
  });

  test("falls back to every published course before the chapters are published", () => {
    expect(chapterChoices([demo, { ...demo, id: "demo-2" }]).map((c) => c.id)).toEqual(["demo", "demo-2"]);
  });
});

describe("unlock copy", () => {
  test("free courses invite the member to start now", () => {
    expect(unlockLabel({ price: "Free", free: true })).toBe("Start for free");
    expect(unlockSentence({ price: "Free", free: true })).toContain("free");
  });

  test("paid courses show the price", () => {
    expect(unlockLabel({ price: "$149", free: false })).toBe("Get it · $149");
    expect(unlockSentence({ price: "$149", free: false })).toContain("$149");
  });

  test("courses without an offer say they open soon", () => {
    expect(unlockSentence(null)).toBe("It opens soon.");
  });
});

describe("toCourseChoice", () => {
  const lesson = { id: "l1", title: "Hello", thumbnail_url: null };
  const card = (status: CourseCardData["status"]): CourseCardData =>
    ({
      id: "moves",
      title: "Bonded: Moves",
      description: "d",
      image: null,
      chapterNumber: 2,
      status,
      lockedByTitle: "Bonded: Foundations",
      course: { course: { id: "moves", image: null }, lessons: [lesson], progress: { next: lesson } },
      moveNames: [],
      offers: [],
    }) as unknown as CourseCardData;

  test("links an owned, open course to its next lesson", () => {
    expect(toCourseChoice(card("not_started")).firstLesson).toEqual({ title: "Hello", href: "/learn/moves/l1", number: 1, image: null });
  });

  test("gives no lesson link to an owned chapter still locked behind an earlier one", () => {
    const choice = toCourseChoice(card("locked"));
    expect(choice.owned).toBe(true);
    expect(choice.firstLesson).toBeNull();
    expect(choice.lockedByTitle).toBe("Bonded: Foundations");
  });
});
