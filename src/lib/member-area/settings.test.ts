import { describe, expect, test } from "vitest";
import { DEFAULT_THEME } from "../site/theme";
import { activeBanners, DEFAULT_MEMBER_AREA, memberAreaSchema, memberCss, memberFontsHref, memberNav, readMemberArea, type MemberBanner } from "./settings";

describe("readMemberArea", () => {
  test("empty or broken settings give the built-in member area", () => {
    expect(readMemberArea(null)).toEqual(DEFAULT_MEMBER_AREA);
    expect(readMemberArea({ look: { colors: { canvas: "red" } } })).toEqual(DEFAULT_MEMBER_AREA);
  });

  test("a built-in page missing from a saved menu comes back at the end", () => {
    const saved = { ...DEFAULT_MEMBER_AREA, menu: DEFAULT_MEMBER_AREA.menu.filter((i) => i.href !== "/progress") };
    const menu = readMemberArea(saved).menu;
    expect(menu.at(-1)?.href).toBe("/progress");
  });
});

describe("memberAreaSchema", () => {
  test("keeps Home in the menu and refuses unsafe links", () => {
    const noHome = { ...DEFAULT_MEMBER_AREA, menu: DEFAULT_MEMBER_AREA.menu.map((i) => (i.href === "/home" ? { ...i, visible: false } : i)) };
    expect(memberAreaSchema.safeParse(noHome).success).toBe(false);
    const evil = { ...DEFAULT_MEMBER_AREA, menu: [...DEFAULT_MEMBER_AREA.menu, { href: "javascript:alert(1)", label: "x", icon: "link", visible: true, custom: true }] };
    expect(memberAreaSchema.safeParse(evil).success).toBe(false);
  });

  test("accepts a custom link", () => {
    const withLink = { ...DEFAULT_MEMBER_AREA, menu: [...DEFAULT_MEMBER_AREA.menu, { href: "https://chat.whatsapp.com/abc", label: "WhatsApp", icon: "chat", visible: true, custom: true }] };
    expect(memberAreaSchema.safeParse(withLink).success).toBe(true);
  });
});

describe("memberCss", () => {
  test("the default look following the default site adds nothing", () => {
    expect(memberCss(DEFAULT_MEMBER_AREA.look, DEFAULT_THEME)).toBe("");
    expect(memberFontsHref(DEFAULT_MEMBER_AREA.look, DEFAULT_THEME)).toBe("");
  });

  test("following a changed site theme recolors the app", () => {
    const site = { ...DEFAULT_THEME, colors: { ...DEFAULT_THEME.colors, primary: "#1d4f91" } };
    expect(memberCss(DEFAULT_MEMBER_AREA.look, site)).toContain("--cognac:#1d4f91");
  });

  test("own fonts win over a site theme with other fonts, even the built-in ones", () => {
    const site = { ...DEFAULT_THEME, headingFont: "Lora" as const };
    const look = { ...DEFAULT_MEMBER_AREA.look, followSite: false };
    expect(memberCss(look, site)).toContain('--display:"Plus Jakarta Sans", sans-serif');
    expect(memberFontsHref(look, site)).toContain("family=Plus+Jakarta+Sans");
  });

  test("own colors, fonts and square corners", () => {
    const look = { ...DEFAULT_MEMBER_AREA.look, followSite: false, colors: { ...DEFAULT_MEMBER_AREA.look.colors, accent: "#00aa55" }, headingFont: "Lora" as const, radius: "square" as const };
    const css = memberCss(look, DEFAULT_THEME);
    expect(css).toContain("--orange:#00aa55");
    expect(css).toContain('--display:"Lora", serif');
    expect(css).toContain("--r-lg:6px");
    expect(memberFontsHref(look, DEFAULT_THEME)).toContain("family=Lora");
  });
});

describe("activeBanners", () => {
  const banner = (over: Partial<MemberBanner>): MemberBanner => ({ id: "b", text: "Hi", link: { label: "", href: "" }, tone: "info", audience: "all", starts: "", ends: "", dismissible: true, ...over });

  test("respects the dates (inclusive) and the audience", () => {
    const list = [
      banner({ id: "now" }),
      banner({ id: "later", starts: "2026-10-10" }),
      banner({ id: "over", ends: "2026-10-02" }),
      banner({ id: "last-day", ends: "2026-10-03" }),
      banner({ id: "buyers", audience: "with_chapter" }),
      banner({ id: "others", audience: "without_chapter" }),
    ];
    expect(activeBanners(list, "2026-10-03", true).map((b) => b.id)).toEqual(["now", "last-day", "buyers"]);
    expect(activeBanners(list, "2026-10-03", false).map((b) => b.id)).toEqual(["now", "last-day", "others"]);
  });
});

describe("memberNav", () => {
  test("hidden items leave the menu and the tab bar; built-ins keep their highlight rules", () => {
    const menu = DEFAULT_MEMBER_AREA.menu.map((i) => (i.href === "/practice" ? { ...i, visible: false } : i.href === "/home" ? { ...i, label: "Start" } : i));
    const nav = memberNav(menu);
    expect(nav.main.map((i) => i.href)).not.toContain("/practice");
    expect(nav.tabs.map((i) => i.href)).not.toContain("/practice");
    expect(nav.main[0]).toMatchObject({ label: "Start", match: ["/home", "/notifications"] });
  });
});
