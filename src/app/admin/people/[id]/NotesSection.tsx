import { LocalTime } from "@/components/ui/LocalTime";
import { BTN_PRIMARY, Card, INPUT } from "../../_components/ui";
import { ConfirmSubmit } from "../../_components/ConfirmSubmit";
import type { ContactNotes } from "../_lib/notes-data";
import { addContactNote, deleteContactNote } from "./notes-actions";

/** Kajabi's contact notes: private to the team, newest first. */
export function NotesSection({ contactId, notes }: { contactId: string; notes: ContactNotes }) {
  return (
    <div id="notes">
      <Card title="Notes" description="Private to the team — the contact never sees these.">
        <form action={addContactNote} className="space-y-2">
          <input type="hidden" name="contact_id" value={contactId} />
          <label className="block">
            <span className="sr-only">New note</span>
            <textarea name="body" required maxLength={5000} rows={3} placeholder="Add a note…" className={INPUT} />
          </label>
          <button type="submit" className={BTN_PRIMARY}>
            Add note
          </button>
        </form>
        {notes.failed ? (
          <p className="mt-4 text-[14px] text-red-700">Notes couldn&apos;t be loaded. Please refresh the page.</p>
        ) : notes.notes.length === 0 ? (
          <p className="mt-4 text-[14px] text-[#6c6a69]">No notes yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-[#efeeed] text-[14px]">
            {notes.notes.map((n) => (
              <li key={n.id} className="py-3">
                <p className="whitespace-pre-wrap break-words">{n.body}</p>
                <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-[12px] text-[#6c6a69]">
                  <span>
                    {n.author ?? "Former team member"} · <LocalTime iso={n.createdAt} format="dateTime" />
                  </span>
                  <form action={deleteContactNote}>
                    <input type="hidden" name="contact_id" value={contactId} />
                    <input type="hidden" name="id" value={n.id} />
                    <ConfirmSubmit message="Delete this note?" className="font-medium text-red-700 hover:underline">
                      Delete
                    </ConfirmSubmit>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
