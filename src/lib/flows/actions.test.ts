import { describe, expect, it } from "vitest";
import { isPublicHttpsUrl, normalizeTag } from "./actions";

describe("normalizeTag", () => {
  it("lower-cases and single-spaces", () => {
    expect(normalizeTag("  VIP   Members ")).toBe("vip members");
    expect(normalizeTag("lets-dance")).toBe("lets-dance");
  });

  it("rejects anything else", () => {
    expect(normalizeTag("")).toBe("");
    expect(normalizeTag("vip!")).toBe("");
    expect(normalizeTag("-starts-with-dash")).toBe("");
    expect(normalizeTag("x".repeat(41))).toBe("");
  });
});

describe("isPublicHttpsUrl", () => {
  it("accepts public https hosts", () => {
    expect(isPublicHttpsUrl("https://hooks.zapier.com/hooks/catch/1/abc")).toBe(true);
    expect(isPublicHttpsUrl("https://hook.eu1.make.com/xyz")).toBe(true);
  });

  it("refuses anything that could reach the server's own network", () => {
    for (const url of [
      "http://hooks.zapier.com/x",
      "https://localhost/x",
      "https://app.localhost/x",
      "https://127.0.0.1/x",
      "https://169.254.169.254/latest/meta-data",
      "https://[::1]/x",
      "https://metadata.google.internal/x",
      "https://printer.local/x",
      "https://intranet/x",
      "https://user:pass@hooks.zapier.com/x",
      "javascript:alert(1)",
      "not a url",
    ]) {
      expect(isPublicHttpsUrl(url), url).toBe(false);
    }
  });
});
