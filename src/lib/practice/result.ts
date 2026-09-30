/** Result shape returned by the practice server actions: friendly errors, never throws. */
export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

export const GENERIC_ERROR = "Something went wrong. Please try again.";

const DB_MESSAGES: Record<string, string> = {
  "42501": "You can't do that here.",
  "22023": "That didn't work. Please check and try again.",
  "23514": "That value isn't allowed.",
  "28000": "Please sign in again.",
  "54000": "That's a lot for one day. Please try again tomorrow.",
};

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

/** A member-facing message for a Postgres / PostgREST error code. */
export function dbMessage(code: string | undefined | null): string {
  return DB_MESSAGES[code ?? ""] ?? GENERIC_ERROR;
}
