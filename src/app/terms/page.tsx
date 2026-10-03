import type { Metadata } from "next";
import { SitePage } from "@/components/site/SitePage";
import { loadLiveSystemPage, loadLiveTheme } from "@/lib/site/server";
import { pageMetadata } from "@/lib/site/metadata";

/** The Terms of Service, edited in Website → Pages (until then, the built-in sections). */
export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata(await loadLiveSystemPage("terms"));
}

export default async function TermsPage() {
  const [page, theme] = await Promise.all([loadLiveSystemPage("terms"), loadLiveTheme()]);
  return <SitePage doc={page.doc} theme={theme} />;
}
