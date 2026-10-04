import type { Tier } from "@/lib/quiz/data";

/**
 * Every custom event the site sends to PostHog, named object_action in
 * snake_case. Pageviews, clicks and session replays come from autocapture;
 * these are the business moments autocapture can't name on its own.
 */
export const EVENTS = {
  quizStarted: "quiz_started",
  quizQuestionAnswered: "quiz_question_answered",
  quizBackClicked: "quiz_back_clicked",
  quizCompleted: "quiz_completed",
  quizLeadSubmitted: "quiz_lead_submitted",
  quizLeadFailed: "quiz_lead_failed",
  quizLeadSkipped: "quiz_lead_skipped",
  quizResultViewed: "quiz_result_viewed",
  planCtaClicked: "plan_cta_clicked",
  chapterPageViewed: "chapter_page_viewed",
  waitlistClicked: "waitlist_clicked",
  signupCompleted: "signup_completed",
  marketingConsentChanged: "marketing_consent_changed",
  installPromptShown: "install_prompt_shown",
  installPromptClicked: "install_prompt_clicked",
  installWizardStep: "install_wizard_step",
  installWizardGo: "install_wizard_go",
  installAccepted: "install_accepted",
  installDismissed: "install_dismissed",
  appInstalled: "app_installed",
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];

/** Where on the site a plan CTA was clicked. */
export type PlanCtaLocation =
  | "courses_hero"
  | "courses_stage"
  | "courses_final"
  | "quiz_result"
  | "stories"
  /** A button in a section built in the website editor. */
  | "site_section";

export interface PlanCtaProps {
  plan: Tier;
  location: PlanCtaLocation;
  cta_label: string;
}

export type EventProps = Record<string, string | number | boolean | null | undefined>;
