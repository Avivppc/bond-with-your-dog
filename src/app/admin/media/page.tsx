import Link from "next/link";
import { requireStaff } from "@/lib/admin";
import { pageWindow, parsePage } from "@/lib/admin-helpers/pagination";
import { loadMediaLibrary, MEDIA_PER_PAGE } from "@/lib/media/server";
import { MEDIA_SOURCES, parseMediaSource, type MediaSource } from "@/lib/media/sources";
import { EmptyState, INPUT, Notice, PageHeader } from "../_components/ui";
import { Pagination, shortDate } from "../_components/list-kit";
import { MediaUploader } from "./MediaUploader";
import { CopyLinkButton } from "./CopyLinkButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "Media library" };

const MAX_SEARCH = 100;

function size(bytes: number | null): string {
  if (bytes === null) return "";
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function hrefFor(q: string, source: MediaSource, page = 1): string {
  const params = new URLSearchParams({
    ...(q ? { q } : {}),
    ...(source !== "all" ? { source } : {}),
    ...(page > 1 ? { page: String(page) } : {}),
  });
  const query = params.toString();
  return `/admin/media${query ? `?${query}` : ""}`;
}

/** Every image the team uploaded (website, course covers, lesson thumbnails), to find, reuse and share. */
export default async function MediaLibraryPage({ searchParams }: { searchParams: Promise<{ q?: string; source?: string; page?: string }> }) {
  await requireStaff("content");
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim().slice(0, MAX_SEARCH) : "";
  const source = parseMediaSource(params.source);
  const requested = parsePage(params.page);
  const library = await loadMediaLibrary(q, source, (requested - 1) * MEDIA_PER_PAGE);
  const win = pageWindow(library.total, requested, MEDIA_PER_PAGE);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Media library"
        description="Every image on the website and in your courses. Upload once, then pick it for a course cover, a lesson thumbnail or a website section."
        actions={<MediaUploader />}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Source">
          {MEDIA_SOURCES.map((s) => (
            <Link
              key={s.key}
              href={hrefFor(q, s.key)}
              aria-current={s.key === source ? "true" : undefined}
              className={`rounded-full border px-3 py-1 text-[14px] ${s.key === source ? "border-[#343332] bg-[#343332] text-white" : "border-[#d9d8d6] bg-white hover:bg-[#f3f3f2]"}`}
            >
              {s.label}
            </Link>
          ))}
        </div>
        <form action="/admin/media" className="flex items-center gap-2">
          {source !== "all" && <input type="hidden" name="source" value={source} />}
          <input name="q" defaultValue={q} placeholder="Search by file name" aria-label="Search images" className={`${INPUT} w-56`} />
        </form>
      </div>

      {library.failed && <Notice tone="error">The library couldn&apos;t be loaded. Please refresh the page.</Notice>}
      {!library.failed && library.items.length === 0 ? (
        <div className="rounded-[12px] border border-[#e7e6e4] bg-white">
          <EmptyState title={q ? "No images match your search." : "No images yet."}>Upload images to use them across the site and your courses.</EmptyState>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {library.items.map((item) => (
            <li key={item.url} className="overflow-hidden rounded-[12px] border border-[#e7e6e4] bg-white">
              <a href={item.url} target="_blank" rel="noreferrer" className="block aspect-[4/3] bg-[#f3f3f2]">
                {/* eslint-disable-next-line @next/next/no-img-element -- library thumbnails of arbitrary sizes */}
                <img src={item.url} alt={item.name} loading="lazy" className="h-full w-full object-cover" />
              </a>
              <div className="space-y-1.5 p-3">
                <p className="truncate text-[13px] font-medium" title={item.name}>
                  {item.name}
                </p>
                <p className="text-[12px] text-[#6c6a69]">
                  {item.origin}
                  {item.sizeBytes !== null && ` · ${size(item.sizeBytes)}`}
                  {item.createdAt && ` · ${shortDate(item.createdAt)}`}
                </p>
                <CopyLinkButton url={item.url} />
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="flex justify-end">
        <Pagination page={win.page} pages={win.pages} hrefFor={(page) => hrefFor(q, source, page)} />
      </div>
    </div>
  );
}
