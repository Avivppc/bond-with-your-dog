import { describe, expect, it } from "vitest";
import { renderEmailDoc } from "./render";
import type { EmailBlock, EmailDoc, RenderContext } from "./types";

const VARS = {
  first_name: "Dana",
  dog_name: "Luna",
  discount_code: "BOND-7KQ4-M2XD",
  discount_percent: "20%",
  discount_expires: "October 10",
  offer_url: "https://www.bonded.dog/checkout/moves?code=BOND-7KQ4-M2XD&src=email",
};

const CTX: RenderContext = { siteUrl: "https://www.bonded.dog/", vars: VARS, unsubscribeUrl: "https://www.bonded.dog/unsubscribe?t=abc" };

function doc(blocks: EmailBlock[], extra: Partial<EmailDoc> = {}): EmailDoc {
  return { subject: "Hi {{first_name}}", preheader: "For {{dog_name}}", blocks, ...extra };
}

describe("renderEmailDoc names from forms", () => {
  const text = (t: string): EmailBlock => ({ id: "t", type: "text", text: t, align: "left" });

  it("never turns a name into a link or formatting", () => {
    const vars = { ...VARS, first_name: "[Verify your account](https://evil.example)", dog_name: "**Rex** https://evil.example" };
    const out = renderEmailDoc(doc([text("Hi {{first_name}} and {{dog_name}}")]), { ...CTX, vars });
    expect(out.html).not.toContain('<a href="https://evil');
    expect(out.html).not.toContain("<strong>Rex</strong>");
    expect(out.html).toContain("Verify your account");
  });

  it("still fills link tags as links", () => {
    const out = renderEmailDoc(doc([text("[Go]({{offer_url}})")]), CTX);
    expect(out.html).toContain('href="https://www.bonded.dog/checkout/moves?code=BOND-7KQ4-M2XD&amp;src=email"');
  });
});

describe("renderEmailDoc postal address", () => {
  it("puts the business address in both footers, escaped", () => {
    const out = renderEmailDoc(doc([]), { ...CTX, postalAddress: "Bonded Ltd, 1 <Dog> St\nTel Aviv, Israel" });
    expect(out.html).toContain("Bonded Ltd, 1 &lt;Dog&gt; St<br>Tel Aviv, Israel");
    expect(out.text).toContain("Bonded Ltd, 1 <Dog> St\nTel Aviv, Israel");
  });

  it("leaves it out when none is set", () => {
    expect(renderEmailDoc(doc([]), CTX).html).not.toContain("Tel Aviv");
  });
});

describe("renderEmailDoc frame", () => {
  it("fills the subject and preheader and keeps the branded frame", () => {
    const out = renderEmailDoc(doc([]), CTX);
    expect(out.subject).toBe("Hi Dana");
    expect(out.html).toContain("<title>Hi Dana</title>");
    expect(out.html).toMatch(/<div style="display:none[^"]*">For Luna<\/div>/);
    expect(out.html).toContain(`src="https://www.bonded.dog/images/logo.png" width="150" height="60"`);
    expect(out.html).toContain("max-width:560px");
    expect(out.html).toContain("Bonded · Learn your dog's secret language");
  });

  it("adds the unsubscribe link to both parts when given", () => {
    const out = renderEmailDoc(doc([]), CTX);
    expect(out.html).toContain(`href="https://www.bonded.dog/unsubscribe?t=abc"`);
    expect(out.html).toContain("Unsubscribe from these emails");
    expect(out.text).toContain("Unsubscribe: https://www.bonded.dog/unsubscribe?t=abc");
  });

  it("leaves the unsubscribe link out when not given", () => {
    const out = renderEmailDoc(doc([]), { ...CTX, unsubscribeUrl: undefined });
    expect(out.html).not.toContain("Unsubscribe");
    expect(out.text).not.toContain("Unsubscribe");
  });

  it("omits the preheader div when empty", () => {
    expect(renderEmailDoc(doc([], { preheader: "  " }), CTX).html).not.toContain("display:none");
  });
});

