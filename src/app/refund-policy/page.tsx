import type { Metadata } from "next";
import { SitePage } from "@/components/site/SitePage";
import { loadLiveSystemPage, loadLiveTheme } from "@/lib/site/server";
import { pageMetadata } from "@/lib/site/metadata";

/** The Refund Policy, edited in Website → Pages (until then, the built-in sections). */
export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata(await loadLiveSystemPage("refund"));
}

export default async function RefundPolicyPage() {
  const [page, theme] = await Promise.all([loadLiveSystemPage("refund"), loadLiveTheme()]);
  return <SitePage doc={page.doc} theme={theme} />;
}
