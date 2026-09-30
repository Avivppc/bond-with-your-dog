"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { MeetupSchema, meetupReturnUrl, parseMeetupReturn } from "./meetup-schema";

/** Admin → Community: settings, channels, challenges (with steps) and meetups. */
type Tab = "settings" | "channels" | "challenges";

function back(tab: Tab, params: Record<string, string>): never {
  redirect(`/admin/community?${new URLSearchParams({ tab, ...params }).toString()}`);
}

const checkbox = z.preprocess((v) => v === "on", z.boolean());
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null);
const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^https:\/\//.test(v), "Links must start with https://")
  .transform((v) => v || null);
const isoDate = z.string().datetime({ offset: true, message: "Pick a date and time." });
const uuid = z.string().uuid();

function done(tab: Tab): never {
  revalidatePath("/admin/community");
  revalidatePath("/community", "layout");
  back(tab, { saved: "1" });
}

async function write(tab: Tab, what: string, op: PromiseLike<{ error: { message: string; code?: string } | null }>): Promise<void> {
  const { error } = await op;
  if (error) {
    console.error(`[admin/community] ${what} failed`, error.message);
    back(tab, { error: error.code === "23505" ? "That URL name is already used." : `Could not save the ${what}.` });
  }
}

// ── Settings ────────────────────────────────────────────────
const Settings = z.object({
  name: z.string().trim().min(1, "Give the community a name").max(80),
  description: optionalText(500),
  cover_image_url: optionalUrl,
  guidelines: optionalText(4000),
  whatsapp_url: optionalUrl,
  open_to_students: checkbox,
  require_approval: checkbox,
});

export async function saveCommunitySettings(formData: FormData): Promise<void> {
  await requireStaff("content");
  const parsed = Settings.safeParse(Object.fromEntries(formData));
  if (!parsed.success) back("settings", { error: parsed.error.issues[0].message });
  await write("settings", "settings", createServiceClient().from("community_settings").update({ ...parsed.data, updated_at: new Date().toISOString() }).eq("id", 1));
  done("settings");
}

// ── Channels ────────────────────────────────────────────────
const Channel = z.object({
  id: uuid.optional(),
  name: z.string().trim().min(1, "Name the channel").max(60),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]{2,40}$/, "URL name: 2–40 lowercase letters, numbers or dashes"),
  description: optionalText(300),
  default_view: z.enum(["feed", "forum", "gallery"]),
  posting: z.enum(["members", "staff"]),
  requires_approval: checkbox,
  position: z.coerce.number().int().min(0).max(1000),
});

export async function saveChannel(formData: FormData): Promise<void> {
  await requireStaff("content");
  const parsed = Channel.safeParse(Object.fromEntries(formData));
  if (!parsed.success) back("channels", { error: parsed.error.issues[0].message });
  const { id, ...fields } = parsed.data;
  const sb = createServiceClient();
  await write("channels", "channel", id ? sb.from("community_channels").update(fields).eq("id", id) : sb.from("community_channels").insert(fields));
  done("channels");
}

export async function deleteChannel(formData: FormData): Promise<void> {
  await requireStaff("content");
  const id = uuid.safeParse(formData.get("id"));
  if (!id.success) back("channels", { error: "Invalid channel." });
  await write("channels", "channel", createServiceClient().from("community_channels").delete().eq("id", id.data));
  done("channels");
}

// ── Challenges ──────────────────────────────────────────────
const Challenge = z
  .object({
    id: uuid.optional(),
    title: z.string().trim().min(1, "Give the challenge a title").max(120),
    description: optionalText(4000),
    cover_image_url: optionalUrl,
    starts_at: isoDate,
    ends_at: isoDate,
    points: z.coerce.number().int().min(0).max(10000),
    published: checkbox,
  })
  .refine((c) => new Date(c.ends_at) > new Date(c.starts_at), "The challenge must end after it starts.");

