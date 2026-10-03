import type { Metadata } from "next";
import { SitePage } from "@/components/site/SitePage";
import { loadLiveSystemPage, loadLiveTheme } from "@/lib/site/server";
import { pageMetadata } from "@/lib/site/metadata";

/** The Bonded Journey page, edited in Website → Pages (until then, the built-in sections). */
export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata(await loadLiveSystemPage("courses"));
}

export default async function CoursesPage() {
  const [page, theme] = await Promise.all([loadLiveSystemPage("courses"), loadLiveTheme()]);
  return <SitePage doc={page.doc} theme={theme} />;
}
