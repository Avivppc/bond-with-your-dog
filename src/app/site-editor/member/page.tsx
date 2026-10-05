import { requireStaff } from "@/lib/admin";
import { loadDraftMemberArea } from "@/lib/member-area/server";
import { MemberAreaEditor } from "../_components/MemberAreaEditor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Member area", robots: { index: false, follow: false } };

/** Website → Member area, previewed live as members see it. */
export default async function MemberAreaEditorPage() {
  await requireStaff("content");
  const draft = await loadDraftMemberArea();
  return <MemberAreaEditor initial={draft.settings} rev={draft.rev} hasChanges={draft.hasChanges} />;
}
