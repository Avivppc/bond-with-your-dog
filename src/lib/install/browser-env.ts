/**
 * Which browser the member app is running in, for the "Install app" guide. Pure UA work (testable
 * without a DOM); the guide reads navigator itself. Ported from SkiFit's install flow.
 */

/** Instagram's and Facebook's in-app browsers can't add to the Home Screen at all. */
export function isInAppBrowserUa(ua: string): boolean {
  return /Instagram|FBAN|FBAV|FB_IAB/i.test(ua);
}

export function isAndroidUa(ua: string): boolean {
  return /Android/i.test(ua);
}

/** iPhone or iPad; iPadOS 13+ reports a desktop Mac, the touch points give it away. */
export function isIosUa(ua: string, maxTouchPoints: number): boolean {
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && maxTouchPoints > 1);
}

/** Chrome on iOS ("CriOS"): same share sheet as Safari, but its Share button sits top-right. */
export function isIosChromeUa(ua: string): boolean {
  return /CriOS/.test(ua);
}

/** The Google app's browser on iOS can install too, with Share top-right like Chrome. */
export function isIosGoogleAppUa(ua: string): boolean {
  return /GSA\//.test(ua) && /iPad|iPhone|iPod/.test(ua);
}

/** Real Safari, not another WebKit browser stamping its own marker on Safari's UA. */
export function isIosSafariUa(ua: string): boolean {
  if (!/iPad|iPhone|iPod|Macintosh/.test(ua)) return false;
  return !/CriOS|FxiOS|EdgiOS|OPiOS|OPT\/|GSA|DuckDuckGo/i.test(ua);
}

/**
 * iPhone Safari 26+, which folds Share behind a ⋯ button in a compact bottom pill. iOS 26 freezes
 * the "iPhone OS 18_x" token in the UA, so the real version comes from "Version/26".
 */
export function isCompactIosSafariUa(ua: string): boolean {
  if (!isIosSafariUa(ua) || !/iPhone/.test(ua)) return false;
  const version = ua.match(/Version\/(\d+)/);
  return Boolean(version && Number(version[1]) >= 26);
}

/** iPad (including iPadOS reporting as a Mac): its Safari keeps Share at the top. */
export function isIpadUa(ua: string, maxTouchPoints: number): boolean {
  return /iPad/.test(ua) || (/Macintosh/.test(ua) && maxTouchPoints > 1);
}

/** Phones set to Hebrew or Arabic mirror the browser chrome: top-right buttons sit top-left. */
export function chromeCornerForLang(lang: string): "left" | "right" {
  return /^(he|iw|ar|fa|ur)\b/i.test(lang) ? "left" : "right";
}

export type InstallPlatform = "ios" | "android" | "other";

/** Which guide (and demo video) fits this browser. */
export type InstallGuide = "ios" | "ios26" | "ios-chrome" | "android";

export function installPlatformOf(ua: string, maxTouchPoints: number): InstallPlatform {
  if (isIosUa(ua, maxTouchPoints)) return "ios";
  if (isAndroidUa(ua)) return "android";
  return "other";
}

export function installGuideOf(ua: string, platform: InstallPlatform): InstallGuide {
  if (platform === "android") return "android";
  if (isIosChromeUa(ua) || isIosGoogleAppUa(ua)) return "ios-chrome";
  return isCompactIosSafariUa(ua) ? "ios26" : "ios";
}
