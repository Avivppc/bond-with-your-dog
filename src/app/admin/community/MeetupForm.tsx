import { BTN_DANGER, BTN_PRIMARY, INPUT, LABEL } from "@/app/admin/_components/ui";
import { formatChapters, parseStoredChapters } from "@/lib/community/chapters";
import { ConfirmSubmit } from "@/app/admin/_components/ConfirmSubmit";
import { LocalDateTime } from "./LocalDateTime";
import { deleteMeetup, saveMeetup } from "./actions";
import { Area, Check, Text } from "./fields";
import type { MeetupReturn } from "./meetup-schema";

/**
 * One form for meetups and Live Q&A sessions (community_meetups rows). Used on Community → Meetups
 * (type selectable) and Coaching → Live Q&A (type fixed to live_qa), so both places agree.
 */
export type MeetupKind = "meetup" | "live_qa";

export interface MeetupRecord {
  id: string;
  kind: MeetupKind;
  title: string;
  description: string | null;
  starts_at: string;
  duration_minutes: number;
  location: string | null;
  meeting_url: string | null;
  cover_image_url: string | null;
  published: boolean;
  canceled: boolean;
  recording_url: string | null;
  recording_minutes: number | null;
  /** jsonb [{ t, title }]; read through parseStoredChapters. */
  recording_chapters: unknown;
}

interface MeetupFormProps {
  meetup?: MeetupRecord;
  /** Where to go after saving; the Live Q&A page fixes the type to live_qa. */
  returnTo?: MeetupReturn;
}

export function MeetupForm({ meetup, returnTo = "community" }: MeetupFormProps) {
  const fixedKind = returnTo === "live-qa";
  const noun = (meetup?.kind ?? (fixedKind ? "live_qa" : "meetup")) === "live_qa" ? "session" : "meetup";
  return (
    <div className="space-y-3">
      <form action={saveMeetup} className="grid gap-3 sm:grid-cols-2">
        {meetup && <input type="hidden" name="id" value={meetup.id} />}
        <input type="hidden" name="return_to" value={returnTo} />
        {fixedKind ? (
          <input type="hidden" name="kind" value="live_qa" />
        ) : (
          <label className="flex flex-col gap-1.5 sm:col-span-2 sm:max-w-xs">
            <span className={LABEL}>Type</span>
            <select name="kind" defaultValue={meetup?.kind ?? "meetup"} className={INPUT}>
              <option value="meetup">Meetup</option>
              <option value="live_qa">Live Q&amp;A with Roni</option>
            </select>
          </label>
        )}
        <div className="sm:col-span-2">
          <Text label="Title" name="title" value={meetup?.title} required max={120} placeholder={fixedKind ? "Winter Q&A with Roni" : "Training meetup"} />
        </div>
        <div className="sm:col-span-2">
          <Area label="Description" name="description" value={meetup?.description} max={4000} />
        </div>
        <LocalDateTime name="starts_at" label="Starts" defaultValue={meetup?.starts_at ?? null} required />
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>Length (minutes)</span>
          <input name="duration_minutes" type="number" min={5} max={720} defaultValue={meetup?.duration_minutes ?? 60} className={INPUT} />
        </label>
        <Text label="Meeting link (Zoom…)" name="meeting_url" value={meetup?.meeting_url} max={500} placeholder="https://zoom.us/j/…" />
        <Text label="Location (optional)" name="location" value={meetup?.location} max={200} placeholder="Online" />
        <Text label="Cover image URL (optional)" name="cover_image_url" value={meetup?.cover_image_url} max={500} placeholder="https://…" />
        <div className="flex flex-col justify-end gap-2 pb-1">
          <Check label="Published" name="published" checked={meetup?.published ?? true} />
          {meetup && <Check label="Canceled" name="canceled" checked={meetup.canceled} />}
        </div>
        {meetup && (
          <>
            <Text label="Recording link" name="recording_url" value={meetup.recording_url} max={500} placeholder="https://vimeo.com/…" />
            <label className="flex flex-col gap-1.5">
              <span className={LABEL}>Recording length (minutes)</span>
              <input name="recording_minutes" type="number" min={1} max={600} defaultValue={meetup.recording_minutes ?? ""} className={INPUT} />
            </label>
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className={LABEL}>Recording chapters (optional)</span>
              <textarea
                name="recording_chapters"
                defaultValue={formatChapters(parseStoredChapters(meetup.recording_chapters))}
                rows={5}
                maxLength={10000}
                placeholder={"0:00 Welcome\n4:30 Loose-lead walking\n1:02:15 Your questions"}
                className={`${INPUT} font-mono`}
              />
              <span className="text-xs text-[#6c6a69]">One per line: a time (mm:ss or h:mm:ss), then the title. Members can jump straight to each part.</span>
            </label>
          </>
        )}
        <div className="sm:col-span-2">
          <button type="submit" className={BTN_PRIMARY}>
            {meetup ? `Save ${noun}` : `Create ${noun}`}
          </button>
        </div>
      </form>
      {meetup && (
        <form action={deleteMeetup}>
          <input type="hidden" name="id" value={meetup.id} />
          <input type="hidden" name="return_to" value={returnTo} />
          <ConfirmSubmit className={BTN_DANGER} message={`Delete "${meetup.title}" with its RSVPs and questions?`}>
            Delete {noun}
          </ConfirmSubmit>
        </form>
      )}
    </div>
  );
}
