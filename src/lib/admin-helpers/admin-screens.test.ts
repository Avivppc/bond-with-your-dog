import { describe, expect, it } from "vitest";
import { DaysOfAccess } from "./form-fields";
import { capitalizeFirst, displayFirstName, leadTierLabel } from "./display";
import { axisTicks, niceAxisMax } from "./chart-axis";
import { ilikePattern, parseSearch } from "./search";
import { orderStatusLabel, ordersHref, parseOrderStatus } from "./orders";
import { formValues, priceText } from "./offer-form";

const message = (input: unknown) => {
  const result = DaysOfAccess.safeParse(input);
  return result.success ? null : result.error.issues[0].message;
};

describe("DaysOfAccess", () => {
  it("treats blank as lifetime access", () => {
    expect(DaysOfAccess.parse("")).toBeNull();
    expect(DaysOfAccess.parse(undefined)).toBeNull();
  });

  it("accepts whole days", () => {
    expect(DaysOfAccess.parse("30")).toBe(30);
    expect(DaysOfAccess.parse(" 7 ")).toBe(7);
  });

  it("explains every invalid value in staff language, never raw zod text", () => {
    expect(message("-3")).toBe("Days of access must be at least 1 (leave it blank for lifetime access).");
    expect(message("0")).toBe("Days of access must be at least 1 (leave it blank for lifetime access).");
    expect(message("2.5")).toBe("Days of access must be whole days.");
    expect(message("abc")).toBe("Days of access must be a number.");
    expect(message("99999")).toBe("Days of access is too long (at most 36,500 days).");
  });
});

describe("display helpers", () => {
  it("capitalises the greeting name as typed lower-case", () => {
    expect(displayFirstName("or aviv", "or@example.com")).toBe("Or");
    expect(displayFirstName("  Roni  Levi ", null)).toBe("Roni");
  });

  it("falls back to the email, then to 'there'", () => {
    expect(displayFirstName(null, "maya@example.com")).toBe("Maya");
    expect(displayFirstName("   ", undefined)).toBe("there");
    expect(capitalizeFirst("")).toBe("");
  });

  it("labels quiz results and keeps unknown tiers as stored", () => {
    expect(leadTierLabel("letsDance")).toBe("Bonded: Let's Dance");
    expect(leadTierLabel("foundations")).toBe("Bonded: Foundations");
    expect(leadTierLabel("toString")).toBe("toString");
    expect(leadTierLabel("other")).toBe("other");
  });
});

describe("chart axis", () => {
  it("rounds the top of the axis up to a round number", () => {
    expect(niceAxisMax(42720)).toBe(60000);
    expect(niceAxisMax(10)).toBe(10);
    expect(niceAxisMax(3)).toBe(4);
    expect(niceAxisMax(1)).toBe(2);
    expect(niceAxisMax(8900)).toBe(10000);
  });

  it("draws a plain 0 axis when there is no data (no fake cents)", () => {
    expect(niceAxisMax(0)).toBe(0);
    expect(niceAxisMax(Number.NaN)).toBe(0);
    expect(axisTicks(0)).toEqual([null, null, 0]);
    expect(axisTicks(60000)).toEqual([60000, 30000, 0]);
  });
});

describe("list search", () => {
  it("keeps a single trimmed, bounded term", () => {
    expect(parseSearch("  ana  ")).toBe("ana");
    expect(parseSearch(["a", "b"])).toBe("");
    expect(parseSearch(undefined)).toBe("");
    expect(parseSearch("x".repeat(500))).toHaveLength(100);
  });

  it("strips characters that would change a PostgREST or-filter", () => {
    expect(ilikePattern("ana@example.com")).toBe("*ana@example.com*");
    expect(ilikePattern("a,b)or(email.eq.x")).toBe("*a b or email.eq.x*");
    expect(ilikePattern("%_*")).toBeNull();
    expect(ilikePattern("")).toBeNull();
  });
});

describe("orders filters", () => {
  it("parses the status filter defensively", () => {
    expect(parseOrderStatus("refunded")).toBe("refunded");
    expect(parseOrderStatus("bogus")).toBe("all");
    expect(parseOrderStatus(undefined)).toBe("all");
    expect(orderStatusLabel("paid")).toBe("Paid");
    expect(orderStatusLabel("weird")).toBe("weird");
  });

  it("builds short URLs that keep the other filters", () => {
    expect(ordersHref({ status: "all", q: "" })).toBe("/admin/orders");
    expect(ordersHref({ status: "paid", q: "ana", page: 2 })).toBe("/admin/orders?status=paid&q=ana&page=2");
    expect(ordersHref({ status: "all", q: "", page: 1 })).toBe("/admin/orders");
  });
});

describe("offer form values", () => {
  it("hands back what was typed, including chosen courses and access levels", () => {
    const fd = new FormData();
    fd.set("title", "Spring sale");
    fd.set("payment_type", "subscription");
    fd.set("price", "49.50");
    fd.set("status", "published");
    fd.set("includes_community", "on");
    fd.append("course_ids", "a");
    fd.append("course_ids", "b");
    fd.set("access_level:b", "limited");
    const values = formValues(fd);
    expect(values).toMatchObject({
      title: "Spring sale",
      payment_type: "subscription",
      price: "49.50",
      status: "published",
      includes_community: true,
      course_ids: ["a", "b"],
      access_levels: { a: "full", b: "limited" },
    });
  });

  it("falls back to safe defaults for tampered values", () => {
    const fd = new FormData();
    fd.set("payment_type", "lifetime");
    fd.set("status", "live");
    expect(formValues(fd)).toMatchObject({ payment_type: "one_time", status: "draft", course_ids: [], includes_community: false });
  });

  it("shows prices without needless decimals", () => {
    expect(priceText(4900)).toBe("49");
    expect(priceText(4950)).toBe("49.50");
    expect(priceText(0)).toBe("");
  });
});
