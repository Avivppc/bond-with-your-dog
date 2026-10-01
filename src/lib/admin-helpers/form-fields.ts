import { z } from "zod";

/** Zod fields shared by admin forms, with messages written for staff (never raw zod text). Pure. */

export const MAX_DAYS_OF_ACCESS = 36_500;

/** "Days of access": blank means lifetime (null); otherwise a whole number of days from 1 to 36,500. */
export const DaysOfAccess = z.preprocess(
  (v) => (v === "" || v == null ? null : typeof v === "string" ? Number(v.trim()) : v),
  z
    .number({ message: "Days of access must be a number." })
    .int("Days of access must be whole days.")
    .min(1, "Days of access must be at least 1 (leave it blank for lifetime access).")
    .max(MAX_DAYS_OF_ACCESS, "Days of access is too long (at most 36,500 days).")
    .nullable()
);
