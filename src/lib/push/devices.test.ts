import { describe, expect, it } from "vitest";
import { deviceLabel, pushStatusByUser } from "./devices";

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1";
const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36";
const MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36";

describe("deviceLabel", () => {
  it("names the common devices", () => {
    expect(deviceLabel(IPHONE)).toBe("iPhone");
    expect(deviceLabel(ANDROID)).toBe("Android");
    expect(deviceLabel(MAC)).toBe("Mac");
    expect(deviceLabel(null)).toBe("Browser");
  });
});

describe("pushStatusByUser", () => {
  it("counts each member's devices, names them once, and keeps the latest check-in", () => {
    const status = pushStatusByUser([
      { user_id: "a", user_agent: IPHONE, last_seen_at: "2026-10-01T10:00:00Z" },
      { user_id: "a", user_agent: MAC, last_seen_at: "2026-10-04T10:00:00Z" },
      { user_id: "a", user_agent: IPHONE, last_seen_at: "2026-10-02T10:00:00Z" },
      { user_id: "b", user_agent: ANDROID, last_seen_at: "2026-10-03T10:00:00Z" },
    ]);
    expect(status.get("a")).toEqual({ devices: 3, label: "iPhone, Mac", lastSeenAt: "2026-10-04T10:00:00Z" });
    expect(status.get("b")?.label).toBe("Android");
    expect(status.has("c")).toBe(false);
  });
});
