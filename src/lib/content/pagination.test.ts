import { describe, expect, it } from "vitest";
import { paginate, parsePage } from "./pagination";

describe("parsePage", () => {
  it("defaults to page 1 for missing or invalid input", () => {
    expect(parsePage(undefined)).toBe(1);
    expect(parsePage("abc")).toBe(1);
    expect(parsePage("0")).toBe(1);
    expect(parsePage("-3")).toBe(1);
    expect(parsePage("2.5")).toBe(1);
  });

  it("reads positive whole pages", () => {
    expect(parsePage("4")).toBe(4);
  });
});

describe("paginate", () => {
  it("computes the row range and label", () => {
    expect(paginate(2, 25, 60)).toEqual({ page: 2, pages: 3, from: 25, to: 49, label: "Displaying 26–50 of 60" });
  });

  it("clamps pages past the end", () => {
    expect(paginate(9, 25, 60)).toMatchObject({ page: 3, from: 50, to: 74, label: "Displaying 51–60 of 60" });
  });

  it("handles an empty list", () => {
    expect(paginate(1, 25, 0)).toEqual({ page: 1, pages: 1, from: 0, to: 24, label: "Displaying 0 of 0" });
  });
});
