import { describe, expect, it } from "vitest";
import { formatOfferPrice, parsePriceToCents } from "./pricing";

describe("parsePriceToCents", () => {
  it("converts a typed price to integer cents without float errors", () => {
    expect(parsePriceToCents("49")).toBe(4900);
    expect(parsePriceToCents("49.5")).toBe(4950);
    expect(parsePriceToCents("19.99")).toBe(1999);
    expect(parsePriceToCents(" $1,250.10 ")).toBe(125010);
    expect(parsePriceToCents("0")).toBe(0);
  });

  it("rejects invalid input", () => {
    for (const bad of ["", "abc", "-5", "1.999", "12.3.4"]) expect(parsePriceToCents(bad)).toBeNull();
  });
});

describe("formatOfferPrice", () => {
  it("formats free, one-time and subscription offers", () => {
    expect(formatOfferPrice({ payment_type: "free", price_cents: 0, currency: "USD", interval: null })).toBe("Free");
    expect(formatOfferPrice({ payment_type: "one_time", price_cents: 4900, currency: "USD", interval: null })).toBe("$49");
    expect(formatOfferPrice({ payment_type: "one_time", price_cents: 4950, currency: "USD", interval: null })).toBe("$49.50");
    expect(formatOfferPrice({ payment_type: "subscription", price_cents: 1900, currency: "USD", interval: "month" })).toBe("$19 / month");
    expect(formatOfferPrice({ payment_type: "subscription", price_cents: 19000, currency: "EUR", interval: "year" })).toBe("€190 / year");
  });
});
