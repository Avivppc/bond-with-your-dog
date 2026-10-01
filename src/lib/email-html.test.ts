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
});
