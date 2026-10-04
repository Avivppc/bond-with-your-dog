import { describe, expect, test } from "vitest";
import { sanitizeSiteHtml } from "./sanitize-site";

describe("sanitizeSiteHtml", () => {
  test("keeps site paths, anchors and mailto in the same tab; other sites open in a new one", () => {
    const html = sanitizeSiteHtml('<p><a href="/refund-policy">refunds</a> <a href="#faq">faq</a> <a href="mailto:a@b.dev">mail</a> <a href="https://paddle.net">paddle</a></p>');
    expect(html).toBe(
      '<p><a href="/refund-policy">refunds</a> <a href="#faq">faq</a> <a href="mailto:a@b.dev">mail</a> <a href="https://paddle.net" target="_blank" rel="noopener noreferrer nofollow">paddle</a></p>',
    );
  });

  test("drops scripts, javascript links and protocol-relative or backslash paths", () => {
    const html = sanitizeSiteHtml('<p onclick="x()">Hi<script>alert(1)</script> <a href="javascript:alert(1)">a</a> <a href="//evil.dev">b</a> <a href="/\\evil.dev">c</a></p>');
    expect(html).toBe("<p>Hi <a>a</a> <a>b</a> <a>c</a></p>");
  });

  test("keeps the editor's placeholders", () => {
    expect(sanitizeSiteHtml('<p><a href="mailto:{{contact_email}}">{{contact_email}}</a></p>')).toBe('<p><a href="mailto:{{contact_email}}">{{contact_email}}</a></p>');
  });

  test("keeps an id on headings (for #anchor links into a page) and on nothing else", () => {
    expect(sanitizeSiteHtml('<h2 id="cookies" class="x">Cookies</h2><p id="y">t</p>')).toBe('<h2 id="cookies">Cookies</h2><p>t</p>');
  });
});
