import { describe, expect, test } from "vitest";
import { chromeCornerForLang, installGuideOf, installPlatformOf, isInAppBrowserUa, isIosSafariUa, isIpadUa } from "./browser-env";

const IPHONE_SAFARI_18 = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1";
// iOS 26 keeps the OS token frozen at 18_6; only Version/ tells.
const IPHONE_SAFARI_26 = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1";
const IPHONE_CHROME = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/140.0 Mobile/15E148 Safari/604.1";
const IPAD = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15";
const ANDROID_CHROME = "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Mobile Safari/537.36";
const INSTAGRAM = `${IPHONE_SAFARI_18} Instagram 350.0`;
const MAC_CHROME = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36";

describe("installPlatformOf", () => {
  test("iPhone, iPad (which says Macintosh) and Android", () => {
    expect(installPlatformOf(IPHONE_SAFARI_18, 5)).toBe("ios");
    expect(installPlatformOf(IPAD, 5)).toBe("ios");
    expect(installPlatformOf(ANDROID_CHROME, 5)).toBe("android");
  });

  test("a Mac without touch is neither", () => {
    expect(installPlatformOf(MAC_CHROME, 0)).toBe("other");
    expect(installPlatformOf(IPAD, 0)).toBe("other");
  });
});

describe("installGuideOf", () => {
  test("picks the walkthrough that matches the browser's buttons", () => {
    expect(installGuideOf(IPHONE_SAFARI_18, "ios")).toBe("ios");
    expect(installGuideOf(IPHONE_SAFARI_26, "ios")).toBe("ios26");
    expect(installGuideOf(IPHONE_CHROME, "ios")).toBe("ios-chrome");
    expect(installGuideOf(ANDROID_CHROME, "android")).toBe("android");
  });
});

describe("browser checks", () => {
  test("in-app browsers and real Safari", () => {
    expect(isInAppBrowserUa(INSTAGRAM)).toBe(true);
    expect(isInAppBrowserUa(IPHONE_SAFARI_18)).toBe(false);
    expect(isIosSafariUa(IPHONE_SAFARI_18)).toBe(true);
    expect(isIosSafariUa(IPHONE_CHROME)).toBe(false);
  });

  test("an iPad is an iPad even when it says Macintosh", () => {
    expect(isIpadUa(IPAD, 5)).toBe(true);
    expect(isIpadUa(IPHONE_SAFARI_18, 5)).toBe(false);
    expect(installGuideOf(IPAD, "ios")).toBe("ios");
  });

  test("Hebrew and Arabic phones mirror the browser's top corner", () => {
    expect(chromeCornerForLang("he-IL")).toBe("left");
    expect(chromeCornerForLang("iw")).toBe("left");
    expect(chromeCornerForLang("en-US")).toBe("right");
  });
});
