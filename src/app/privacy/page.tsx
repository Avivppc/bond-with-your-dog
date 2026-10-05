import type { Metadata } from "next";
import { SitePage } from "@/components/site/SitePage";
import { loadLiveSystemPage, loadLiveTheme } from "@/lib/site/server";
import { pageMetadata } from "@/lib/site/metadata";

/** The Privacy Policy, edited in Website → Pages (until then, the built-in sections). */
export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata(await loadLiveSystemPage("privacy"));
}

export default async function PrivacyPage() {
  const [page, theme] = await Promise.all([loadLiveSystemPage("privacy"), loadLiveTheme()]);
  return <SitePage doc={page.doc} theme={theme} />;
}
