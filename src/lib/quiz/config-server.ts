import "server-only";
import { cache } from "react";
import { createServiceClient } from "@/lib/supabase/admin";
import { DEFAULT_QUIZ_CONFIG, QuizConfigSchema, describeQuizIssue, type QuizConfig } from "./config";

/** Where the quiz shown to visitors comes from. */
export type QuizConfigSource = "saved" | "original" | "invalid" | "unavailable";

export interface LoadedQuizConfig {
  config: QuizConfig;
  source: QuizConfigSource;
  /** When staff last saved it (null for the original quiz). */
  updatedAt: string | null;
}

const ORIGINAL: LoadedQuizConfig = { config: DEFAULT_QUIZ_CONFIG, source: "original", updatedAt: null };

async function readRow(): Promise<LoadedQuizConfig> {
  const { data, error } = await createServiceClient()
    .from("lead_quiz_config")
    .select("questions, results, updated_at")
    .eq("id", 1)
    .maybeSingle();
  if (error) {
    console.error("[lead quiz] could not read the saved quiz; showing the original", { error: error.message });
    return { ...ORIGINAL, source: "unavailable" };
  }
  if (!data) return ORIGINAL;

  const parsed = QuizConfigSchema.safeParse({ questions: data.questions, results: data.results });
  if (!parsed.success) {
    console.error("[lead quiz] saved quiz is invalid; showing the original", {
      problem: describeQuizIssue(parsed.error.issues[0]),
    });
    return { ...ORIGINAL, source: "invalid", updatedAt: data.updated_at };
  }
  return { config: parsed.data, source: "saved", updatedAt: data.updated_at };
}

/**
 * The lead quiz content with where it came from. Never throws: any problem falls back to the
 * original quiz in code. Cached per request.
 */
export const loadQuizConfigWithSource = cache(async (): Promise<LoadedQuizConfig> => {
  try {
    return await readRow();
  } catch (error) {
    console.error("[lead quiz] could not load the saved quiz; showing the original", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { ...ORIGINAL, source: "unavailable" };
  }
});

/** The lead quiz content (questions and results) to show and email. */
export async function loadQuizConfig(): Promise<QuizConfig> {
  return (await loadQuizConfigWithSource()).config;
}
