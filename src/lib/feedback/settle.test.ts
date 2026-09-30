import { expect, test } from "vitest";
import { ABANDON_AFTER_MS, settleOutcome } from "./settle";

const base = { uploadStatus: "asset_created", assetStatus: "preparing", playbackId: null, durationSeconds: null };

test("a ready asset moves the video into Roni's queue", () => {
  expect(settleOutcome({ ...base, assetStatus: "ready", playbackId: "pb", durationSeconds: 34.2 }, 1000)).toEqual({
    kind: "ready",
    playbackId: "pb",
    durationSeconds: 34.2,
  });
});

test("clips over the limit are refused even when the browser couldn't check", () => {
  expect(settleOutcome({ ...base, assetStatus: "ready", playbackId: "pb", durationSeconds: 300 }, 1000)).toEqual({ kind: "too_long" });
  expect(settleOutcome({ ...base, assetStatus: "ready", playbackId: "pb", durationSeconds: 121 }, 1000).kind).toBe("ready");
});

test("Mux errors mark the upload failed", () => {
  expect(settleOutcome({ ...base, assetStatus: "errored" }, 1000)).toEqual({ kind: "errored" });
  expect(settleOutcome({ ...base, uploadStatus: "timed_out", assetStatus: null }, 1000)).toEqual({ kind: "errored" });
  expect(settleOutcome({ ...base, uploadStatus: "cancelled", assetStatus: null }, 1000)).toEqual({ kind: "errored" });
});

test("still processing stays pending, even when old", () => {
  expect(settleOutcome(base, 1000)).toEqual({ kind: "pending" });
  expect(settleOutcome(base, ABANDON_AFTER_MS + 1)).toEqual({ kind: "pending" });
});

test("an upload that never arrived is given up after a day", () => {
  const waiting = { ...base, uploadStatus: "waiting", assetStatus: null };
  expect(settleOutcome(waiting, 60_000)).toEqual({ kind: "pending" });
  expect(settleOutcome(waiting, ABANDON_AFTER_MS + 1)).toEqual({ kind: "errored" });
  expect(settleOutcome(null, ABANDON_AFTER_MS + 1)).toEqual({ kind: "errored" });
});
