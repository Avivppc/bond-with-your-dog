import { BTN_DANGER, BTN_PRIMARY, INPUT, LABEL } from "@/app/admin/_components/ui";
import { ConfirmSubmit } from "@/app/admin/_components/ConfirmSubmit";
import { LocalDateTime } from "./LocalDateTime";
import { deleteChallenge, deleteChannel, deleteMeetup, deleteStep, saveChallenge, saveChannel, saveMeetup, saveStep } from "./actions";

/** Admin → Community forms (one per record; the same form creates or edits). */
export interface ChannelRecord {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  default_view: string;
  posting: string;
  requires_approval: boolean;
  position: number;
}

export interface ChallengeRecord {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  starts_at: string;
  ends_at: string;
  points: number;
  published: boolean;
}

export interface StepRecord {
  id: string;
  challenge_id: string;
  title: string;
  body: string | null;
  position: number;
}

export interface MeetupRecord {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  duration_minutes: number;
  location: string | null;
  meeting_url: string | null;
  cover_image_url: string | null;
  published: boolean;
  canceled: boolean;
}

function Text({ label, name, value, placeholder, required, max }: { label: string; name: string; value?: string | null; placeholder?: string; required?: boolean; max: number }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={LABEL}>{label}</span>
      <input name={name} defaultValue={value ?? ""} placeholder={placeholder} required={required} maxLength={max} className={INPUT} />
    </label>
  );
}

function Area({ label, name, value, rows = 3, max }: { label: string; name: string; value?: string | null; rows?: number; max: number }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={LABEL}>{label}</span>
      <textarea name={name} defaultValue={value ?? ""} rows={rows} maxLength={max} className={INPUT} />
    </label>
  );
}

function Check({ label, name, checked }: { label: string; name: string; checked: boolean }) {
  return (
    <label className="flex items-center gap-2.5">
      <input type="checkbox" name={name} defaultChecked={checked} className="h-4 w-4 accent-[#343332]" />
      <span className="text-sm">{label}</span>
    </label>
  );
}

export function ChannelForm({ channel }: { channel?: ChannelRecord }) {
  return (
    <div className="space-y-3">
      <form action={saveChannel} className="grid gap-3 sm:grid-cols-2">
        {channel && <input type="hidden" name="id" value={channel.id} />}
        <Text label="Name" name="name" value={channel?.name} required max={60} placeholder="Training tips" />
        <Text label="URL name" name="slug" value={channel?.slug} required max={40} placeholder="training-tips" />
        <div className="sm:col-span-2">
          <Text label="Description" name="description" value={channel?.description} max={300} />
        </div>
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>Default view</span>
          <select name="default_view" defaultValue={channel?.default_view ?? "feed"} className={INPUT}>
            <option value="feed">Feed</option>
            <option value="forum">Forum (questions)</option>
            <option value="gallery">Gallery (photos)</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>Who can post</span>
          <select name="posting" defaultValue={channel?.posting ?? "members"} className={INPUT}>
            <option value="members">All members</option>
            <option value="staff">Only the team (announcements)</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>Order</span>
          <input name="position" type="number" min={0} max={1000} defaultValue={channel?.position ?? 10} className={INPUT} />
        </label>
        <div className="flex items-end pb-2">
          <Check label="Members' posts need approval" name="requires_approval" checked={channel?.requires_approval ?? false} />
        </div>
        <div className="sm:col-span-2">
          <button type="submit" className={BTN_PRIMARY}>
            {channel ? "Save channel" : "Add channel"}
          </button>
        </div>
      </form>
      {channel && (
        <form action={deleteChannel}>
          <input type="hidden" name="id" value={channel.id} />
          <ConfirmSubmit className={BTN_DANGER} message={`Delete the "${channel.name}" channel? Its posts stay in the community feed.`}>
            Delete channel
          </ConfirmSubmit>
        </form>
      )}
    </div>
  );
}

