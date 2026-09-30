/**
 * Deciding what an "uploading" feedback video becomes, from what Mux reports. Pure, so the
 * rules are tested; src/lib/feedback/upload-server.ts does the Mux calls and the write.
 */

/** A direct upload Mux never received (tab closed mid-upload) is given up on after a day. */
export const ABANDON_AFTER_MS = 24 * 60 * 60 * 1000;

export interface MuxUploadState {
  uploadStatus: string | null; // waiting | asset_created | errored | cancelled | timed_out
  assetStatus: string | null; // preparing | ready | errored
  playbackId: string | null;
  durationSeconds: number | null;
}

/** The browser checks the 2-minute limit, but the server has the final word once Mux knows the length. */
export const SERVER_MAX_SECONDS = 125;

export type SettleOutcome =
  | { kind: "ready"; playbackId: string; durationSeconds: number | null }
  | { kind: "too_long" }
  | { kind: "errored" }
  | { kind: "pending" };

export function settleOutcome(state: MuxUploadState | null, ageMs: number): SettleOutcome {
  if (state?.assetStatus === "ready" && (state.durationSeconds ?? 0) > SERVER_MAX_SECONDS) return { kind: "too_long" };
  if (state?.assetStatus === "ready" && state.playbackId) {
    return { kind: "ready", playbackId: state.playbackId, durationSeconds: state.durationSeconds };
  }
  if (state?.assetStatus === "errored") return { kind: "errored" };
  if (state && ["errored", "cancelled", "timed_out"].includes(state.uploadStatus ?? "")) return { kind: "errored" };
  if (ageMs > ABANDON_AFTER_MS && state?.assetStatus !== "preparing") return { kind: "errored" };
  return { kind: "pending" };
}
