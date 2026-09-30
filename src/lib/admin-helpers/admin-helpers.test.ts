import { describe, expect, it } from "vitest";
import { pageWindow, parsePage } from "./pagination";
import { parseEmailList } from "./email-list";
import { compareSeries, parseDashboardRange, parseMetric, seriesTotal } from "./dashboard-metrics";
import { formatAmounts, toAmounts } from "./money";
import { mapWithConcurrency } from "./concurrency";
import { inboxHref, parseInboxStatus, parseInboxTab } from "./inbox";

describe("pageWindow", () => {
  it("describes the rows on a page", () => {
    expect(pageWindow(312, 2, 25)).toEqual({ page: 2, pages: 13, offset: 25, first: 26, last: 50 });
  });

  it("clamps past the last page and handles an empty list", () => {
    expect(pageWindow(30, 9, 25)).toMatchObject({ page: 2, first: 26, last: 30 });
    expect(pageWindow(0, 1, 25)).toEqual({ page: 1, pages: 1, offset: 0, first: 0, last: 0 });
  });

  it("parses page numbers defensively", () => {
    expect(parsePage("3")).toBe(3);
    expect(parsePage("-1")).toBe(1);
    expect(parsePage("abc")).toBe(1);
    expect(parsePage(["2", "3"])).toBe(1);
    expect(parsePage(undefined)).toBe(1);
  });
});

describe("parseEmailList", () => {
  it("splits on commas, semicolons and new lines, lower-cases and de-duplicates", () => {
    const parsed = parseEmailList("Ana@Example.com, bo@example.com\n<ana@example.com>; cy@example.org");
    expect(parsed).toEqual({ emails: ["ana@example.com", "bo@example.com", "cy@example.org"], invalid: [], tooMany: false });
  });

  it("reports entries that are not emails", () => {
    expect(parseEmailList("ok@example.com, nope, @x.com").invalid).toEqual(["nope", "@x.com"]);
  });

  it("caps a batch and says so", () => {
    const text = Array.from({ length: 5 }, (_, i) => `p${i}@example.com`).join("\n");
    const parsed = parseEmailList(text, 3);
    expect(parsed.emails).toHaveLength(3);
    expect(parsed.tooMany).toBe(true);
  });

  it("returns nothing for blank input", () => {
    expect(parseEmailList("  \n , ")).toEqual({ emails: [], invalid: [], tooMany: false });
  });
});

describe("dashboard metrics", () => {
  const current = [
    { bucket: "2026-09-01", gross: 1000, refunds: 200, orders: 2 },
    { bucket: "2026-09-02", gross: 500, refunds: 0, orders: 1 },
    { bucket: "2026-09-03", gross: 0, refunds: 0, orders: 0 },
  ];
  const previous = [
    { bucket: "2026-08-29", gross: 300, refunds: 0, orders: 1 },
    { bucket: "2026-08-30", gross: 100, refunds: 100, orders: 1 },
  ];

  it("lines the previous period up with the current one", () => {
    expect(compareSeries(current, previous, "net")).toEqual([
      { bucket: "2026-09-01", current: 800, previous: 300 },
      { bucket: "2026-09-02", current: 500, previous: 0 },
      { bucket: "2026-09-03", current: 0, previous: null },
    ]);
  });

  it("totals each line", () => {
    const points = compareSeries(current, previous, "gross");
    expect(seriesTotal(points, "current")).toBe(1500);
    expect(seriesTotal(points, "previous")).toBe(400);
  });

  it("treats a missing field as zero", () => {
    expect(compareSeries([{ bucket: "x" }], [], "lessons")).toEqual([{ bucket: "x", current: 0, previous: null }]);
  });

  it("falls back to safe defaults for unknown query values", () => {
    expect(parseMetric("orders")).toBe("orders");
    expect(parseMetric("hack")).toBe("gross");
    expect(parseDashboardRange("90d")).toBe("90d");
    expect(parseDashboardRange("12m")).toBe("30d");
  });
});

describe("mapWithConcurrency", () => {
  it("keeps input order and never exceeds the limit", async () => {
    let inFlight = 0;
    let peak = 0;
    const results = await mapWithConcurrency([30, 5, 20, 1, 10], 2, async (ms, i) => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, ms));
      inFlight -= 1;
      return i * 10;
    });
    expect(results).toEqual([0, 10, 20, 30, 40]);
    expect(peak).toBe(2);
  });

  it("handles an empty list", async () => {
    expect(await mapWithConcurrency([], 5, async () => 1)).toEqual([]);
  });
});

describe("inbox views", () => {
  it("parses tabs and statuses with safe defaults", () => {
    expect(parseInboxTab("story")).toBe("story");
    expect(parseInboxTab("admin")).toBe("question");
    expect(parseInboxStatus("closed")).toBe("closed");
    expect(parseInboxStatus(undefined)).toBe("open");
  });

  it("builds short URLs that keep the view", () => {
    expect(inboxHref({ tab: "question", status: "open" })).toBe("/admin/inbox");
    expect(inboxHref({ tab: "bug", status: "all", page: 2 })).toBe("/admin/inbox?tab=bug&status=all&page=2");
    expect(inboxHref({ tab: "story", status: "open" }, { ok: "Saved" })).toBe("/admin/inbox?tab=story&ok=Saved");
  });
});

describe("money helpers", () => {
  it("formats per-currency amounts", () => {
    expect(formatAmounts([{ currency: "USD", net_cents: 10000 }, { currency: "EUR", net_cents: 2050 }])).toBe("$100 + €20.50");
    expect(formatAmounts([])).toBe("$0");
    expect(formatAmounts([{ currency: "EUR", net_cents: 0 }])).toBe("$0");
  });

  it("validates amounts coming from the database", () => {
    expect(toAmounts([{ currency: "USD", net_cents: "500" }, { currency: "bad", net_cents: 1 }, null, "x"])).toEqual([
      { currency: "USD", net_cents: 500 },
    ]);
    expect(toAmounts(null)).toEqual([]);
  });
});
