import { describe, expect, it } from "vitest";
import { batchOutcomes, isPermanentSendError } from "./send-errors";

describe("isPermanentSendError", () => {
  it("gives up on errors about the email itself", () => {
    expect(isPermanentSendError("validation_error")).toBe(true);
    expect(isPermanentSendError("invalid_parameter")).toBe(true);
    expect(isPermanentSendError("missing_required_field")).toBe(true);
  });

  it("retries limits, outages and setup problems (fixing them makes the send work)", () => {
    for (const name of ["rate_limit_exceeded", "daily_quota_exceeded", "internal_server_error", "application_error", "invalid_api_key", "invalid_from_address", undefined]) {
      expect(isPermanentSendError(name)).toBe(false);
    }
  });
});

describe("batchOutcomes", () => {
  it("pairs ids with emails in order when everything went out", () => {
    expect(batchOutcomes(2, [{ id: "a" }, { id: "b" }], [])).toEqual([{ ok: true, id: "a" }, { ok: true, id: "b" }]);
  });

  it("skips past rejected emails when handing out ids", () => {
    expect(batchOutcomes(3, [{ id: "a" }, { id: "c" }], [{ index: 1, message: "Invalid `to` field" }])).toEqual([
      { ok: true, id: "a" },
      { ok: false, error: "Invalid `to` field" },
      { ok: true, id: "c" },
    ]);
  });

  it("still counts an email as sent when Resend returns fewer ids than expected", () => {
    expect(batchOutcomes(2, [{ id: "a" }], [])).toEqual([{ ok: true, id: "a" }, { ok: true, id: null }]);
  });
});
