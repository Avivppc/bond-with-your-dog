import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/email";
import { readPageDoc } from "@/lib/site/page-doc";
import { SECTION_DEFS } from "@/lib/site/registry";
import { loadPageRow, readSeo } from "@/lib/site/server";
import { PageEditor } from "../_components/PageEditor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit page", robots: { index: false, follow: false } };

export default async function SiteEditorPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff("content");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const row = await loadPageRow(createServiceClient(), id);
  if (!row) notFound();
  return (
    <PageEditor
      siteUrl={siteUrl()}
      page={{
        id: row.id,
        title: row.title,
        slug: row.slug,
        seo: readSeo(row.draft_seo),
        doc: readPageDoc(row.draft, SECTION_DEFS),
        rev: row.draft_rev,
        isSystem: Boolean(row.system_key),
        status: row.status,
        hasChanges: row.has_changes,
      }}
    />
  );
}
