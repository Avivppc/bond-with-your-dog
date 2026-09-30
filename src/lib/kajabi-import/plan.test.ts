import { describe, expect, it } from "vitest";
import data from "../../../data/kajabi/bonded-courses.json";
import { countPlan, planImport, splitBody, type KajabiExport } from "./plan";

const plan = planImport(data as KajabiExport);
const byKey = (k: string) => plan.find((c) => c.key === k)!;

describe("splitBody", () => {
  it("turns a bare Vimeo link into the lesson video", () => {
    expect(splitBody("<p>https://vimeo.com/887427804?fl=ls&amp;fe=ec</p>")).toEqual({ bodyHtml: null, vimeoUrl: "https://vimeo.com/887427804?fl=ls&fe=ec" });
  });
  it("keeps real text and drops empty bodies", () => {
    expect(splitBody("<p>Hello</p>").bodyHtml).toBe("<p>Hello</p>");
    expect(splitBody("  ")).toEqual({ bodyHtml: null, vimeoUrl: null });
  });
});

describe("planImport (the real Bonded export)", () => {
  it("orders the chapters and chains them", () => {
    expect(plan.map((c) => [c.id, c.chapterNumber, c.requiresCourseId])).toEqual([
      ["bonded-foundations", 1, null],
      ["bonded-moves", 2, "bonded-foundations"],
      ["bonded-lets-dance", 3, "bonded-moves"],
    ]);
  });

  it("keeps every module and lesson except Kajabi's paywall marker", () => {
    expect(countPlan(byKey("foundations"))).toMatchObject({ modules: 13, lessons: 63 });
    expect(countPlan(byKey("moves"))).toMatchObject({ modules: 15, lessons: 31 });
    expect(countPlan(byKey("dance"))).toMatchObject({ modules: 9, lessons: 46 });
  });

  it("nests submodules under their parent", () => {
    const living = byKey("foundations").modules.find((m) => m.title === "Living Together")!;
    expect(living.children.map((c) => c.title)).toEqual(["Crate Training", "Loose Leash Walking"]);
  });

  it("places Foundations' paywall after The Bond, like in Kajabi", () => {
    const f = byKey("foundations");
    expect(f.modules.find((m) => m.ref === f.paywallAfterRef)?.title).toBe("The Bond");
    expect(byKey("moves").paywallAfterRef).toBeNull();
  });

  it("builds image URLs on the Kajabi CDN", () => {
    expect(byKey("foundations").imageUrl).toMatch(/^https:\/\/kajabi-storefronts-production\.kajabi-cdn\.com\/.+\.jpg$/);
  });
});
