import { z } from "zod";

/** Validation for community_meetups rows (meetups and Live Q&A sessions) and where to return after saving. */
export const MEETUP_RETURNS = ["community", "live-qa"] as const;
export type MeetupReturn = (typeof MEETUP_RETURNS)[number];

/** Missing or blank → null (fields such as the recording only appear when editing). */
const text = z.preprocess((v) => (typeof v === "string" ? v : ""), z.string().trim());
const optionalText = (max: number) => text.pipe(z.string().max(max)).transform((v) => v || null);
const optionalUrl = text
  .pipe(z.string().max(500))
  .refine((v) => v === "" || /^https:\/\/\S+$/.test(v), "Links must start with https://")
  .transform((v) => v || null);
const checkbox = z.preprocess((v) => v === "on", z.boolean());

export const MeetupSchema = z.object({
  id: z.preprocess((v) => (v === "" ? undefined : v), z.string().uuid().optional()),
  kind: z.enum(["meetup", "live_qa"]).default("meetup"),
  title: z.string().trim().min(1, "Give it a title").max(120),
  description: optionalText(4000),
  starts_at: z.string().datetime({ offset: true, message: "Pick a date and time." }),
  duration_minutes: z.coerce.number().int().min(5, "Length: 5–720 minutes.").max(720, "Length: 5–720 minutes."),
  location: optionalText(200),
  meeting_url: optionalUrl,
  cover_image_url: optionalUrl,
  published: checkbox,
  canceled: checkbox,
  recording_url: optionalUrl,
  recording_minutes: z.preprocess(
    (v) => (v === "" || v == null ? null : Number(v)),
    z.number({ message: "Recording length must be a number." }).int("Recording length: whole minutes.").min(1, "Recording length: 1–600 minutes.").max(600, "Recording length: 1–600 minutes.").nullable()
  ),
});

export function parseMeetupReturn(value: unknown): MeetupReturn {
  return value === "live-qa" ? "live-qa" : "community";
}

/** Admin URL to go back to after a meetup save/delete; Live Q&A reopens the session that changed. */
export function meetupReturnUrl(returnTo: MeetupReturn, params: Record<string, string>, openId?: string): string {
  if (returnTo === "live-qa") {
    const query = new URLSearchParams({ ...params, ...(openId ? { open: openId } : {}) }).toString();
    return `/admin/coaching/live-qa?${query}${openId ? `#session-${openId}` : ""}`;
  }
  return `/admin/community?${new URLSearchParams({ tab: "meetups", ...params }).toString()}`;
}
