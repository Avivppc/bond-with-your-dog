import { expect, test } from "vitest";
import { exportFileName, publicFields, shapeExport, type ExportSource } from "./export";

const empty: ExportSource = {
  account: { id: "u1", email: "sarah@example.com", created_at: "2026-09-02T00:00:00Z" },
  profile: { id: "u1", full_name: "Sarah" },
  dogs: [],
  skills: [],
  lessonProgress: [],
  practiceSessions: [],
  practicePlan: [],
  feedbackVideos: [],
  feedbackNotes: [],
  feedbackMessages: [],
  enrollments: [],
  orders: [],
  subscriptions: [],
  supportRequests: [],
  achievements: [],
};

test("publicFields drops internal keys without changing the row", () => {
  const row = { id: "v1", title: "Spin", mux_asset_id: "secret", user_id: "u1" };
  expect(publicFields(row)).toEqual({ id: "v1", title: "Spin" });
  expect(row.mux_asset_id).toBe("secret");
});

test("shapeExport nests Roni's notes and the conversation under each video", () => {
  const out = shapeExport(
    {
      ...empty,
      feedbackVideos: [{ id: "v1", title: "Spin", mux_upload_id: "up", mux_playback_id: "pb" }],
      feedbackNotes: [{ video_id: "v1", at_seconds: 4, body: "Lovely", author_id: "staff" }],
      feedbackMessages: [{ video_id: "v1", body: "Thanks!", from_staff: false }],
      orders: [{ id: "o1", amount_cents: 8900, provider_ref: "txn_1" }],
    },
    new Date("2026-10-01T10:00:00Z")
  );
  expect(out.exported_at).toBe("2026-10-01T10:00:00.000Z");
  expect(out.feedback_videos).toEqual([
    {
      id: "v1",
      title: "Spin",
      mux_playback_id: "pb",
      notes_from_roni: [{ video_id: "v1", at_seconds: 4, body: "Lovely" }],
      conversation: [{ video_id: "v1", body: "Thanks!", from_staff: false }],
    },
  ]);
  expect(out.orders).toEqual([{ id: "o1", amount_cents: 8900 }]);
  expect(out.account.email).toBe("sarah@example.com");
});

test("exportFileName uses the date", () => {
  expect(exportFileName(new Date("2026-10-01T23:00:00Z"))).toBe("bonded-data-2026-10-01.json");
});
