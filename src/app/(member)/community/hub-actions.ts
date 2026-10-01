"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { isOwnStoryPhotoPath, MAX_STORY_PHOTOS, STORY_MEDIA_BUCKET, storyPhotoPath, storyPhotoType, validateStoryPhoto } from "@/lib/community/story-media";
import { fail, ok, type ActionResult } from "@/lib/member/result";

const MESSAGES: Record<string, string> = {
  "42501": "The Q&A is for community members.",
  "22023": "That Q&A isn't taking questions anymore.",
  "54000": "You've sent the most questions allowed for this session.",
};

const Question = z.object({ meetupId: z.string().uuid(), body: z.string().trim().min(5, "Write a little more.").max(1000) });

/** A question sent ahead of a Live Q&A (Roni answers it live). */
export async function sendQaQuestion(input: z.input<typeof Question>): Promise<ActionResult> {
  const parsed = Question.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Please check your question.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("send_qa_question", { p_meetup_id: parsed.data.meetupId, p_body: parsed.data.body });
  if (error) {
    console.error("[community] qa question failed", { meetupId: parsed.data.meetupId, error: error.message });
    return fail(MESSAGES[error.code ?? ""] ?? "Could not send your question. Please try again.");
  }
  revalidatePath("/community");
  return ok(undefined);
}

const PhotoUpload = z.object({ fileName: z.string().min(1).max(255), size: z.number().int().nonnegative(), contentType: z.string().max(100) });

/** Signed upload URL for a story photo, in the member's own `stories` folder of the private community-media bucket. */
export async function startStoryPhotoUpload(
  input: z.input<typeof PhotoUpload>
): Promise<ActionResult<{ path: string; token: string; contentType: string }>> {
  const parsed = PhotoUpload.safeParse(input);
  if (!parsed.success) return fail("Invalid photo.");
  const file = { name: parsed.data.fileName, size: parsed.data.size, type: parsed.data.contentType };
  const invalid = validateStoryPhoto(file);
  const contentType = storyPhotoType(file);
  if (invalid || !contentType) return fail(invalid ?? "Use a JPG, PNG, WebP or HEIC photo.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Please sign in again.");
  const { data: member, error: memberError } = await supabase.rpc("can_access_community");
  if (memberError) console.error("[community] story photo access check failed", { userId: user.id, error: memberError.message });
  if (!member) return fail("Join the community to share photos.");

  const path = storyPhotoPath(user.id, contentType, randomUUID());
  const { data, error } = await createServiceClient().storage.from(STORY_MEDIA_BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    console.error("[community] story photo upload url failed", { userId: user.id, error: error?.message });
    return fail("Could not start the upload. Please try again.");
  }
  return ok({ path: data.path, token: data.token, contentType });
}

const Story = z.object({
  title: z.string().trim().max(200).optional(),
  body: z.string().trim().min(20, "Tell us a little more — a few sentences is perfect.").max(5000),
  consentPublic: z.boolean(),
  mediaPaths: z
    .array(z.string().max(300))
    .max(MAX_STORY_PHOTOS, `Up to ${MAX_STORY_PHOTOS} photos.`)
    .refine((paths) => new Set(paths).size === paths.length, "Each photo can be added once.")
    .default([]),
});

const PHOTOS_REJECTED = "Those photos couldn't be attached. Please add them again.";
const STORY_ERRORS: Record<string, string> = {
  "54000": "Too many messages today — try again tomorrow.",
  "42501": PHOTOS_REJECTED,
  "23514": PHOTOS_REJECTED,
};

/** "Share how you changed": goes to Roni's inbox (with up to 3 photos); published on the site only with consent. */
export async function shareStory(input: z.input<typeof Story>): Promise<ActionResult> {
  const parsed = Story.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Please check your story.");
  const { title, body, consentPublic, mediaPaths } = parsed.data;
  const supabase = await createClient();
  if (mediaPaths.length > 0) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return fail("Please sign in again.");
    if (!mediaPaths.every((path) => isOwnStoryPhotoPath(path, user.id))) return fail(PHOTOS_REJECTED);
  }
  const { error } = await supabase.rpc("submit_support_request", {
    p_kind: "story",
    p_subject: title ?? null,
    p_body: body,
    p_page_url: "/community",
    p_consent_public: consentPublic,
    p_media_paths: mediaPaths,
  });
  if (error) {
    console.error("[community] story failed", { photos: mediaPaths.length, error: error.message });
    return fail(STORY_ERRORS[error.code ?? ""] ?? "Could not send your story. Please try again.");
  }
  return ok(undefined);
}
