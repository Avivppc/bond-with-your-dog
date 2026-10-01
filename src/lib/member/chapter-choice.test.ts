import { describe, expect, it } from "vitest";
import { chapterChoice } from "./chapter-choice";

const base = { courseId: "bonded-foundations", ctaLabel: "Start with Foundations", published: true, owned: false, offer: null, requiresTitle: null };

describe("chapterChoice", () => {
  it("sends members who own the chapter into it", () => {
    expect(chapterChoice({ ...base, owned: true })).toEqual({ kind: "owned", href: "/learn/bonded-foundations", label: "Continue" });
  });

  it("offers the published offer with its price", () => {
    expect(chapterChoice({ ...base, offer: { slug: "foundations", price: "$149" } })).toEqual({
      kind: "buy",
      href: "/checkout/foundations",
      label: "Start with Foundations · $149",
    });
  });

  it("lets members look inside a published chapter that has no offer yet", () => {
    expect(chapterChoice(base)).toEqual({ kind: "preview", href: "/learn/bonded-foundations", label: "Preview the chapter" });
  });

  it("shows a draft chapter as opening soon, with nothing to click", () => {
    expect(chapterChoice({ ...base, published: false, offer: { slug: "foundations", price: "$149" } })).toEqual({ kind: "soon", href: null, label: "Opening soon" });
  });

  it("explains the chapter order", () => {
    expect(chapterChoice({ ...base, requiresTitle: "Bonded: Foundations" }).note).toBe("Best after Bonded: Foundations");
    expect(chapterChoice(base).note).toBeUndefined();
  });
});
