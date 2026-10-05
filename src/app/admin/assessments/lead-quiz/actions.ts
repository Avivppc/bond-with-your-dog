"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { QuizConfigSchema, describeQuizIssue } from "@/lib/quiz/config";

const PAGE = "/admin/assessments/lead-quiz";
/** Public pages that show the quiz content. */
const QUIZ_PAGES = ["/quiz", "/chapter/foundations", "/chapter/moves", "/chapter/lets-dance"];

export interface SaveLeadQuizState {
  error: string | null;
}

function parseJson(value: FormDataEntryValue | null): unknown {
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function revalidateQuizPages(): void {
  [PAGE, ...QUIZ_PAGES].forEach((path) => revalidatePath(path));
}

/** Saves the whole quiz (questions and results). Errors come back to the editor so edits aren't lost. */
export async function saveLeadQuiz(_prev: SaveLeadQuizState, formData: FormData): Promise<SaveLeadQuizState> {
  const { user } = await requireStaff("content");
  const parsed = QuizConfigSchema.safeParse(parseJson(formData.get("config")));
  if (!parsed.success) return { error: describeQuizIssue(parsed.error.issues[0]) };

  const { error } = await createServiceClient()
    .from("lead_quiz_config")
    .upsert({
      id: 1,
      questions: parsed.data.questions,
      results: parsed.data.results,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    });
  if (error) {
    console.error("[lead quiz] save failed", { userId: user.id, error: error.message });
    return { error: "Couldn't save the quiz. Try again." };
  }
  revalidateQuizPages();
  redirect(`${PAGE}?saved=1`);
}

/** Back to the quiz written in code: removes the saved version. */
export async function resetLeadQuiz(): Promise<void> {
  const { user } = await requireStaff("content");
  const { error } = await createServiceClient().from("lead_quiz_config").delete().eq("id", 1);
  if (error) {
    console.error("[lead quiz] reset failed", { userId: user.id, error: error.message });
    redirect(`${PAGE}?error=${encodeURIComponent("Couldn't reset the quiz. Try again.")}`);
  }
  revalidateQuizPages();
  redirect(`${PAGE}?reset=1`);
}
