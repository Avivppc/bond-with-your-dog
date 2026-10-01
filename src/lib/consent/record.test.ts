import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const supabase = vi.hoisted(() => ({
  user: null as { id: string } | null,
  insertError: null as { message: string } | null,
  insert: vi.fn(),
}));

function fakeStore() {
  return {
    auth: { getUser: async () => ({ data: { user: supabase.user } }) },
    from: () => ({
      insert: async (row: Record<string, unknown>) => {
        supabase.insert(row);
        return { error: supabase.insertError };
      },
    }),
  };
}

import { recordConsent } from "./record";

const POST = (req: Request) => recordConsent(req, fakeStore());

const CONSENT_ID = "3f2a9c1e-8b4d-4e2f-9a6b-1c2d3e4f5a6b";

function request(body: unknown, country?: string): Request {
  return new Request("https://www.bonded.dog/api/consent", {
    method: "POST",
    headers: { "content-type": "application/json", ...(country ? { "x-vercel-ip-country": country } : {}) },
    body: JSON.stringify(body),
  });
}

const validBody = {
  consentId: CONSENT_ID,
  categories: ["necessary", "analytics"],
  acceptType: "all",
  policy: "opt_in",
  revision: 1,
};

describe("recordConsent (POST /api/consent)", () => {
  beforeEach(() => {
    supabase.user = null;
    supabase.insertError = null;
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  test("stores the choice with the country from Vercel and no member for a visitor", async () => {
    const response = await POST(request(validBody, "DE"));

    expect(response.status).toBe(204);
    expect(supabase.insert).toHaveBeenCalledWith({
      consent_id: CONSENT_ID,
      categories: ["necessary", "analytics"],
      accept_type: "all",
      policy: "opt_in",
      revision: 1,
      country: "DE",
      user_id: null,
    });
  });

  test("links the choice to the signed-in member", async () => {
    supabase.user = { id: "user-1" };

    await POST(request(validBody, "IL"));

    expect(supabase.insert).toHaveBeenCalledWith(expect.objectContaining({ user_id: "user-1", country: "IL" }));
  });

  test("drops a malformed country header instead of failing", async () => {
    await POST(request(validBody, "not-a-country"));

    expect(supabase.insert).toHaveBeenCalledWith(expect.objectContaining({ country: null }));
  });

  test.each([
    ["a consent id that is not a uuid", { ...validBody, consentId: "abc" }],
    ["an unknown category", { ...validBody, categories: ["necessary", "marketing"] }],
    ["an unknown accept type", { ...validBody, acceptType: "maybe" }],
    ["an unknown policy", { ...validBody, policy: "whatever" }],
    ["a negative revision", { ...validBody, revision: -1 }],
  ])("rejects %s", async (_label, body) => {
    const response = await POST(request(body));

    expect(response.status).toBe(400);
    expect(supabase.insert).not.toHaveBeenCalled();
  });

  test("rejects a body that is not JSON", async () => {
    const response = await POST(
      new Request("https://www.bonded.dog/api/consent", { method: "POST", body: "{nope" }),
    );

    expect(response.status).toBe(400);
  });

  test("reports a database failure without leaking its message", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);
    supabase.insertError = { message: "relation consent_records does not exist" };

    const response = await POST(request(validBody));

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "could not save consent" });
    expect(errorLog).toHaveBeenCalledWith("[consent] insert failed", "relation consent_records does not exist");
  });
});
