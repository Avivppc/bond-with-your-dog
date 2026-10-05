import "server-only";
import { randomUUID } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/admin";
import { sniffImageType, validateEmailImage } from "@/app/admin/_components/email-editor/upload-rules";
import { LIBRARY_BUCKETS, mediaName, mediaOrigin, type MediaSource } from "./sources";

/** Website and library uploads live here (public, one folder per year). */
export const SITE_MEDIA_BUCKET = "site-media";
export const MAX_LIBRARY_IMAGE_BYTES = 5 * 1024 * 1024;
export const MEDIA_PER_PAGE = 48;

export type StoreResult = { url: string } | { error: string };

/** Checks and stores one uploaded image in the library; returns its public URL. */
export async function storeLibraryImage(userId: string, file: File): Promise<StoreResult> {
  const invalid = validateEmailImage({ type: file.type, size: Math.min(file.size, 1) });
  if (invalid) return { error: invalid };
  if (file.size > MAX_LIBRARY_IMAGE_BYTES) return { error: "Images can be up to 5 MB. Try a smaller or compressed version." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffImageType(bytes);
  if (!type || type !== file.type) return { error: "That file doesn't look like a valid image. Try exporting it again as PNG or JPG." };
  const ext = type.split("/")[1].replace("jpeg", "jpg");
  const path = `${new Date().getUTCFullYear()}/${randomUUID()}.${ext}`;
  try {
    const storage = createServiceClient().storage.from(SITE_MEDIA_BUCKET);
    const { error } = await storage.upload(path, bytes, { contentType: type, cacheControl: "31536000", upsert: false });
    if (error) {
      console.error("[media] upload failed", { userId, path, error: error.message });
      return { error: "Could not upload the image. Please try again." };
    }
    return { url: storage.getPublicUrl(path).data.publicUrl };
  } catch (err) {
    console.error("[media] upload threw", { userId, error: err instanceof Error ? err.message : String(err) });
    return { error: "Could not upload the image. Please try again." };
  }
}

/** The public URL prefixes of the library buckets (a picked URL must start with one). */
export function libraryPublicBases(): string[] {
  const sb = createServiceClient();
  return LIBRARY_BUCKETS.map((bucket) => sb.storage.from(bucket).getPublicUrl("").data.publicUrl);
}

export interface MediaItem {
  url: string;
  name: string;
  origin: string;
  sizeBytes: number | null;
  createdAt: string | null;
}

export interface MediaPage {
  items: MediaItem[];
  total: number;
  failed: boolean;
}

interface LibraryRow {
  bucket: string;
  path: string;
  size_bytes: number | null;
  created_at: string | null;
  total_count: number;
}

/** One page of the library, newest first. */
export async function loadMediaLibrary(search: string, source: MediaSource, offset: number, limit = MEDIA_PER_PAGE): Promise<MediaPage> {
  const sb = createServiceClient();
  const { data, error } = await sb.rpc("admin_media_library", {
    p_search: search || null,
    p_source: source === "all" ? null : source,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) {
    console.error("[media] library list failed", { search, source, error: error.message });
    return { items: [], total: 0, failed: true };
  }
  const rows = (data ?? []) as LibraryRow[];
  return {
    total: Number(rows[0]?.total_count ?? 0),
    failed: false,
    items: rows.map((r) => ({
      url: sb.storage.from(r.bucket).getPublicUrl(r.path).data.publicUrl,
      name: mediaName(r.path),
      origin: mediaOrigin(r.bucket, r.path),
      sizeBytes: r.size_bytes === null ? null : Number(r.size_bytes),
      createdAt: r.created_at,
    })),
  };
}
