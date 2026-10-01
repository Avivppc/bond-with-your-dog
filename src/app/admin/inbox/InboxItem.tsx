import Link from "next/link";
import { LocalTime } from "@/components/ui/LocalTime";
import { BTN_PRIMARY, BTN_SECONDARY, INPUT, StatusPill } from "../_components/ui";
import { Avatar } from "../_components/list-kit";
import { answerRequest, approveStory, setRequestStatus } from "./actions";
import { StoryPhotoStrip } from "./story-photos";
import type { InboxStatus, InboxTab } from "@/lib/admin-helpers/inbox";

export interface SupportRequestRow {
  id: string;
  user_id: string | null;
  email: string | null;
  full_name: string | null;
  kind: InboxTab;
  subject: string | null;
  body: string;
  page_url: string | null;
  consent_public: boolean;
  status: "open" | "answered" | "closed";
  answer: string | null;
  answered_at: string | null;
  answered_by_email: string | null;
  created_at: string;
  /** Story photos in the private community-media bucket. */
  media_paths: string[] | null;
}

interface View {
  tab: InboxTab;
  status: InboxStatus;
  page: number;
}

const STATUS_TONE = { open: "warning", answered: "published", closed: "draft" } as const;

function ViewFields({ id, view }: { id: string; view: View }) {
  return (
    <>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="tab" value={view.tab} />
      <input type="hidden" name="status_view" value={view.status} />
      <input type="hidden" name="page" value={view.page} />
    </>
  );
}

function Member({ item }: { item: SupportRequestRow }) {
  const name = item.full_name || item.email?.split("@")[0] || "Deleted account";
  const body = (
    <>
      <Avatar name={name} size={28} />
      <span className="min-w-0">
        <span className="block truncate font-medium">{name}</span>
        {item.email && <span className="block truncate text-[12px] text-[#6c6a69]">{item.email}</span>}
      </span>
    </>
  );
  return item.user_id ? (
    <Link href={`/admin/people/${item.user_id}`} className="flex min-w-0 items-center gap-2 hover:underline">
      {body}
    </Link>
  ) : (
    <span className="flex min-w-0 items-center gap-2">{body}</span>
  );
}

function StoryActions({ item, view }: { item: SupportRequestRow; view: View }) {
  if (!item.consent_public) {
    return <p className="text-[12px] text-[#8a5a00]">The member did not agree to share this story publicly.</p>;
  }
  if (item.status === "closed") return null;
  return (
    <form action={approveStory} className="flex flex-wrap items-end gap-2">
      <ViewFields id={item.id} view={view} />
      <label className="flex min-w-56 flex-1 flex-col gap-1">
        <span className="text-[12px] text-[#6c6a69]">Note to the member (optional)</span>
        <input name="note" maxLength={5000} placeholder="Thank you for sharing your story…" className={INPUT} />
      </label>
      <button type="submit" className={BTN_PRIMARY}>
        Mark approved
      </button>
    </form>
  );
}

export function InboxItem({ item, view, photoUrls }: { item: SupportRequestRow; view: View; photoUrls: ReadonlyMap<string, string> }) {
  return (
    <li className="rounded-[12px] border border-[#e7e6e4] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Member item={item} />
        <span className="flex items-center gap-2 text-[12px] text-[#6c6a69]">
          <LocalTime iso={item.created_at} format="dateTime" />
          <StatusPill tone={STATUS_TONE[item.status]}>{item.status[0].toUpperCase() + item.status.slice(1)}</StatusPill>
        </span>
      </div>
      {item.subject && <h3 className="mt-3 font-semibold">{item.subject}</h3>}
      <p className="mt-1 whitespace-pre-wrap text-[14px] text-[#1a1a19]">{item.body}</p>
      <StoryPhotoStrip paths={item.media_paths ?? []} urls={photoUrls} />
      <p className="mt-2 flex flex-wrap gap-3 text-[12px] text-[#6c6a69]">
        {item.page_url && <span>Sent from: {item.page_url}</span>}
        {item.kind === "story" && <span>{item.consent_public ? "✓ OK to share publicly" : "Private — not OK to share"}</span>}
      </p>

      {item.answer && (
        <div className="mt-3 rounded-[8px] bg-[#f8f8f8] px-3 py-2 text-[14px]">
          <p className="whitespace-pre-wrap">{item.answer}</p>
          <p className="mt-1 text-[12px] text-[#6c6a69]">
            {item.answered_by_email ?? "Team"}
            {item.answered_at && (
              <>
                {" · "}
                <LocalTime iso={item.answered_at} format="dateTime" />
              </>
            )}
          </p>
        </div>
      )}

      <div className="mt-4 space-y-3 border-t border-[#efeeed] pt-4">
        {item.kind === "story" ? (
          <StoryActions item={item} view={view} />
        ) : (
          <form action={answerRequest} className="space-y-2">
            <ViewFields id={item.id} view={view} />
            <label className="block">
              <span className="sr-only">Answer</span>
              <textarea name="answer" required maxLength={5000} rows={3} defaultValue={item.answer ?? ""} placeholder="Write your answer…" className={INPUT} />
            </label>
            <button type="submit" className={BTN_PRIMARY}>
              {item.answer ? "Update answer" : "Send answer"}
            </button>
          </form>
        )}
        <form action={setRequestStatus}>
          <ViewFields id={item.id} view={view} />
          <input type="hidden" name="new_status" value={item.status === "closed" ? "open" : "closed"} />
          <button type="submit" className={BTN_SECONDARY}>
            {item.status === "closed" ? "Reopen" : "Close"}
          </button>
        </form>
      </div>
    </li>
  );
}
