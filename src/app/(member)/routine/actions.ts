"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/admin";
import { memberClient } from "@/lib/practice/server/auth";
import { dbMessage, fail, ok, type ActionResult } from "@/lib/practice/result";
import { isOwnMusicPath, MUSIC_TYPES, musicExtension, ROUTINE_MUSIC_BUCKET, routineMusicPath, validateMusicFile } from "@/lib/practice/music";
import { formatTimecode, MAX_ITEMS, MAX_ROUTINE_SECONDS, RoutineItemSchema, sortItems } from "@/lib/practice/timeline";

const uuid = z.string().uuid();
const Name = z.string().trim().min(1, "Give your routine a name.").max(80, "Keep the name under 80 characters.");

function refresh(id?: string): void {
  revalidatePath("/routine");
  if (id) revalidatePath(`/routine/${id}`);
}

export async function createRoutine(input: { name: string; dogId: string | null }): Promise<ActionResult<{ id: string }>> {
  const name = Name.safeParse(input.name);
  if (!name.success) return fail(name.error.issues[0].message);
  const dogId = input.dogId && uuid.safeParse(input.dogId).success ? input.dogId : null;
  const member = await memberClient();
  if (!member) return fail("Please sign in again.");
  const { data, error } = await member.supabase.from("routines").insert({ user_id: member.userId, dog_id: dogId, name: name.data }).select("id").single();
  if (error || !data) {
    console.error("[routine] create failed", error?.message);
    return fail(dbMessage(error?.code));
  }
  refresh();
  return ok({ id: data.id as string });
}

export async function renameRoutine(id: string, name: string): Promise<ActionResult> {
  const parsed = Name.safeParse(name);
  if (!uuid.safeParse(id).success) return fail("Routine not found.");
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const member = await memberClient();
  if (!member) return fail("Please sign in again.");
  const { error, count } = await member.supabase.from("routines").update({ name: parsed.data, updated_at: new Date().toISOString() }, { count: "exact" }).eq("id", id);
  if (error || !count) return fail(error ? dbMessage(error.code) : "Routine not found.");
  refresh(id);
  return ok(undefined);
}

/** Removes the routine and its music file. */
export async function deleteRoutine(id: string): Promise<void> {
  if (!uuid.safeParse(id).success) redirect("/routine");
  const member = await memberClient();
  if (!member) redirect("/login?next=/routine");
  const { data } = await member.supabase.from("routines").delete().eq("id", id).select("music_path").maybeSingle();
  if (data?.music_path && isOwnMusicPath(data.music_path as string, member.userId)) {
    const { error } = await createServiceClient().storage.from(ROUTINE_MUSIC_BUCKET).remove([data.music_path as string]);
    if (error) console.error("[routine] music cleanup failed", error.message);
  }
  refresh();
  redirect("/routine");
}

const Upload = z.object({ fileName: z.string().min(1).max(255), size: z.number().int().nonnegative() });

/** Signed upload URL for a music file in the member's own folder of the private bucket. */
export async function startMusicUpload(input: z.input<typeof Upload>): Promise<ActionResult<{ path: string; token: string; contentType: string }>> {
  const parsed = Upload.safeParse(input);
  if (!parsed.success) return fail("Invalid file.");
  const invalid = validateMusicFile({ name: parsed.data.fileName, size: parsed.data.size });
  if (invalid) return fail(invalid);
  const member = await memberClient();
  if (!member) return fail("Please sign in again.");
  const path = routineMusicPath(member.userId, parsed.data.fileName, randomUUID());
  const { data, error } = await createServiceClient().storage.from(ROUTINE_MUSIC_BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    console.error("[routine] upload url failed", error?.message);
    return fail("Could not start the upload. Please try again.");
  }
  return ok({ path: data.path, token: data.token, contentType: MUSIC_TYPES[musicExtension(parsed.data.fileName) ?? "mp3"] });
}

/** Removes an uploaded song that never got attached to a routine (e.g. the save failed). */
export async function discardMusicUpload(path: string): Promise<ActionResult> {
  const member = await memberClient();
  if (!member) return fail("Please sign in again.");
  if (!isOwnMusicPath(path, member.userId)) return fail("That file isn't yours.");
  const { count } = await member.supabase.from("routines").select("id", { count: "exact", head: true }).eq("music_path", path);
  if (count) return ok(undefined); // still in use
  const { error } = await createServiceClient().storage.from(ROUTINE_MUSIC_BUCKET).remove([path]);
  if (error) console.error("[routine] discard upload failed", error.message);
  return ok(undefined);
}