describe("renderEmailDoc blocks", () => {
  it("fills tags before escaping, so a value cannot inject HTML", () => {
    const out = renderEmailDoc(doc([{ id: "t", type: "text", text: "Hi {{first_name}}, meet {{dog_name}}", align: "left" }]), {
      ...CTX,
      vars: { first_name: "<script>alert(1)</script>", dog_name: "**Luna**" },
    });
    expect(out.html).not.toContain("<script>alert(1)</script>");
    // Names are plain text: their markup is dropped rather than applied.
    expect(out.html).toContain("Hi &lt;script&gt;alert(1)&lt;/script&gt;, meet Luna");
    expect(out.text).toContain("Hi <script>alert(1)</script>, meet Luna");
  });

  it("renders headings at both levels and escapes them", () => {
    const out = renderEmailDoc(
      doc([
        { id: "h1", type: "heading", text: "Hello {{first_name}} & co", level: 1, align: "center" },
        { id: "h2", type: "heading", text: "Small", level: 2, align: "left" },
      ]),
      CTX,
    );
    expect(out.html).toMatch(/<h1 style="[^"]*font-size:24px[^"]*">Hello Dana &amp; co<\/h1>/);
    expect(out.html).toMatch(/<h2 style="[^"]*font-size:19px[^"]*">Small<\/h2>/);
    expect(out.html).toContain(`align="center"`);
    expect(out.text).toContain("Hello Dana & co");
  });

  it("splits text into paragraphs with inline markup", () => {
    const out = renderEmailDoc(doc([{ id: "t", type: "text", text: "One **bold**\n\nTwo [link](https://bonded.dog)", align: "left" }]), CTX);
    expect(out.html.match(/<p style="margin:0 0 14px/g)).toHaveLength(2);
    expect(out.html).toContain("<strong>bold</strong>");
    expect(out.text).toContain("One bold\n\nTwo link (https://bonded.dog)");
  });

  it("renders a filled button and its text line", () => {
    const out = renderEmailDoc(doc([{ id: "b", type: "button", label: "Join, {{first_name}}", url: "{{offer_url}}", align: "center", color: "#ff0000" }]), CTX);
    expect(out.html).toContain(`href="https://www.bonded.dog/checkout/moves?code=BOND-7KQ4-M2XD&amp;src=email"`);
    expect(out.html).toContain("background:#ff0000");
    expect(out.html).toContain(">Join, Dana</a>");
    expect(out.text).toContain(`Join, Dana: ${VARS.offer_url}`);
  });

  it("omits a button whose url is empty or unsafe after filling", () => {
    const blocks: EmailBlock[] = [
      { id: "b1", type: "button", label: "Go", url: "{{offer_url}}", align: "left", color: "#0e666a" },
      { id: "b2", type: "button", label: "Bad", url: "javascript:alert(1)", align: "left", color: "#0e666a" },
    ];
    const out = renderEmailDoc(doc(blocks), { ...CTX, vars: {} });
    expect(out.html).not.toContain(">Go</a>");
    expect(out.html).not.toContain("javascript");
    expect(out.text).not.toContain("Go:");
  });

  it("falls back to the brand colour for an invalid button colour", () => {
    const out = renderEmailDoc(doc([{ id: "b", type: "button", label: "Go", url: "https://x.com", align: "left", color: "red;background:url(x)" }]), CTX);
    expect(out.html).toContain("background:#0e666a");
    expect(out.html).not.toContain("url(x)");
  });

  it("renders the code box with code, percent and expiry", () => {
    const out = renderEmailDoc(doc([{ id: "c", type: "code", title: "Your member code" }]), CTX);
    expect(out.html).toContain("BOND-7KQ4-M2XD");
    expect(out.html).toContain("dashed");
    expect(out.html).toContain("20% off · valid until October 10");
    expect(out.text).toContain("Your member code: BOND-7KQ4-M2XD\n20% off · valid until October 10");
  });

  it("renders nothing for the code block when the member has no code", () => {
    const out = renderEmailDoc(doc([{ id: "c", type: "code", title: "Your member code" }]), { ...CTX, vars: { ...VARS, discount_code: " " } });
    expect(out.html).not.toContain("Your member code");
    expect(out.html).not.toContain("dashed");
    expect(out.text).not.toContain("Your member code");
  });

  it("renders images with clamped width and drops unsafe links", () => {
    const out = renderEmailDoc(
      doc([
        { id: "i1", type: "image", src: "https://cdn.x.com/a.png", alt: "Luna", href: "javascript:alert(1)", width: 10 },
        { id: "i2", type: "image", src: "", alt: "empty", href: "", width: 100 },
        { id: "i3", type: "image", src: "https://cdn.x.com/b.png", alt: "Shop", href: "https://bonded.dog", width: 50 },
      ]),
      CTX,
    );
    expect(out.html).toContain(`src="https://cdn.x.com/a.png"`);
    expect(out.html).toContain("width:30%");
    expect(out.html).not.toContain("javascript");
    expect(out.html).not.toContain(`alt="empty"`);
    expect(out.html).toContain(`<a href="https://bonded.dog" style="text-decoration:none"><img src="https://cdn.x.com/b.png"`);
    expect(out.text).toContain("Shop: https://bonded.dog");
  });

  it("renders quotes, dividers and spacers", () => {
    const out = renderEmailDoc(
      doc([
        { id: "q", type: "quote", text: "Best course *ever*", author: "Noa & Max" },
        { id: "d", type: "divider" },
        { id: "s", type: "spacer", size: 500 },
      ]),
      CTX,
    );
    expect(out.html).toContain("border-left:3px solid #0e666a");
    expect(out.html).toContain("<em>ever</em>");
    expect(out.html).toContain("— Noa &amp; Max");
    expect(out.html).toContain("height:64px");
    expect(out.text).toContain(`"Best course ever"\n— Noa & Max`);
    expect(out.text).toContain("----------");
  });

  it("writes a readable plain-text part in block order", () => {
    const out = renderEmailDoc(
      doc([
        { id: "h", type: "heading", text: "Welcome", level: 1, align: "left" },
        { id: "t", type: "text", text: "Hello {{first_name}}", align: "left" },
        { id: "b", type: "button", label: "Start", url: "https://bonded.dog/start", align: "left", color: "#0e666a" },
      ]),
      CTX,
    );
    expect(out.text.startsWith("Welcome\n\nHello Dana\n\nStart: https://bonded.dog/start\n\n--\n")).toBe(true);
    expect(out.text).toContain("https://www.bonded.dog");
  });
});
