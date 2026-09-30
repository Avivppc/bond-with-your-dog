/** What happened to a feedback email, and how the Studio words it. Pure (shared with client code). */

export type EmailOutcome = "sent" | "opted_out" | "not_configured" | "failed";

export const EMAIL_OUTCOME_NOTE: Record<EmailOutcome, string> = {
  sent: "in the app and by email",
  opted_out: "in the app (they've turned feedback emails off)",
  not_configured: "in the app; email isn't set up yet",
  failed: "in the app; the email didn't go out",
};
