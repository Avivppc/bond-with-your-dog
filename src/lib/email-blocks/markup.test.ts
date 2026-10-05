import { describe, expect, it } from "vitest";
import { escapeHtml, fillVars, markupToHtml, markupToText, safeHttpUrl, safeLinkUrl, splitParagraphs } from "./markup";

describe("escapeHtml", () => {
  it("escapes the five HTML-significant characters", () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
  });
});

describe("fillVars", () => {
  it("fills known tags, tolerates spaces and empties unknown ones", () => {
    expect(fillVars("Hi {{first_name}} and {{ dog_name }}{{nope}}!", { first_name: "Dana", dog_name: "Luna" })).toBe("Hi Dana and Luna!");
  });

  it("does not read inherited object properties", () => {
    expect(fillVars("{{constructor}}{{toString}}", {})).toBe("");
  });
});

describe("safe URLs", () => {
  it("accepts absolute http(s) addresses", () => {
    expect(safeHttpUrl(" https://www.bonded.dog/checkout?a=1&b=2 ")).toBe("https://www.bonded.dog/checkout?a=1&b=2");
    expect(safeHttpUrl("http://example.com")).toBe("http://example.com");
  });

  it.each(["javascript:alert(1)", "JaVaScRiPt:alert(1)", "data:text/html,<b>x</b>", "/relative", "www.bonded.dog", "", "java\tscript:alert(1)", "https://exa mple.com"])(
    "rejects %j",
    (url) => {
      expect(safeHttpUrl(url)).toBeNull();
    },
  );

  it("allows mailto only for inline links", () => {
    expect(safeLinkUrl("mailto:hello@bonded.dog")).toBe("mailto:hello@bonded.dog");
    expect(safeHttpUrl("mailto:hello@bonded.dog")).toBeNull();
    expect(safeLinkUrl("javascript:alert(1)")).toBeNull();
  });
});

describe("markupToHtml", () => {
  it("renders bold, italic and nested emphasis", () => {
    expect(markupToHtml("**bold** and *italic* and **a *b* c**")).toBe(
      "<strong>bold</strong> and <em>italic</em> and <strong>a <em>b</em> c</strong>",
    );
  });

  it("leaves lone asterisks alone", () => {
    expect(markupToHtml("2 * 3 = 6 and a * b")).toBe("2 * 3 = 6 and a * b");
  });

  it("escapes raw HTML instead of passing it through", () => {
    const html = markupToHtml(`<script>alert("x")</script><img src=x onerror=alert(1)>`);
    expect(html).not.toContain("<script");
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
  });

  it("renders safe links with an escaped href", () => {
    const html = markupToHtml("Go [to **Bonded**](https://www.bonded.dog/?a=1&b=2) now");
    expect(html).toContain(`<a href="https://www.bonded.dog/?a=1&amp;b=2"`);
    expect(html).toContain(">to <strong>Bonded</strong></a> now");
    expect(html.startsWith("Go ")).toBe(true);
  });

  it("drops javascript: and data: links but keeps the label", () => {
    const html = markupToHtml("[click](javascript:alert(1)) [x](data:text/html,hi)");
    expect(html).not.toContain("<a");
    expect(html).not.toContain("javascript");
    expect(html).toContain("click");
  });

  it("cannot break out of the href attribute", () => {
    const html = markupToHtml(`[x](https://a.com/"onmouseover="alert(1))`);
    expect(html).not.toMatch(/"\s*onmouseover=/);
    expect(html).toContain("&quot;onmouseover=&quot;");
  });

  it("links bare addresses without trailing punctuation", () => {
    expect(markupToHtml("See https://www.bonded.dog/moves.")).toMatch(/<a href="https:\/\/www\.bonded\.dog\/moves"[^>]*>https:\/\/www\.bonded\.dog\/moves<\/a>\.$/);
  });

  it("allows mailto links and turns newlines into <br>", () => {
    const html = markupToHtml("Write [us](mailto:hi@bonded.dog)\nthanks");
    expect(html).toContain(`href="mailto:hi@bonded.dog"`);
    expect(html).toContain("<br>\nthanks");
  });
});

describe("markupToText", () => {
  it("strips markers and shows link targets", () => {
    expect(markupToText("**Hi** *there*, [shop](https://bonded.dog/shop) or https://bonded.dog")).toBe(
      "Hi there, shop (https://bonded.dog/shop) or https://bonded.dog",
    );
  });

  it("keeps only the label of unsafe links", () => {
    expect(markupToText("[click](javascript:alert(1))")).toBe("click");
  });
});

describe("splitParagraphs", () => {
  it("splits on blank lines and drops empty paragraphs", () => {
    expect(splitParagraphs("One\nline two\n\n  \n\nTwo\r\n\r\nThree\n\n")).toEqual(["One\nline two", "Two", "Three"]);
  });
});
