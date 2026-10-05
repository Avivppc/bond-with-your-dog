import type { CoachingSettings } from "./schedule";

/** The setup before anything is saved (matches the database defaults; booking starts off). */
export const DEFAULT_COACHING: CoachingSettings = {
  enabled: false,
  title: "1:1 session with Roni",
  description: null,
  duration_minutes: 45,
  buffer_minutes: 15,
  price_cents: 15000,
  currency: "USD",
  timezone: "Asia/Jerusalem",
  weekly: [],
  min_notice_hours: 24,
  max_days_ahead: 30,
  cancel_hours: 24,
  meeting_url: null,
};
