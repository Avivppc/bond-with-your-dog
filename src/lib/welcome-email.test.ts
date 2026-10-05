import { describe, expect, test } from "vitest";
import { escapeHtml, firstNameOf, welcomeEmail } from "./welcome-email";

const BASE = "https://bonded.example";
const VERIFY = "https://bonded.example/auth/confirm?token_hash=abc&type=magiclink";

describe("firstNameOf", () => {
  test("uses the first word of the full name", () => {
    expect(firstNameOf("  Lili   Kovacs ")).toBe("Lili");
  });

  test("falls back to a friendly word when the name is empty", () => {
    expect(firstNameOf("   ")).toBe("friend");
  });
});

describe("escapeHtml", () => {
  test("neutralises markup characters", () => {
    expect(escapeHtml(`<b>"Tom" & 'Jerry'</b>`)).toBe("&lt;b&gt;&quot;Tom&quot; &amp; &#39;Jerry&#39;&lt;/b&gt;");
  });
});

describe("welcomeEmail", () => {
  test("greets the member by first name and is addressed to them", () => {
    const email = welcomeEmail({ to: "lili@x.dev", fullName: "Lili Kovacs", baseUrl: BASE, verifyUrl: VERIFY });

    expect(email.to).toBe("lili@x.dev");
    expect(email.subject).toContain("Lili");
    expect(email.html).toContain("Welcome to BONDED, Lili!");
    expect(email.text).toContain("Welcome to BONDED, Lili!");
  });

  test("includes the confirm-email link when the inbox is not proven yet", () => {
    const email = welcomeEmail({ to: "a@x.dev", fullName: "Lili", baseUrl: BASE, verifyUrl: VERIFY });

    expect(email.html).toContain("Confirm my email");
    expect(email.html).toContain(escapeHtml(VERIFY));
    expect(email.text).toContain(VERIFY);
  });

  test("leaves out the confirm block for already-verified (Google) members", () => {
    const email = welcomeEmail({ to: "a@x.dev", fullName: "Lili", baseUrl: BASE, verifyUrl: null });

    expect(email.html).not.toContain("Confirm my email");
    expect(email.text).not.toContain("confirm your email");
    expect(email.html).toContain(`${BASE}/home`);
  });

  test("escapes a hostile name in the html body", () => {
    const email = welcomeEmail({ to: "a@x.dev", fullName: "<script>x</script>", baseUrl: BASE, verifyUrl: null });

    expect(email.html).not.toContain("<script>x</script>");
    expect(email.html).toContain("&lt;script&gt;x&lt;/script&gt;");
  });
});
