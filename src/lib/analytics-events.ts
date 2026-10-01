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

  // Member app: onboarding and account
  onboardingStarted: "onboarding_started",
  onboardingStepCompleted: "onboarding_step_completed",
  onboardingCompleted: "onboarding_completed",
  dogAdded: "dog_added",
  activeDogSwitched: "active_dog_switched",
  notificationPrefChanged: "notification_pref_changed",
  accountExportRequested: "account_export_requested",
  accountDeleted: "account_deleted",

  // Member app: learning
  lessonOpened: "lesson_opened",
  lessonVideoProgress: "lesson_video_progress",
  lessonCompleted: "lesson_completed",
  lockedLessonViewed: "locked_lesson_viewed",
  checkpointAnswered: "checkpoint_answered",
  checkpointSubmitted: "checkpoint_submitted",
  certificateIssued: "certificate_issued",
  certificateShared: "certificate_shared",
  moveViewed: "move_viewed",
  searchPerformed: "search_performed",

  // Member app: practice
  practiceStarted: "practice_started",
  practiceStepCompleted: "practice_step_completed",
  practiceSessionCompleted: "practice_session_completed",
  practiceSessionAbandoned: "practice_session_abandoned",
  sessionPlanned: "session_planned",
  plannedSessionSkipped: "planned_session_skipped",
  skillLevelChanged: "skill_level_changed",
  routineSaved: "routine_saved",

  // Member app: feedback loop with Roni
  videoUploadStarted: "video_upload_started",
  videoSubmitted: "video_submitted",
  videoUploadFailed: "video_upload_failed",
  feedbackSent: "feedback_sent",
  feedbackViewed: "feedback_viewed",
  feedbackNoteClicked: "feedback_note_clicked",
  feedbackReplySent: "feedback_reply_sent",

  // Member app: community and referrals
  whatsappGroupClicked: "whatsapp_group_clicked",
  qaQuestionSubmitted: "qa_question_submitted",
  qaRecordingPlayed: "qa_recording_played",
  storySubmitted: "story_submitted",
  communityPostCreated: "community_post_created",
  communityCommentCreated: "community_comment_created",
  communityReactionAdded: "community_reaction_added",
  challengeJoined: "challenge_joined",
  challengeEntrySubmitted: "challenge_entry_submitted",
  meetupRsvped: "meetup_rsvped",
  referralLinkCopied: "referral_link_copied",
  referralSignup: "referral_signup",

  // Revenue (amounts stay in /admin/analytics; PostHog only sees what was bought).
  // In-app upgrade buttons reuse planCtaClicked with an app location.
  purchaseCompleted: "purchase_completed",
  purchaseRefunded: "purchase_refunded",
  notificationOpened: "notification_opened",
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];

/** Where on the site a plan CTA was clicked. */
export type PlanCtaLocation =
  | "courses_hero"
  | "courses_stage"
  | "courses_final"
  | "quiz_result"
  | "stories"
  | "my_courses"
  | "membership"
  | "locked_card";

export interface PlanCtaProps {
  plan: Tier;
  location: PlanCtaLocation;
  cta_label: string;
}

export type EventProps = Record<string, string | number | boolean | string[] | null | undefined>;

/**
 * The PostHog distinct_id for a person: their lowercased email, on the client
 * and the server alike, so quiz leads, members and purchases join up.
 */
export function analyticsId(email: string): string {
  return email.trim().toLowerCase();
}
