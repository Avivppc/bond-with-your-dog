import { describe, expect, it } from "vitest";
import { blockId, campaignStarterDoc, emailDocFromNodeData, isEmailDoc, legacyEmailToDoc, newBlock, newCampaignBlock, starterDoc } from "./defaults";
import type { EmailBlockType } from "./types";

const TYPES: EmailBlockType[] = ["heading", "text", "button", "image", "code", "quote", "divider", "spacer"];

describe("blockId / newBlock", () => {
  it("makes distinct ids", () => {
    const ids = new Set(Array.from({ length: 50 }, blockId));
    expect(ids.size).toBe(50);
  });

  it("creates every block type with valid defaults", () => {
    for (const type of TYPES) {
      const block = newBlock(type, "x1");
      expect(block.type).toBe(type);
      expect(block.id).toBe("x1");
      expect(isEmailDoc({ subject: "", preheader: "", blocks: [block] })).toBe(true);
    }
  });

  it("uses the spec defaults", () => {
    expect(newBlock("button")).toMatchObject({ url: "{{offer_url}}", color: "#0e666a" });
    expect(newBlock("code").title).toBe("Your member code");
    expect(newBlock("spacer").size).toBe(24);
    expect(newBlock("image").width).toBe(100);
  });

  it("gives the starter doc unique ids and a code block", () => {
    const doc = starterDoc();
    expect(isEmailDoc(doc)).toBe(true);
    expect(doc.blocks.map((b) => b.type)).toEqual(["heading", "text", "code", "button"]);
    expect(new Set(doc.blocks.map((b) => b.id)).size).toBe(4);
  });

  it("starts a campaign without the member code or offer tags", () => {
    const doc = campaignStarterDoc();
    expect(isEmailDoc(doc)).toBe(true);
    expect(doc.subject).toBe("");
    expect(doc.blocks.map((b) => b.type)).toEqual(["heading", "text", "button"]);
    expect(JSON.stringify(doc)).not.toMatch(/next_chapter|offer_url|discount/);
  });

  it("makes campaign buttons open the app", () => {
    expect(newCampaignBlock("button")).toMatchObject({ type: "button", url: "{{app_url}}", label: "Open Bonded" });
    expect(newCampaignBlock("heading").type).toBe("heading");
  });
});

describe("legacyEmailToDoc", () => {
  it("turns body and CTA into a text block and an offer button", () => {
    const doc = legacyEmailToDoc({ subject: "Hi", preheader: "Pre", body: "Para one\n\nPara two", ctaLabel: " Get Moves " });
    expect(doc.subject).toBe("Hi");
    expect(doc.preheader).toBe("Pre");
    expect(doc.blocks).toEqual([
      { id: "legacy-text", type: "text", text: "Para one\n\nPara two", align: "left" },
      { id: "legacy-button", type: "button", label: "Get Moves", url: "{{offer_url}}", align: "left", color: "#0e666a" },
    ]);
  });

  it("adds a code block when the body mentions the discount code", () => {
    const doc = legacyEmailToDoc({ subject: "", preheader: "", body: "Use {{ discount_code }} today", ctaLabel: "Buy" });
    expect(doc.blocks.map((b) => b.type)).toEqual(["text", "code", "button"]);
  });

  it("skips empty body and empty CTA", () => {
    expect(legacyEmailToDoc({ subject: "S", preheader: "", body: "  ", ctaLabel: "" }).blocks).toEqual([]);
  });
});

describe("isEmailDoc / emailDocFromNodeData", () => {
  it("rejects malformed docs", () => {
    expect(isEmailDoc(null)).toBe(false);
    expect(isEmailDoc({ subject: "", preheader: "", blocks: [{ id: "a", type: "heading", text: "", level: 3, align: "left" }] })).toBe(false);
    expect(isEmailDoc({ subject: "", preheader: "", blocks: [{ id: "a", type: "video" }] })).toBe(false);
    expect(isEmailDoc({ subject: "", blocks: [] })).toBe(false);
  });

  it("returns a valid block doc unchanged", () => {
    const doc = starterDoc();
    expect(emailDocFromNodeData(doc)).toBe(doc);
  });

  it("keeps the valid blocks of a partly broken block doc", () => {
    const out = emailDocFromNodeData({ subject: "S", blocks: [{ id: "a", type: "divider" }, { id: "b", type: "nope" }, "x"] });
    expect(out).toEqual({ subject: "S", preheader: "", blocks: [{ id: "a", type: "divider" }] });
  });

  it("converts legacy flow-step data", () => {
    const out = emailDocFromNodeData({ kind: "email", subject: "Hello", preheader: "P", body: "Body {{discount_code}}", ctaLabel: "Go" });
    expect(out.subject).toBe("Hello");
    expect(out.blocks.map((b) => b.type)).toEqual(["text", "code", "button"]);
  });

  it("never throws on junk", () => {
    expect(emailDocFromNodeData(undefined)).toEqual({ subject: "", preheader: "", blocks: [] });
    expect(emailDocFromNodeData(42)).toEqual({ subject: "", preheader: "", blocks: [] });
  });
});

describe("emailDocFromNodeData picture", () => {
  it("keeps a valid per-email picture and drops an unknown one", () => {
    const base = { subject: "S", preheader: "", blocks: [] };
    expect(emailDocFromNodeData({ ...base, art: "sketch" }).art).toBe("sketch");
    expect(emailDocFromNodeData({ ...base, art: "banana" }).art).toBeUndefined();
    expect(emailDocFromNodeData({ subject: "S", preheader: "", blocks: [{ id: "a", type: "divider" }, "junk"], art: "none" }).art).toBe("none");
  });
});
