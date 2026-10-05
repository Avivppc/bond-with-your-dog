import { createServiceClient } from "@/lib/supabase/admin";
import { exactLike } from "@/lib/flows/like";
import { BTN_SECONDARY, Card, INPUT, MUTED } from "../../_components/ui";
import { addContactTag, removeContactTag } from "./tags-actions";

/** Tags on this contact: added by hand here or by flow action steps. Campaigns can go to a tag. */
export async function TagsSection({ contactId, email }: { contactId: string; email: string }) {
  // Tags live on the address, so ones added while this person was a quiz lead show too.
  const { data, error } = await createServiceClient().from("contact_tags").select("tag, source").ilike("email", exactLike(email)).order("tag");
  if (error) console.error("[person] tags failed", { contactId, error: error.message });
  const tags = [...new Map((data ?? []).map((t) => [t.tag as string, t.source as string])).entries()];

  return (
    <Card title="Tags" description="Labels for this contact. Flows add them too; campaigns can go to a tag.">
      <div id="tags" className="flex flex-col gap-3">
        {tags.length === 0 ? (
          <p className={`text-[13px] ${MUTED}`}>No tags yet.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {tags.map(([tag, source]) => (
              <li key={tag}>
                <form action={removeContactTag} className="inline-flex items-center gap-1 rounded-full bg-[#eef6f6] py-0.5 pl-2.5 pr-1 text-[13px] text-[#0e666a]">
                  <input type="hidden" name="contact_id" value={contactId} />
                  <input type="hidden" name="tag" value={tag} />
                  <span title={source.startsWith("flow:") ? "Added by a flow" : "Added by the team"}>{tag}</span>
                  <button type="submit" aria-label={`Remove tag ${tag}`} className="grid h-5 w-5 place-items-center rounded-full hover:bg-[#d6ecec]">
                    <span className="material-symbols-outlined text-[14px]" aria-hidden>
                      close
                    </span>
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <form action={addContactTag} className="flex gap-2">
          <input type="hidden" name="contact_id" value={contactId} />
          <input name="tag" required maxLength={40} placeholder="Add a tag" aria-label="New tag" className={`${INPUT} min-w-0 flex-1`} />
          <button type="submit" className={BTN_SECONDARY}>
            Add
          </button>
        </form>
      </div>
    </Card>
  );
}