const Save = z.object({
  id: uuid,
  items: z.array(RoutineItemSchema).max(MAX_ITEMS),
  music: z
    .object({
      path: z.string().max(300),
      name: z.string().trim().min(1).max(200),
      durationSeconds: z.number().int().min(1).max(MAX_ROUTINE_SECONDS),
    })
    .nullable(),
  bpm: z.number().int().min(30).max(300).nullable(),
});

export async function saveRoutine(input: z.input<typeof Save>): Promise<ActionResult> {
  const parsed = Save.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "That routine couldn't be saved.");
  const { id, items, music, bpm } = parsed.data;
  const member = await memberClient();
  if (!member) return fail("Please sign in again.");
  if (music && !isOwnMusicPath(music.path, member.userId)) return fail("That music file isn't yours.");

  const { data: before } = await member.supabase.from("routines").select("music_path, duration_seconds").eq("id", id).maybeSingle();
  if (!before) return fail("Routine not found.");
  const songLength = music?.durationSeconds ?? (before.duration_seconds as number | null);
  if (items.length > 0 && !songLength) return fail("Add music before placing moves.");
  if (songLength && items.some((i) => i.end > songLength + 0.5)) return fail("A move runs past the end of the song.");
  const moveIds = [...new Set(items.map((i) => i.move_id))];
  if (moveIds.length) {
    const { count } = await member.supabase.from("moves").select("id", { count: "exact", head: true }).in("id", moveIds);
    if ((count ?? 0) < moveIds.length) return fail("One of those moves isn't in the library anymore. Remove it and save again.");
  }
  const patch = {
    items: sortItems(items),
    bpm,
    updated_at: new Date().toISOString(),
    ...(music ? { music_path: music.path, music_name: music.name, duration_seconds: music.durationSeconds } : {}),
  };
  const { error } = await member.supabase.from("routines").update(patch).eq("id", id);
  if (error) {
    console.error("[routine] save failed", error.message);
    return fail(dbMessage(error.code));
  }
  // The previous track is no longer used once a new one is saved.
  const old = before.music_path as string | null;
  if (music && old && old !== music.path && isOwnMusicPath(old, member.userId)) {
    const { error: rmError } = await createServiceClient().storage.from(ROUTINE_MUSIC_BUCKET).remove([old]);
    if (rmError) console.error("[routine] old music cleanup failed", rmError.message);
  }
  refresh(id);
  return ok(undefined);
}

/** Sends the saved routine to Roni's inbox (a support question) and marks it as sent. */
export async function sendRoutineForFeedback(id: string, note: string): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return fail("Routine not found.");
  const extra = z.string().trim().max(1000).safeParse(note);
  if (!extra.success) return fail("Keep the note under 1000 characters.");
  const member = await memberClient();
  if (!member) return fail("Please sign in again.");
  const { supabase } = member;
  const { data: routine } = await supabase.from("routines").select("name, items, music_name, duration_seconds, bpm").eq("id", id).maybeSingle();
  if (!routine) return fail("Routine not found.");
  const items = z.array(RoutineItemSchema).safeParse(routine.items);
  if (!items.success || items.data.length === 0) return fail("Add some moves and save before sending.");

  const moveIds = [...new Set(items.data.map((i) => i.move_id))];
  const { data: moves } = await supabase.from("moves").select("id, name").in("id", moveIds);
  const names = new Map((moves ?? []).map((m) => [m.id as string, m.name as string]));
  const fmt = formatTimecode;
  const lines = sortItems(items.data).map((i) => `${fmt(i.start)}–${fmt(i.end)}  ${names.get(i.move_id) ?? "Move"}${i.lane ? " (second lane)" : ""}`);
  const body = [
    `Music: ${routine.music_name ?? "none"}${routine.duration_seconds ? ` (${fmt(routine.duration_seconds as number)})` : ""}${routine.bpm ? `, ${routine.bpm} BPM` : ""}`,
    "",
    ...lines,
    ...(extra.data ? ["", extra.data] : []),
  ].join("\n");

  const { error } = await supabase.rpc("submit_support_request", {
    p_kind: "question",
    p_subject: `Routine: ${routine.name}`.slice(0, 200),
    p_body: body.slice(0, 5000),
    p_page_url: `/routine/${id}`,
    p_consent_public: false,
  });
  if (error) {
    console.error("[routine] send for feedback failed", error.message);
    return fail(dbMessage(error.code));
  }
  const { error: markError } = await supabase.from("routines").update({ sent_for_feedback_at: new Date().toISOString() }).eq("id", id);
  if (markError) console.error("[routine] mark sent failed", markError.message);
  refresh(id);
  return ok(undefined);
}
