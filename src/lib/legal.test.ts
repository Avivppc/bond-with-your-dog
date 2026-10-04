import { describe, expect, test } from "vitest";
import { fillLegalPlaceholders, type LegalDetails } from "./legal";

const full: LegalDetails = {
  name: "Roni Sagi Dog Training Ltd.",
  businessNumber: "515123456",
  address: "1 Herzl St\nTel Aviv, Israel",
  phone: "+972 50 123 4567",
};

describe("fillLegalPlaceholders", () => {
  test("fills the legal name and contact email", () => {
    const html = fillLegalPlaceholders("<p>{{legal_name}} · {{contact_email}}</p>", { legal: full, contactEmail: "hi@bonded.dog", fallbackName: "Bonded" });
    expect(html).toBe("<p>Roni Sagi Dog Training Ltd. · hi@bonded.dog</p>");
  });

  test("falls back to the configured name when the legal name is empty", () => {
    const html = fillLegalPlaceholders("{{legal_name}}", { legal: { ...full, name: "" }, contactEmail: "hi@bonded.dog", fallbackName: "Bonded" });
    expect(html).toBe("Bonded");
  });

  test("builds one block of business details from what is filled in, in a fixed order", () => {
    const html = fillLegalPlaceholders("{{business_details}}", { legal: full, contactEmail: "hi@bonded.dog", fallbackName: "Bonded" });
    expect(html).toBe(
      "<p><strong>Roni Sagi Dog Training Ltd.</strong><br>Business registration no.: 515123456<br>1 Herzl St<br>Tel Aviv, Israel<br>Phone: +972 50 123 4567<br>Email: <a href=\"mailto:hi@bonded.dog\">hi@bonded.dog</a></p>",
    );
  });

  test("leaves out the lines that are not filled in instead of printing blanks", () => {
    const html = fillLegalPlaceholders("{{business_details}}", {
      legal: { name: "", businessNumber: "", address: "", phone: "" },
      contactEmail: "hi@bonded.dog",
      fallbackName: "Bonded",
    });
    expect(html).toBe("<p><strong>Bonded</strong><br>Email: <a href=\"mailto:hi@bonded.dog\">hi@bonded.dog</a></p>");
  });

  test("escapes everything the owner typed", () => {
    const html = fillLegalPlaceholders("{{legal_name}}{{business_details}}", {
      legal: { name: "<img src=x onerror=alert(1)>", businessNumber: "1\"2", address: "A & B", phone: "<b>1</b>" },
      contactEmail: "a\"b@x.dev",
      fallbackName: "Bonded",
    });
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<b>1</b>");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(html).toContain("A &amp; B");
    expect(html).toContain("1&quot;2");
  });
});
