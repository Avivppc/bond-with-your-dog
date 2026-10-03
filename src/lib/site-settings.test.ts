import { describe, expect, test } from "vitest";
import { isSocialUrl, readSocial, siteSettingsForm, socialFromForm } from "./site-settings";
import { notifyPrefsFromForm, readNotifyPrefs, teamRecipient, DEFAULT_NOTIFY } from "./notifications";

describe("isSocialUrl", () => {
  test("accepts https links on the network's own domain or a subdomain", () => {
    expect(isSocialUrl("instagram", "https://instagram.com/bonded.dog")).toBe(true);
    expect(isSocialUrl("instagram", "https://www.instagram.com/bonded.dog")).toBe(true);
    expect(isSocialUrl("youtube", "https://youtu.be/abc")).toBe(true);
    expect(isSocialUrl("whatsapp", "https://chat.whatsapp.com/AbC")).toBe(true);
  });

  test("rejects http, look-alike domains, other networks and credentials", () => {
    expect(isSocialUrl("instagram", "http://instagram.com/x")).toBe(false);
    expect(isSocialUrl("instagram", "https://instagram.com.evil.dev/x")).toBe(false);
    expect(isSocialUrl("instagram", "https://notinstagram.com/x")).toBe(false);
    expect(isSocialUrl("facebook", "https://instagram.com/x")).toBe(false);
    expect(isSocialUrl("tiktok", "https://user:pw@tiktok.com/@x")).toBe(false);
    expect(isSocialUrl("tiktok", "javascript:alert(1)")).toBe(false);
  });
});

describe("readSocial", () => {
  test("keeps only valid links for known networks", () => {
    expect(readSocial({ instagram: "https://instagram.com/a", youtube: "http://youtube.com/b", myspace: "https://myspace.com/c" })).toEqual({
      instagram: "https://instagram.com/a",
    });
    expect(readSocial(null)).toEqual({});
    expect(readSocial(["x"])).toEqual({});
  });
});

describe("siteSettingsForm", () => {
  const base = { academy_name: " Bonded ", contact_email: "info@bonded.dog", instagram: "", youtube: "", facebook: "", tiktok: "", whatsapp: "" };

  test("trims and drops empty social fields", () => {
    const parsed = siteSettingsForm.parse({ ...base, instagram: " https://instagram.com/bonded " });
    expect(parsed.academy_name).toBe("Bonded");
    expect(socialFromForm(parsed)).toEqual({ instagram: "https://instagram.com/bonded" });
  });

  test("explains a wrong social link", () => {
    const result = siteSettingsForm.safeParse({ ...base, youtube: "https://vimeo.com/x" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain("YouTube");
  });

  test("requires a name and a real contact email", () => {
    expect(siteSettingsForm.safeParse({ ...base, academy_name: "  " }).success).toBe(false);
    expect(siteSettingsForm.safeParse({ ...base, contact_email: "nope" }).success).toBe(false);
  });
});

describe("notification prefs", () => {
  test("fills in defaults for missing or malformed values", () => {
    expect(readNotifyPrefs(null)).toEqual(DEFAULT_NOTIFY);
    expect(readNotifyPrefs({ orders: false, leads: "yes" })).toEqual({ ...DEFAULT_NOTIFY, orders: false });
  });

  test("reads checkboxes: an unchecked box isn't sent, so it means off", () => {
    expect(notifyPrefsFromForm({ notify_orders: "on", notify_leads: "on" })).toEqual({ orders: true, videos: false, questions: false, inbox: false, leads: true });
  });

  test("sends to the team email, else COACH_INBOX", () => {
    expect(teamRecipient("team@bonded.dog", "coach@x.dev")).toBe("team@bonded.dog");
    expect(teamRecipient(null, " coach@x.dev ")).toBe("coach@x.dev");
    expect(teamRecipient("  ", undefined)).toBeNull();
  });
});
