import { describe, expect, it } from "vitest";
import { isPrivateAddress, isPublicHttpsUrl, normalizeTag } from "./actions";

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
      "https://localhost./x",
      "https://metadata.google.internal./x",
      "https://router.lan/x",
      "https://nas.home.arpa/x",
      "https://hooks.zapier.com:8443/x",
      "https://2130706433/x",
    ]) {
      expect(isPublicHttpsUrl(url), url).toBe(false);
    }
  });

  it("allows the default https port written out", () => {
    expect(isPublicHttpsUrl("https://hooks.zapier.com:443/x")).toBe(true);
  });
});

describe("isPrivateAddress", () => {
  it("flags loopback, private, link-local, CGNAT and other non-public ranges", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "224.0.0.1", "::1", "::", "fc00::1", "fd12::1", "fe80::1", "::ffff:127.0.0.1", "::ffff:10.0.0.1"]) {
      expect(isPrivateAddress(ip), ip).toBe(true);
    }
  });

  it("lets public addresses through", () => {
    for (const ip of ["8.8.8.8", "172.32.0.1", "100.128.0.1", "2606:4700::1111", "::ffff:8.8.8.8"]) {
      expect(isPrivateAddress(ip), ip).toBe(false);
    }
  });
});
