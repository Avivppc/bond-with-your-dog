import "server-only";
import { createServiceClient } from "@/lib/supabase/admin";
import { isPreviewablePhoto, STORY_MEDIA_BUCKET } from "@/lib/community/story-media";

/** Story photos live in a private bucket; the inbox shows them through short-lived signed URLs. */
const PHOTO_URL_SECONDS = 10 * 60;

/** path → signed URL for every photo on the listed requests (missing files are left out). */
export async function signStoryPhotos(paths: readonly string[]): Promise<Map<string, string>> {
  if (paths.length === 0) return new Map();
  const { data, error } = await createServiceClient().storage.from(STORY_MEDIA_BUCKET).createSignedUrls([...paths], PHOTO_URL_SECONDS);
  if (error) {
    console.error("[inbox] story photo urls failed", { count: paths.length, error: error.message });
    return new Map();
  }
  return new Map((data ?? []).flatMap((d) => (d.path && d.signedUrl ? [[d.path, d.signedUrl] as const] : [])));
}

/** Thumbnails that open the full photo in a new tab (HEIC is a link: most browsers can't show it inline). */
export function StoryPhotoStrip({ paths, urls }: { paths: readonly string[]; urls: ReadonlyMap<string, string> }) {
  if (paths.length === 0) return null;
  return (
    <ul className="mt-3 flex flex-wrap gap-2" aria-label="Photos">
      {paths.map((path, i) => {
        const url = urls.get(path);
        const label = `Photo ${i + 1}`;
        return (
          <li key={path}>
            {!url ? (
              <span className="flex h-24 w-24 items-center justify-center rounded-[8px] border border-dashed border-[#d9d8d6] text-center text-[12px] text-[#6c6a69]">
                {label} unavailable
              </span>
            ) : isPreviewablePhoto(path) ? (
              <a href={url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-[8px] border border-[#e7e6e4]">
                {/* eslint-disable-next-line @next/next/no-img-element -- signed URL to a private member photo */}
                <img src={url} alt={label} className="h-24 w-24 object-cover" />
              </a>
            ) : (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-[8px] border border-[#e7e6e4] bg-[#f8f8f8] text-[12px] text-[#343332] hover:bg-[#f3f3f2]"
              >
                <span className="material-symbols-outlined text-[20px]" aria-hidden>
                  photo
                </span>
                {label} (HEIC)
              </a>
            )}
          </li>
        );
      })}
    </ul>
  );
}
