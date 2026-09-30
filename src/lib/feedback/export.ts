/**
 * "Download my data": shapes what we hold about a member into one readable JSON document.
 * Internal storage keys (Mux upload/asset ids, provider references) are left out. Pure.
 */

type Row = Record<string, unknown>;

export interface ExportSource {
  account: { id: string; email: string; created_at: string };
  profile: Row | null;
  dogs: Row[];
  skills: Row[];
  lessonProgress: Row[];
  practiceSessions: Row[];
  practicePlan: Row[];
  feedbackVideos: Row[];
  feedbackNotes: Row[];
  feedbackMessages: Row[];
  enrollments: Row[];
  orders: Row[];
  subscriptions: Row[];
  supportRequests: Row[];
  achievements: Row[];
}

const HIDDEN_KEYS = new Set(["mux_upload_id", "mux_asset_id", "provider_ref", "user_id", "owner_id", "author_id", "reviewed_by", "answered_by"]);

/** A copy of the row without internal keys. */
export function publicFields(row: Row): Row {
  return Object.fromEntries(Object.entries(row).filter(([k]) => !HIDDEN_KEYS.has(k)));
}

function byVideo(rows: Row[]): Map<unknown, Row[]> {
  const map = new Map<unknown, Row[]>();
  for (const r of rows) map.set(r.video_id, [...(map.get(r.video_id) ?? []), publicFields(r)]);
  return map;
}

export function shapeExport(src: ExportSource, exportedAt: Date) {
  const notes = byVideo(src.feedbackNotes);
  const messages = byVideo(src.feedbackMessages);
  return {
    about: "Your Bonded data export. It includes everything Bonded stores about your account.",
    exported_at: exportedAt.toISOString(),
    account: src.account,
    profile: src.profile ? publicFields(src.profile) : null,
    dogs: src.dogs.map(publicFields),
    dog_skills: src.skills.map(publicFields),
    lesson_progress: src.lessonProgress.map(publicFields),
    practice_sessions: src.practiceSessions.map(publicFields),
    practice_plan: src.practicePlan.map(publicFields),
    feedback_videos: src.feedbackVideos.map((v) => ({
      ...publicFields(v),
      notes_from_roni: notes.get(v.id) ?? [],
      conversation: messages.get(v.id) ?? [],
    })),
    courses: src.enrollments.map(publicFields),
    orders: src.orders.map(publicFields),
    subscriptions: src.subscriptions.map(publicFields),
    help_requests: src.supportRequests.map(publicFields),
    achievements: src.achievements.map(publicFields),
  };
}

/** bonded-data-2026-10-01.json */
export function exportFileName(date: Date): string {
  return `bonded-data-${date.toISOString().slice(0, 10)}.json`;
}
