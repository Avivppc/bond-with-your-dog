"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { newQuestion, parseSurveyDefinition } from "@/lib/surveys/survey";

export type SurveyActionResult = { ok: true; message: string } | { ok: false; error: string };

const LIST = "/admin/assessments";
const SurveyId = z.string().uuid();
const Status = z.enum(["draft", "published", "closed"]);
const CourseId = z.string().min(1).max(100).nullable();

export async function createSurvey(): Promise<void> {
  const { user } = await requireStaff("content");
  const { data, error } = await createServiceClient()
    .from("surveys")
    .insert({
      title: "Chapter check-in",
      intro: "Two minutes to tell Roni how it's going. Your answers shape the next lessons.",
      thank_you: "Thank you! Roni reads every answer.",
      questions: [
        { ...newQuestion("single", "q1"), prompt: "How did this chapter feel?", required: true, options: ["Too easy", "Just right", "Too hard"] },
        { ...newQuestion("rating", "q2"), prompt: "How much fun did your dog have?", required: true },
        { ...newQuestion("long", "q3"), prompt: "Anything you'd like more of?" },
      ],
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error) {
    console.error("[surveys] create failed", { error: error.message });
    redirect(`${LIST}?error=create`);
  }
  revalidatePath(LIST);
  redirect(`${LIST}/surveys/${data.id}`);
}

/** Saves the survey (questions, texts, chapter, status). */
export async function saveSurvey(id: string, input: unknown, status: unknown, courseId: unknown): Promise<SurveyActionResult> {
  await requireStaff("content");
  const surveyId = SurveyId.safeParse(id);
  const nextStatus = Status.safeParse(status);
  const chapter = CourseId.safeParse(courseId);
  if (!surveyId.success || !nextStatus.success || !chapter.success) return { ok: false, error: "Something's off with this survey. Reload and try again." };
  const parsed = parseSurveyDefinition(input);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const { survey } = parsed;
  const { error } = await createServiceClient()
    .from("surveys")
    .update({
      title: survey.title,
      intro: survey.intro,
      thank_you: survey.thankYou,
      questions: survey.questions,
      status: nextStatus.data,
      course_id: chapter.data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", surveyId.data);
  if (error) {
    console.error("[surveys] save failed", { id, error: error.message });
    return { ok: false, error: "Couldn't save. Try again." };
  }
  revalidatePath(LIST);
  revalidatePath(`${LIST}/surveys/${surveyId.data}`);
  return { ok: true, message: nextStatus.data === "published" ? "Saved and published." : "Saved." };
}

export async function deleteSurvey(formData: FormData): Promise<void> {
  await requireStaff("content");
  const id = SurveyId.safeParse(formData.get("id"));
  if (id.success) {
    const { error } = await createServiceClient().from("surveys").delete().eq("id", id.data);
    if (error) console.error("[surveys] delete failed", { id: id.data, error: error.message });
  }
  revalidatePath(LIST);
  redirect(LIST);
}
