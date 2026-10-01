import { describe, expect, it } from "vitest";
import data from "../../../data/kajabi/bonded-courses.json";
import { countPlan, planImport, splitBody, type KajabiExport } from "./plan";

const plan = planImport(data as KajabiExport);
const byKey = (k: string) => plan.find((c) => c.key === k)!;

describe("splitBody", () => {
  it("turns a bare Vimeo link into the lesson video", () => {
    expect(splitBody("<p>https://vimeo.com/887427804?fl=ls&amp;fe=ec</p>")).toEqual({ bodyHtml: null, vimeoUrl: "https://vimeo.com/887427804?fl=ls&fe=ec" });
  });
  it("sees through Kajabi's formatting wrappers around a lone Vimeo link", () => {
    expect(splitBody('<p><span style="font-weight: 400;">https://vimeo.com/887427804?fl=ls&amp;fe=ec</span></p>')).toEqual({
      bodyHtml: null,
      vimeoUrl: "https://vimeo.com/887427804?fl=ls&fe=ec",
    });
  });
  it("keeps a Vimeo link that sits inside real text", () => {
    expect(splitBody("<p>Watch https://vimeo.com/1 first, then practise.</p>").vimeoUrl).toBeNull();
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

  it("brings Kajabi's lesson downloads along (the four Foundations PDFs)", () => {
    const all = (mods: ReturnType<typeof byKey>["modules"]): typeof mods => mods.flatMap((m) => [m, ...all(m.children)]);
    const files = plan.flatMap((c) => all(c.modules).flatMap((m) => m.lessons.flatMap((l) => l.files.map((f) => `${l.title} → ${f.name} (${f.file})`))));
    expect(files.sort()).toEqual([
      "A Dog Is... → a_dog.pdf (a_dog.pdf)",
      "Every Dog Needs To Eat → Module 2: Feeding Drive (Module_2_Feeding_Drive.pdf)",
      "The Engagement Games → Engagement_Games.pdf (Engagement_Games.pdf)",
      "Welcome → Module 1: The Bond (Module_1_The_Bond.pdf)",
    ]);
  });

  it("turns 'How It Works' (a wrapped Vimeo link in Kajabi) into a video lesson", () => {
    const bond = byKey("foundations").modules.find((m) => m.title === "The Bond")!;
    const lesson = bond.lessons.find((l) => l.title === "How It Works")!;
    expect(lesson.vimeoUrl).toBe("https://vimeo.com/887427804?fl=ls&fe=ec");
    expect(lesson.bodyHtml).toBeNull();
  });

  it("builds image URLs on the Kajabi CDN", () => {
    expect(byKey("foundations").imageUrl).toMatch(/^https:\/\/kajabi-storefronts-production\.kajabi-cdn\.com\/.+\.jpg$/);
  });
});