export async function saveChallenge(formData: FormData): Promise<void> {
  await requireStaff("content");
  const parsed = Challenge.safeParse(Object.fromEntries(formData));
  if (!parsed.success) back("challenges", { error: parsed.error.issues[0].message });
  const { id, ...fields } = parsed.data;
  const sb = createServiceClient();
  await write("challenges", "challenge", id ? sb.from("community_challenges").update(fields).eq("id", id) : sb.from("community_challenges").insert(fields));
  done("challenges");
}

export async function deleteChallenge(formData: FormData): Promise<void> {
  await requireStaff("content");
  const id = uuid.safeParse(formData.get("id"));
  if (!id.success) back("challenges", { error: "Invalid challenge." });
  await write("challenges", "challenge", createServiceClient().from("community_challenges").delete().eq("id", id.data));
  done("challenges");
}

const Step = z.object({
  id: uuid.optional(),
  challenge_id: uuid,
  title: z.string().trim().min(1, "Name the step").max(160),
  body: optionalText(4000),
  position: z.coerce.number().int().min(0).max(1000),
});

export async function saveStep(formData: FormData): Promise<void> {
  await requireStaff("content");
  const parsed = Step.safeParse(Object.fromEntries(formData));
  if (!parsed.success) back("challenges", { error: parsed.error.issues[0].message });
  const { id, ...fields } = parsed.data;
  const sb = createServiceClient();
  await write("challenges", "step", id ? sb.from("community_challenge_steps").update(fields).eq("id", id) : sb.from("community_challenge_steps").insert(fields));
  done("challenges");
}

export async function deleteStep(formData: FormData): Promise<void> {
  await requireStaff("content");
  const id = uuid.safeParse(formData.get("id"));
  if (!id.success) back("challenges", { error: "Invalid step." });
  await write("challenges", "step", createServiceClient().from("community_challenge_steps").delete().eq("id", id.data));
  done("challenges");
}

// ── Meetups & Live Q&A sessions ─────────────────────────────
export async function saveMeetup(formData: FormData): Promise<void> {
  await requireStaff("content");
  const returnTo = parseMeetupReturn(formData.get("return_to"));
  const parsed = MeetupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const editing = uuid.safeParse(formData.get("id"));
    redirect(meetupReturnUrl(returnTo, { error: parsed.error.issues[0].message }, editing.success ? editing.data : undefined));
  }
  const { id, ...fields } = parsed.data;
  const sb = createServiceClient();
  const { data, error } = id
    ? await sb.from("community_meetups").update(fields).eq("id", id).select("id").maybeSingle()
    : await sb.from("community_meetups").insert(fields).select("id").single();
  if (error || !data) {
    console.error("[admin/community] meetup save failed", error?.message ?? "not found");
    redirect(meetupReturnUrl(returnTo, { error: `Could not save the ${fields.kind === "live_qa" ? "session" : "meetup"}.` }, id));
  }
  revalidateMeetups();
  redirect(meetupReturnUrl(returnTo, { saved: "1" }, data.id as string));
}

export async function deleteMeetup(formData: FormData): Promise<void> {
  await requireStaff("content");
  const returnTo = parseMeetupReturn(formData.get("return_to"));
  const id = uuid.safeParse(formData.get("id"));
  if (!id.success) redirect(meetupReturnUrl(returnTo, { error: "Invalid meetup." }));
  const { error } = await createServiceClient().from("community_meetups").delete().eq("id", id.data);
  if (error) {
    console.error("[admin/community] meetup delete failed", error.message);
    redirect(meetupReturnUrl(returnTo, { error: "Could not delete it." }, id.data));
  }
  revalidateMeetups();
  redirect(meetupReturnUrl(returnTo, { saved: "1" }));
}

function revalidateMeetups(): void {
  revalidatePath("/admin/community");
  revalidatePath("/admin/coaching/live-qa");
  revalidatePath("/community", "layout");
}
