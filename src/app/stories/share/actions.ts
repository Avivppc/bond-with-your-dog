"use server";

import { randomUUID } from "node:crypto";
import { after } from "next/server";
import { cookies, headers } from "next/headers";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/admin";
import { guestStoryPhotoPath, isGuestStoryPhotoPath, STORY_MEDIA_BUCKET, storyPhotoType, validateStoryPhoto } from "@/lib/community/story-media";
import { visitorStorySchema, visitorStorySubject, type VisitorStoryInput } from "@/lib/stories/visitor-story";
import { clientIp, verifyTurnstile } from "@/lib/turnstile";
import { notifyTeam } from "@/lib/notify-team";
import { fail, ok, type ActionResult } from "@/lib/member/result";

/**
 * The public "Share your story" form. Visitors have no account, so photos go up through signed URLs
 * into `guest/<upload session>/stories/`, where the session id is an httpOnly cookie: a story can only
 * carry photos its own browser uploaded. Uploads are limited per address and overall
 * (issue_story_upload_ticket); the story itself needs Turnstile and is saved by submit_visitor_story
 * (3 a day per email, 5 per address). Photos never sent are deleted by the hourly clean-up.
 */

const UPLOAD_COOKIE = "story_upload";
const UPLOAD_COOKIE_SECONDS = 24 * 60 * 60;

const BUSY = "Lots of stories are coming in right now. Please try again in an hour.";
const PHOTOS_REJECTED = "Those photos couldn't be attached. Please add them again.";
const SUBMIT_ERRORS: Record<string, string> = {
  "54000": "You've already sent a few stories today. Please try again tomorrow.",
  "42501": PHOTOS_REJECTED,
  "23514": PHOTOS_REJECTED,
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** This browser's upload session (created on its first photo). */
async function uploadSession(create: boolean): Promise<string | null> {
  const jar = await cookies();
  const existing = jar.get(UPLOAD_COOKIE)?.value;
  if (existing && UUID.test(existing)) return existing;
  if (!create) return null;
  const session = randomUUID();
  jar.set(UPLOAD_COOKIE, session, { httpOnly: true, secure: true, sameSite: "lax", path: "/stories", maxAge: UPLOAD_COOKIE_SECONDS });
  return session;
}

const PhotoUpload = z.object({ fileName: z.string().min(1).max(255), size: z.number().int().nonnegative(), contentType: z.string().max(100) });

/** A signed upload URL for one story photo from a visitor. */
export async function startVisitorPhotoUpload(
  input: z.input<typeof PhotoUpload>,
): Promise<ActionResult<{ path: string; token: string; contentType: string }>> {
  const parsed = PhotoUpload.safeParse(input);
  if (!parsed.success) return fail("Invalid photo.");
  const file = { name: parsed.data.fileName, size: parsed.data.size, type: parsed.data.contentType };
  const invalid = validateStoryPhoto(file);
  const contentType = storyPhotoType(file);
  if (invalid || !contentType) return fail(invalid ?? "Use a JPG, PNG, WebP or HEIC photo.");

  const sb = createServiceClient();
  const session = await uploadSession(true);
  if (!session) return fail("Could not start the upload. Please try again.");
  const path = guestStoryPhotoPath(session, contentType, randomUUID());
  // Counts this address's and everyone's recent uploads, then records this one (one at a time).
  const { error: ticketError } = await sb.rpc("issue_story_upload_ticket", { p_path: path, p_ip: clientIp(await headers()) });
  if (ticketError) {
    if (ticketError.code === "54000") return fail(BUSY);
    console.error("[stories] upload ticket failed", { error: ticketError.message });
    return fail("Could not start the upload. Please try again.");
  }
  const { data, error } = await sb.storage.from(STORY_MEDIA_BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    console.error("[stories] upload url failed", { error: error?.message });
    return fail("Could not start the upload. Please try again.");
  }
  return ok({ path: data.path, token: data.token, contentType });
}

/** Saves a visitor's story for Roni's team (Admin → Inbox → Stories) and lets the team know. */
export async function submitVisitorStory(input: VisitorStoryInput): Promise<ActionResult> {
  const parsed = visitorStorySchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Please check the form.");
  const story = parsed.data;
  // The cheap checks first: the Turnstile token works only once.
  const session = await uploadSession(false);
  if (story.mediaPaths.length > 0 && (!session || !story.mediaPaths.every((p) => isGuestStoryPhotoPath(p, session)))) {
    return fail(PHOTOS_REJECTED);
  }
  const ip = clientIp(await headers());
  if (!(await verifyTurnstile(story.captcha, ip))) {
    return fail("Please confirm you're not a robot and try again.");
  }

  const subject = visitorStorySubject(story);
  const { error } = await createServiceClient().rpc("submit_visitor_story", {
    p_name: story.name,
    p_email: story.email,
    p_subject: subject,
    p_body: story.story,
    p_consent_public: story.consent,
    // Without photos the session isn't checked; any id will do.
    p_session: session ?? randomUUID(),
    p_media_paths: story.mediaPaths,
    p_ip: ip,
  });
  if (error) {
    console.error("[stories] visitor story failed", { photos: story.mediaPaths.length, code: error.code, error: error.message });
    return fail(SUBMIT_ERRORS[error.code ?? ""] ?? "Could not send your story. Please try again.");
  }

  after(() =>
    notifyTeam("inbox", {
      subject: `New story from the website: ${subject}`.slice(0, 150),
      lines: [`${story.name} (${story.email}) shared a story on bonded.dog.`, story.mediaPaths.length ? `Photos: ${story.mediaPaths.length}` : null],
      quoted: story.story.slice(0, 1500),
      path: "/admin/inbox?tab=story",
    }),
  );
  return ok(undefined);
}
