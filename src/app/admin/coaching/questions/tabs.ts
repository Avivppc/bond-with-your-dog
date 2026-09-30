export const QUESTION_TABS = ["unanswered", "answered", "hidden"] as const;
export type QuestionTab = (typeof QUESTION_TABS)[number];

export function asQuestionTab(value: string | undefined): QuestionTab {
  return (QUESTION_TABS as readonly string[]).includes(value ?? "") ? (value as QuestionTab) : "unanswered";
}
