import { describe, expect, it } from "vitest";
import { DEFAULT_ART_SETTINGS, EMAIL_PHOTO_COUNT, EMAIL_SKETCHES, artForAudience, emailCard, pickEmailArt, readArtSettings } from "./email-art";

const SITE = "https://www.bonded.dog";
const DAY_MS = 86_400_000;
const day = (n: number) => new Date(Date.UTC(2026, 9, 1) + n * DAY_MS);

describe("pickEmailArt", () => {
  it("picks nothing when art is switched off", () => {
    expect(pickEmailArt("none", day(0))).toBeNull();
  });

  it("gives the same photo all day and a different one on consecutive days", () => {
    const morning = pickEmailArt("photo", new Date(day(3).getTime() + 3_600_000));
    const evening = pickEmailArt("photo", new Date(day(3).getTime() + 20 * 3_600_000));
    expect(morning).toEqual(evening);
    for (let n = 0; n < EMAIL_PHOTO_COUNT * 2; n++) {
      expect(pickEmailArt("photo", day(n))?.path).not.toBe(pickEmailArt("photo", day(n + 1))?.path);
    }
  });

  it("cycles through every photo before repeating", () => {
    const seen = new Set(Array.from({ length: EMAIL_PHOTO_COUNT }, (_, n) => pickEmailArt("photo", day(n))?.path));
    expect(seen.size).toBe(EMAIL_PHOTO_COUNT);
  });

  it("points photos at the resized email copies, filling the card width", () => {
    const art = pickEmailArt("photo", day(0));
    expect(art?.path).toMatch(/^\/images\/email\/hero-\d{2}\.jpg$/);
    expect(art?.width).toBe(558);
    expect(art?.alt).not.toBe("");
  });

  it("varies sketches by day and by the salt, so different emails on one day differ", () => {
    const paths = new Set(["verify", "reset", "invite", "receipt", "gift", "coaching"].map((salt) => pickEmailArt("sketch", day(0), salt)?.path));
    expect(paths.size).toBeGreaterThan(1);
    expect(pickEmailArt("sketch", day(0), "verify")).toEqual(pickEmailArt("sketch", day(0), "verify"));
  });

  it("only uses sketches that exist in the list, as decorative images", () => {
    const art = pickEmailArt("sketch", day(5), "x");
    const name = art?.path.replace("/sketches/", "").replace(".jpg", "") ?? "";
    expect(EMAIL_SKETCHES).toContain(name);
    expect(art?.alt).toBe("");
  });
});

describe("emailCard", () => {
  const body = "<p>Hello</p>";
  const style = "font-size:15px";

  it("puts a photo above the text, full width, with the top corners rounded", () => {
    const html = emailCard(body, pickEmailArt("photo", day(0)), SITE, style);
    expect(html.indexOf("<img")).toBeLessThan(html.indexOf("<p>Hello</p>"));
    expect(html).toContain(`src="${SITE}/images/email/hero-`);
    expect(html).toContain("border-radius:15px 15px 0 0");
    expect(html).toContain("padding:32px 28px");
  });

  it("puts a sketch inside the padded area, centred above the text", () => {
    const html = emailCard(body, pickEmailArt("sketch", day(0), "x"), SITE, style);
    expect(html).toContain(`src="${SITE}/sketches/`);
    expect(html.indexOf("padding:32px 28px")).toBeLessThan(html.indexOf("<img"));
    expect(html.indexOf("<img")).toBeLessThan(html.indexOf("<p>Hello</p>"));
    expect(html).toContain('alt=""');
  });

  it("is just the padded text when there is no art", () => {
    const html = emailCard(body, null, SITE, style);
    expect(html).not.toContain("<img");
    expect(html).toContain("<p>Hello</p>");
  });
});

describe("readArtSettings", () => {
  it("falls back to the defaults for anything missing or unknown", () => {
    expect(readArtSettings(null)).toEqual(DEFAULT_ART_SETTINGS);
    expect(readArtSettings("nope")).toEqual(DEFAULT_ART_SETTINGS);
    expect(readArtSettings({ member: "none", system: "banana", flows: 3 })).toEqual({ member: "none", system: DEFAULT_ART_SETTINGS.system, flows: DEFAULT_ART_SETTINGS.flows });
  });
});

describe("artForAudience", () => {
  const settings = { member: "none", system: "photo", flows: "sketch" } as const;

  it("follows the setting for member and system emails, treating an unlabelled email as system", () => {
    expect(artForAudience("member", settings)).toBe("none");
    expect(artForAudience("system", settings)).toBe("photo");
    expect(artForAudience(undefined, settings)).toBe("photo");
  });

  it("never puts a picture in mail to the team", () => {
    expect(artForAudience("internal", { member: "photo", system: "photo", flows: "photo" })).toBe("none");
  });
});
