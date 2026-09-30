import { z } from "zod";

/** Validation shared by onboarding, profile and dog forms (server actions re-check everything). */
export const GOALS = [
  { key: "bond", label: "Deepen our bond", icon: "favorite" },
  { key: "tricks", label: "Learn tricks for fun", icon: "celebration" },
  { key: "dance", label: "Dance a routine", icon: "music_note" },
  { key: "calm", label: "Build calm and focus", icon: "self_improvement" },
  { key: "job", label: "Give an active dog a job", icon: "bolt" },
  { key: "perform", label: "Perform one day", icon: "stadium" },
] as const;

export const AGE_GROUPS = [
  { key: "puppy", label: "Puppy, under 1" },
  { key: "adult", label: "1–7 years" },
  { key: "senior", label: "Senior, 8+" },
] as const;

export const LIMITATIONS = [
  { key: "joints", label: "Joint issues" },
  { key: "injury", label: "Recovering from injury" },
  { key: "other", label: "Other" },
] as const;

export const SESSION_LENGTHS = [5, 10, 15] as const;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

export const DogInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Your dog's name, please.").max(40),
  breed: optionalText(80),
  ageGroup: z.enum(["puppy", "adult", "senior"]),
  size: z.enum(["small", "medium", "large"]).nullable().optional(),
  limitations: z.array(z.enum(["joints", "injury", "other"])).max(3),
  limitationNote: optionalText(200),
  photoUrl: z.string().url().max(500).nullable(),
  makeActive: z.boolean().optional(),
});
export type DogInput = z.input<typeof DogInput>;

export const AboutYouInput = z.object({
  fullName: z.string().trim().min(1, "Your name, please.").max(120),
  location: optionalText(120),
  avatarUrl: z.string().url().max(500).nullable(),
});
export type AboutYouInput = z.input<typeof AboutYouInput>;

export const PracticePrefsInput = z.object({
  goals: z.array(z.enum(["bond", "tricks", "dance", "calm", "job", "perform"])).max(6),
  sessionMinutes: z.union([z.literal(5), z.literal(10), z.literal(15)]),
  practiceDays: z.array(z.number().int().min(0).max(6)).max(7),
});
export type PracticePrefsInput = z.input<typeof PracticePrefsInput>;
