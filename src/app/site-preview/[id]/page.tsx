import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { SitePage } from "@/components/site/SitePage";
import { readPageDoc } from "@/lib/site/page-doc";
import { SECTION_DEFS } from "@/lib/site/registry";
import { loadDraftTheme, loadPageRow } from "@/lib/site/server";
import { themeCss, themeFontsHref } from "@/lib/site/theme";
import { PreviewBridge } from "./PreviewBridge";

export const dynamic = "force-dynamic";
export const metadata = { title: "Preview", robots: { index: false, follow: false } };

/** The editor's live preview: a page's draft, with the draft theme. Staff only. */
export default async function SitePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff("content");
  const { id } = await params;
  const sb = createServiceClient();
  const [row, { theme }] = await Promise.all([/^[0-9a-f-]{36}$/.test(id) ? loadPageRow(sb, id) : Promise.resolve(null), loadDraftTheme(sb)]);
  if (!row) notFound();
  const fontsHref = themeFontsHref(theme, { all: true });
  return (
    <>
      {fontsHref && <link rel="stylesheet" href={fontsHref} />}
      {/* After the live theme in <head>, so the draft wins. Built from validated colors and fonts only. */}
      <style dangerouslySetInnerHTML={{ __html: themeCss(theme, { all: true }) }} />
      <SitePage doc={readPageDoc(row.draft, SECTION_DEFS)} theme={theme} preview />
      <PreviewBridge />
    </>
  );
}
