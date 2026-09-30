import { CUES, TAKEAWAYS } from "./limits";
import { parseTextList, type ParseResult } from "./lists";
import { parsePracticeSteps, type PracticeStep } from "./practice-steps";

export interface LessonContent {
  key_takeaways: string[];
  cues: string[];
  practice_steps: PracticeStep[];
}

/**
 * The lesson editor's member-app lists (takeaways, cues, practice steps). Returns null when the
 * form didn't include them (no `content_fields` marker), so a save never wipes lists it didn't show.
 */
export function parseLessonContent(formData: FormData): ParseResult<LessonContent | null> {
  if (formData.get("content_fields") !== "1") return { ok: true, value: null };
  const takeaways = parseTextList(formData.getAll("key_takeaways"), TAKEAWAYS);
  if (!takeaways.ok) return takeaways;
  const cues = parseTextList(formData.getAll("cues"), CUES);
  if (!cues.ok) return cues;
  const steps = parsePracticeSteps({
    titles: formData.getAll("step_title"),
    bodies: formData.getAll("step_body"),
    seconds: formData.getAll("step_seconds"),
    reps: formData.getAll("step_reps"),
  });
  if (!steps.ok) return steps;
  return { ok: true, value: { key_takeaways: takeaways.value, cues: cues.value, practice_steps: steps.value } };
}
