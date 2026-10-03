import { requireStaff } from "@/lib/admin";
import { PageHeader } from "@/app/admin/_components/ui";
import { listSavedReplies } from "./actions";
import { RepliesManager } from "./RepliesManager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Saved replies", robots: { index: false, follow: false } };

/** Coaching → Saved replies: the texts behind the "Saved replies" button on every reply box. */
export default async function SavedRepliesPage() {
  await requireStaff("content");
  const res = await listSavedReplies();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Saved replies"
        description="Ready-made answers for video feedback, lesson questions and the inbox. Tags like {{first_name}} fill in with the member you are answering."
      />
      <RepliesManager initial={res.ok ? res.data : []} loadError={res.ok ? null : res.error} />
    </div>
  );
}
