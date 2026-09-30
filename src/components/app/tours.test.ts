import { describe, expect, it } from "vitest";
import { TOURS } from "./tours";

const byId = (id: string) => TOURS.find((t) => t.id === id)!;

describe("TOURS", () => {
  it("runs the home tour on /home only", () => {
    expect(byId("home").matches("/home")).toBe(true);
    expect(byId("home").matches("/home/x")).toBe(false);
  });

  it("runs the lesson tour on lesson pages, not the course page or the complete screen", () => {
    const lesson = byId("lesson");
    expect(lesson.matches("/learn/kinetic-basics/542785f1-1e5e-45cd-aea1-99718ef9a638")).toBe(true);
    expect(lesson.matches("/learn/kinetic-basics")).toBe(false);
    expect(lesson.matches("/learn/kinetic-basics/542785f1-1e5e-45cd-aea1-99718ef9a638/complete")).toBe(false);
  });

  it("gives every step a unique target", () => {
    for (const t of TOURS) expect(new Set(t.steps.map((s) => s.target)).size).toBe(t.steps.length);
  });
});
