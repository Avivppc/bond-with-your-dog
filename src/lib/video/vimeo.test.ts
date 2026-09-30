import { describe, expect, it } from "vitest";
import { parseVimeoUrl, vimeoEmbedUrl } from "./vimeo";

describe("parseVimeoUrl", () => {
  it.each([
    ["https://vimeo.com/123456789", { id: "123456789", hash: null }],
    ["vimeo.com/123456789", { id: "123456789", hash: null }],
    ["https://vimeo.com/123456789/abcdef1234", { id: "123456789", hash: "abcdef1234" }],
    ["https://player.vimeo.com/video/123456789", { id: "123456789", hash: null }],
    ["https://player.vimeo.com/video/123456789?h=abcdef1234&badge=0", { id: "123456789", hash: "abcdef1234" }],
    ["https://vimeo.com/channels/staffpicks/123456789", { id: "123456789", hash: null }],
    ["https://vimeo.com/showcase/9876543/video/123456789", { id: "123456789", hash: null }],
    ["https://vimeo.com/manage/videos/123456789", { id: "123456789", hash: null }],
    ["https://vimeo.com/manage/videos/123456789/abcdef1234", { id: "123456789", hash: "abcdef1234" }],
    ["  https://www.vimeo.com/123456789?share=copy  ", { id: "123456789", hash: null }],
  ])("parses %s", (url, expected) => {
    expect(parseVimeoUrl(url)).toEqual(expected);
  });

  it.each([
    "",
    "not a url",
    "https://youtube.com/watch?v=123456789",
    "https://evil.com/vimeo.com/123456789",
    "https://vimeo.com/",
    "https://vimeo.com/about",
    "javascript:alert(1)",
  ])("rejects %s", (url) => {
    expect(parseVimeoUrl(url)).toBeNull();
  });
});

describe("vimeoEmbedUrl", () => {
  it("builds a privacy-friendly player URL and keeps the unlisted hash", () => {
    const url = new URL(vimeoEmbedUrl({ id: "123456789", hash: "abcdef1234" }));
    expect(url.origin + url.pathname).toBe("https://player.vimeo.com/video/123456789");
    expect(url.searchParams.get("h")).toBe("abcdef1234");
    expect(url.searchParams.get("dnt")).toBe("1");
  });

  it("omits h when the video is not unlisted", () => {
    expect(new URL(vimeoEmbedUrl({ id: "1", hash: null })).searchParams.has("h")).toBe(false);
  });
});
