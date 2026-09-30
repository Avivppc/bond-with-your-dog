import { describe, expect, it } from "vitest";
import { sanitizeLessonHtml } from "./sanitize";

describe("sanitizeLessonHtml", () => {
  it("keeps the formatting the lesson editor produces", () => {
    const html =
      "<h2>Title</h2><p><strong>Bold</strong> <em>it</em> <u>u</u> <s>s</s></p><ul><li>a</li></ul><ol><li>b</li></ol><blockquote><p>q</p></blockquote>";
    expect(sanitizeLessonHtml(html + "<hr>")).toBe(html + "<hr />");
  });

  it("removes scripts, event handlers and styles", () => {
    const out = sanitizeLessonHtml(`<p onclick="steal()" style="color:red">Hi<script>alert(1)</script></p><img src=x onerror=alert(1)>`);
    expect(out).toBe("<p>Hi</p>");
  });

  it("drops javascript: links but keeps safe ones, opening them in a new tab safely", () => {
    expect(sanitizeLessonHtml(`<a href="javascript:alert(1)">x</a>`)).toBe("<a>x</a>");
    expect(sanitizeLessonHtml(`<a href="https://bonded.dog">site</a>`)).toBe(
      `<a href="https://bonded.dog" target="_blank" rel="noopener noreferrer nofollow">site</a>`
    );
    expect(sanitizeLessonHtml(`<a href="mailto:hi@bonded.dog">mail</a>`)).toContain(`href="mailto:hi@bonded.dog"`);
  });

  it("returns an empty string for empty or whitespace-only editor output", () => {
    expect(sanitizeLessonHtml("")).toBe("");
    expect(sanitizeLessonHtml("<p></p>")).toBe("");
    expect(sanitizeLessonHtml("   ")).toBe("");
  });
});
