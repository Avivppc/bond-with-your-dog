import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { ensureSystemPageRow, loadDraftTheme } from "@/lib/site/server";
import { ThemeEditor } from "../_components/ThemeEditor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Theme", robots: { index: false, follow: false } };

/** Website → Theme, previewed on the home page's draft. */
export default async function ThemeEditorPage() {
  const { user } = await requireStaff("content");
  const sb = createServiceClient();
  const [draft, homeId] = await Promise.all([loadDraftTheme(sb), ensureSystemPageRow(sb, "home", user.id)]);
  return <ThemeEditor initial={draft.theme} rev={draft.rev} hasChanges={draft.hasChanges} previewPageId={homeId} />;
}
