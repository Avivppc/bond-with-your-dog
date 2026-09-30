import "server-only";
import { z } from "zod";
import type { VimeoRef } from "./vimeo";

export interface VimeoMeta {
  title: string | null;
  durationSeconds: number | null;
  thumbnailUrl: string | null;
}

const OEmbed = z.object({
  title: z.string().optional(),
  duration: z.number().optional(),
  thumbnail_url: z.string().url().optional(),
});

const TIMEOUT_MS = 5000;

/**
 * Best-effort metadata via Vimeo oEmbed (no API key). Domain-restricted videos only
 * answer when the Referer is an allowed domain, so we send the site URL. Returns null
 * on any failure — the video still plays; only the preview data is missing.
 */
export async function fetchVimeoMeta(ref: VimeoRef): Promise<VimeoMeta | null> {
  const videoUrl = `https://vimeo.com/${ref.id}${ref.hash ? `/${ref.hash}` : ""}`;
  const endpoint = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(videoUrl)}`;
  try {
    const res = await fetch(endpoint, {
      headers: { Referer: process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.bonded.dog" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) {
      console.warn("vimeo oembed unavailable", { id: ref.id, status: res.status });
      return null;
    }
    const parsed = OEmbed.safeParse(await res.json());
    if (!parsed.success) return null;
    return {
      title: parsed.data.title ?? null,
      durationSeconds: parsed.data.duration ?? null,
      thumbnailUrl: parsed.data.thumbnail_url ?? null,
    };
  } catch (error: unknown) {
    console.warn("vimeo oembed failed", { id: ref.id, error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}