export function ChallengeForm({ challenge }: { challenge?: ChallengeRecord }) {
  return (
    <div className="space-y-3">
      <form action={saveChallenge} className="grid gap-3 sm:grid-cols-2">
        {challenge && <input type="hidden" name="id" value={challenge.id} />}
        <div className="sm:col-span-2">
          <Text label="Title" name="title" value={challenge?.title} required max={120} placeholder="7-day focus challenge" />
        </div>
        <div className="sm:col-span-2">
          <Area label="Description" name="description" value={challenge?.description} max={4000} />
        </div>
        <LocalDateTime name="starts_at" label="Starts" defaultValue={challenge?.starts_at ?? null} required />
        <LocalDateTime name="ends_at" label="Ends" defaultValue={challenge?.ends_at ?? null} required />
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>Points for completing</span>
          <input name="points" type="number" min={0} max={10000} defaultValue={challenge?.points ?? 100} className={INPUT} />
        </label>
        <Text label="Cover image URL (optional)" name="cover_image_url" value={challenge?.cover_image_url} max={500} placeholder="https://…" />
        <Check label="Published (members can see and join)" name="published" checked={challenge?.published ?? false} />
        <div className="sm:col-span-2">
          <button type="submit" className={BTN_PRIMARY}>
            {challenge ? "Save challenge" : "Create challenge"}
          </button>
        </div>
      </form>
      {challenge && (
        <form action={deleteChallenge}>
          <input type="hidden" name="id" value={challenge.id} />
          <ConfirmSubmit className={BTN_DANGER} message={`Delete "${challenge.title}" with its steps, discussion and progress?`}>
            Delete challenge
          </ConfirmSubmit>
        </form>
      )}
    </div>
  );
}

export function StepForm({ challengeId, step, nextPosition }: { challengeId: string; step?: StepRecord; nextPosition: number }) {
  return (
    <div className="flex flex-wrap items-start gap-2">
      <form action={saveStep} className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[5rem_minmax(0,1fr)]">
        {step && <input type="hidden" name="id" value={step.id} />}
        <input type="hidden" name="challenge_id" value={challengeId} />
        <input name="position" type="number" min={0} max={1000} defaultValue={step?.position ?? nextPosition} aria-label="Order" className={INPUT} />
        <input name="title" defaultValue={step?.title ?? ""} required maxLength={160} placeholder="Step title, e.g. Day 1: Eye contact" aria-label="Step title" className={INPUT} />
        <textarea name="body" defaultValue={step?.body ?? ""} rows={2} maxLength={4000} placeholder="What to do (optional)" aria-label="Step instructions" className={`${INPUT} sm:col-span-2`} />
        <div className="sm:col-span-2">
          <button type="submit" className={BTN_PRIMARY}>
            {step ? "Save step" : "Add step"}
          </button>
        </div>
      </form>
      {step && (
        <form action={deleteStep}>
          <input type="hidden" name="id" value={step.id} />
          <ConfirmSubmit className={BTN_DANGER} message={`Delete step "${step.title}"?`}>
            Delete
          </ConfirmSubmit>
        </form>
      )}
    </div>
  );
}

export function MeetupForm({ meetup }: { meetup?: MeetupRecord }) {
  return (
    <div className="space-y-3">
      <form action={saveMeetup} className="grid gap-3 sm:grid-cols-2">
        {meetup && <input type="hidden" name="id" value={meetup.id} />}
        <div className="sm:col-span-2">
          <Text label="Title" name="title" value={meetup?.title} required max={120} placeholder="Live Q&A with Roni" />
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
        <div className="sm:col-span-2">
          <button type="submit" className={BTN_PRIMARY}>
            {meetup ? "Save meetup" : "Create meetup"}
          </button>
        </div>
      </form>
      {meetup && (
        <form action={deleteMeetup}>
          <input type="hidden" name="id" value={meetup.id} />
          <ConfirmSubmit className={BTN_DANGER} message={`Delete "${meetup.title}" and its RSVPs?`}>
            Delete meetup
          </ConfirmSubmit>
        </form>
      )}
    </div>
  );
}
