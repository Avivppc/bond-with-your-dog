import type { Metadata } from "next";
import { SitePage } from "@/components/site/SitePage";
import { loadLiveSystemPage, loadLiveTheme } from "@/lib/site/server";
import { pageMetadata } from "@/lib/site/metadata";

/** The Accessibility Statement, edited in Website → Pages (until then, the built-in sections). */
export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata(await loadLiveSystemPage("accessibility"));
}

export default async function AccessibilityPage() {
  const [page, theme] = await Promise.all([loadLiveSystemPage("accessibility"), loadLiveTheme()]);
  return <SitePage doc={page.doc} theme={theme} />;
}
