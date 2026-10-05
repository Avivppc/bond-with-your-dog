import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SitePage } from "@/components/site/SitePage";
import { loadLiveCustomPage, loadLiveTheme } from "@/lib/site/server";
import { pageMetadata } from "@/lib/site/metadata";
import { RESERVED_SLUGS, slugProblem } from "@/lib/site/system-pages";

/** Pages made in Website → Pages, at bonded.dog/<address>. The app's own routes always win. */

async function load(slug: string) {
  if (slugProblem(slug) || RESERVED_SLUGS.has(slug)) return null;
  try {
    return await loadLiveCustomPage(slug);
  } catch (error: unknown) {
    console.error("[site] custom page load failed", { slug, error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const page = await load((await params).slug);
  return page ? pageMetadata(page) : {};
}

export default async function CustomSitePage({ params }: { params: Promise<{ slug: string }> }) {
  const page = await load((await params).slug);
  if (!page) notFound();
  return <SitePage doc={page.doc} theme={await loadLiveTheme()} />;
}
