"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { loadSurvey } from "@/lib/surveys/server";
import { validateAnswers } from "@/lib/surveys/survey";

export type SubmitSurveyResult = { ok: true } | { ok: false; error: string };

const Id = z.string().uuid();

/** Saves (or replaces) the signed-in member's answers to a live survey. */
export async function submitSurvey(surveyId: string, answers: unknown): Promise<SubmitSurveyResult> {
  const id = Id.safeParse(surveyId);
  if (!id.success) return { ok: false, error: "This survey doesn't exist." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in again." };

  const sb = createServiceClient();
  const survey = await loadSurvey(sb, id.data).catch(() => null);
  if (!survey || survey.status !== "published") return { ok: false, error: "This survey is closed." };
  const checked = validateAnswers(survey.questions, answers);
  if (!checked.ok) return checked;

  const { error } = await sb
    .from("survey_responses")
    .upsert({ survey_id: survey.id, user_id: user.id, answers: checked.answers, created_at: new Date().toISOString() }, { onConflict: "survey_id,user_id" });
  if (error) {
    console.error("[surveys] submit failed", { survey: survey.id, error: error.message });
    return { ok: false, error: "Couldn't save your answers. Please try again." };
  }
  revalidatePath(`/surveys/${survey.id}`);
  return { ok: true };
}
