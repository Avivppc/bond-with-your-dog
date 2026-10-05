import { describe, expect, it } from "vitest";
import { renderEmailHtml } from "./email-html";

const SITE = "https://www.bonded.dog";

describe("renderEmailHtml", () => {
  const html = renderEmailHtml(
    {
      subject: "You've been invited to manage the Bonded academy",
      text: [
        "Hi,",
        "",
        "avivppc@gmail.com invited you to the Bonded admin as a content editor.",
        "",
        "Choose your password to get in (this link works once): https://www.bonded.dog/auth/confirm?token_hash=abc&type=invite",
        "",
        "Afterwards, sign in any time at https://www.bonded.dog/login with this email address.",
      ].join("\n"),
    },
    SITE,
  );

  it("puts the Bonded logo in a header linking to the site", () => {
    expect(html).toContain(`<a href="${SITE}"`);
    expect(html).toContain(`src="${SITE}/images/logo.png"`);
    expect(html).toContain("<title>You&#39;ve been invited to manage the Bonded academy</title>");
  });

  it("turns a 'label: link' line into a button and keeps inline links clickable", () => {
    expect(html).toMatch(/<a href="https:\/\/www\.bonded\.dog\/auth\/confirm\?token_hash=abc&amp;type=invite"[^>]*>Choose your password to get in<\/a>/);
    expect(html).toContain("(this link works once)");
    expect(html).toContain('<a href="https://www.bonded.dog/login"');
  });

  it("keeps paragraphs and line breaks", () => {
    expect(html).toContain("<p");
    expect(renderEmailHtml({ subject: "s", text: "one\ntwo" }, SITE)).toMatch(/one<br>\s*two/);
  });

  it("escapes anything a member typed", () => {
    const out = renderEmailHtml({ subject: "<b>x</b>", text: 'Roni replied: "<script>alert(1)</script>"' }, SITE);
    expect(out).not.toContain("<script>");
    expect(out).toContain("&lt;script&gt;");
    expect(out).toContain("<title>&lt;b&gt;x&lt;/b&gt;</title>");
  });

  it("only links http(s) addresses", () => {
    expect(renderEmailHtml({ subject: "s", text: "javascript:alert(1)" }, SITE)).not.toContain('href="javascript');
  });

  it("adds a hidden inbox preview and an unsubscribe link for marketing emails", () => {
    const html = renderEmailHtml({ subject: "s", text: "Hi" }, SITE, { preheader: "Your code <inside>", unsubscribeUrl: `${SITE}/unsubscribe?t=abc` });
    expect(html).toContain("display:none");
    expect(html).toContain("Your code &lt;inside&gt;");
    expect(html).toContain(`href="${SITE}/unsubscribe?t=abc"`);
    expect(renderEmailHtml({ subject: "s", text: "Hi" }, SITE)).not.toContain("Unsubscribe");
  });

  it("opens with a line-drawing by default, a photo when asked, nothing when switched off", () => {
    const email = { subject: "Reset your password", text: "Hi" };
    const now = new Date("2026-10-05T09:00:00Z");
    expect(renderEmailHtml(email, SITE, { now })).toMatch(/src="https:\/\/www\.bonded\.dog\/sketches\/[a-z-]+\.jpg"/);
    expect(renderEmailHtml(email, SITE, { now, art: "photo" })).toMatch(/src="https:\/\/www\.bonded\.dog\/images\/email\/hero-\d{2}\.jpg"/);
    const plain = renderEmailHtml(email, SITE, { now, art: "none" });
    expect(plain).not.toContain("/sketches/");
    expect(plain).not.toContain("/images/email/");
  });

  it("changes the photo from one day to the next", () => {
    const email = { subject: "Time to practice", text: "Hi" };
    const photo = (iso: string) => renderEmailHtml(email, SITE, { art: "photo", now: new Date(iso) }).match(/hero-\d{2}\.jpg/)?.[0];
    expect(photo("2026-10-05T09:00:00Z")).not.toBe(photo("2026-10-06T09:00:00Z"));
  });
});
