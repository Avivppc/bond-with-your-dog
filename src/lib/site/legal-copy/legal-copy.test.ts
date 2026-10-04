import { describe, expect, test } from "vitest";
import { ACCESSIBILITY_HTML, PRIVACY_HTML, REFUND_HTML, TERMS_HTML } from "./index";
import { sanitizeSiteHtml } from "../sanitize-site";

const DOCUMENTS = { privacy: PRIVACY_HTML, terms: TERMS_HTML, refund: REFUND_HTML, accessibility: ACCESSIBILITY_HTML };
const KNOWN_PLACEHOLDERS = new Set(["{{business_details}}", "{{contact_email}}", "{{legal_name}}"]);

describe.each(Object.entries(DOCUMENTS))("%s page copy", (_name, html) => {
  test("uses only placeholders the page renderer fills in", () => {
    const used = html.match(/\{\{[^}]*\}\}/g) ?? [];
    expect(used.filter((p) => !KNOWN_PLACEHOLDERS.has(p))).toEqual([]);
  });

  test("names the business so a reader knows who they are dealing with", () => {
    expect(html).toContain("{{business_details}}");
  });

  test("survives the site's HTML sanitizer unchanged (no tag or link it would strip)", () => {
    const filled = html.replaceAll("{{business_details}}", "<p>x</p>").replaceAll("{{contact_email}}", "a@b.dev");
    // The sanitizer turns the &#39; entity into a plain apostrophe; nothing else may change.
    expect(sanitizeSiteHtml(filled)).toBe(filled.replaceAll("&#39;", "'"));
  });

  test("no longer says Paddle or a merchant of record: the business sells through PayPlus itself", () => {
    expect(html).not.toMatch(/paddle|merchant of record|reseller/i);
  });
});

describe("cross-document promises", () => {
  test("refund policy and terms agree on the 14-day right and on PayPlus", () => {
    expect(REFUND_HTML).toContain("14 days");
    expect(TERMS_HTML).toContain("PayPlus");
    expect(PRIVACY_HTML).toContain("PayPlus");
  });

  test("the pages the documents link to exist", () => {
    for (const href of ["/refund-policy", "/privacy"]) expect(TERMS_HTML).toContain(`href="${href}"`);
  });
});
