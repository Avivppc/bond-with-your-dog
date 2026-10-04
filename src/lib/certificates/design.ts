/**
 * Certificate design (Admin → Settings → Certificate): the wording, signer and colours shared by
 * the certificate page and its PDF. Pure — the form, the save action, the PDF and tests use it.
 */
import { z } from "zod";

const HEX = /^#[0-9a-fA-F]{6}$/;

export const ACCENT_PRESETS = [
  { label: "Bonded amber", value: "#8b4b00" },
  { label: "Teal", value: "#0e666a" },
  { label: "Gold", value: "#9a7a1a" },
  { label: "Ink", value: "#243036" },
] as const;

export const certificateDesignSchema = z.object({
  title: z.string().trim().min(1, "Give the certificate a title.").max(60),
  intro: z.string().trim().max(80),
  completedText: z.string().trim().min(1, "Write the completion line.").max(80),
  signerName: z.string().trim().min(1, "Who signs it?").max(60),
  signerTitle: z.string().trim().max(60),
  accentColor: z.string().regex(HEX, "Pick a colour."),
  showDogName: z.boolean(),
  showLessonCount: z.boolean(),
});

export type CertificateDesign = z.infer<typeof certificateDesignSchema>;

export const DEFAULT_CERTIFICATE_DESIGN: CertificateDesign = {
  title: "Certificate of Completion",
  intro: "This certifies that",
  completedText: "completed",
  signerName: "Roni Sagi",
  signerTitle: "Founder",
  accentColor: "#8b4b00",
  showDogName: true,
  showLessonCount: true,
};

/** The saved design, with defaults for anything missing or invalid (a bad save never breaks certificates). */
export function readCertificateDesign(raw: unknown): CertificateDesign {
  const saved = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const merged = { ...DEFAULT_CERTIFICATE_DESIGN, ...saved };
  const parsed = certificateDesignSchema.safeParse(merged);
  if (parsed.success) return parsed.data;
  // Keep every valid field, fall back field by field.
  const fields = Object.keys(DEFAULT_CERTIFICATE_DESIGN) as (keyof CertificateDesign)[];
  return Object.fromEntries(
    fields.map((key) => {
      const one = certificateDesignSchema.shape[key].safeParse(merged[key]);
      return [key, one.success ? one.data : DEFAULT_CERTIFICATE_DESIGN[key]];
    }),
  ) as CertificateDesign;
}

export interface CertificateText {
  /** "Dana & Rhythm", or "Dana" when the dog isn't shown. */
  recipient: string;
  /** "have completed all 26 lessons of" / "has completed". */
  line: string;
}

/** The sentence around the course title, from the design and this certificate's facts. */
export function certificateText(
  design: CertificateDesign,
  facts: { studentName: string; dogName: string | null; lessons: number | null },
): CertificateText {
  const withDog = design.showDogName && Boolean(facts.dogName);
  const verb = withDog ? "have" : "has";
  const lessons = design.showLessonCount && facts.lessons ? ` all ${facts.lessons} lessons of` : "";
  return {
    recipient: withDog ? `${facts.studentName} & ${facts.dogName}` : facts.studentName,
    line: `${verb} ${design.completedText}${lessons}`,
  };
}

/** Sample facts for the admin preview. */
export const SAMPLE_CERTIFICATE = {
  studentName: "Dana Levi",
  dogName: "Rhythm",
  courseTitle: "Bonded: Foundations",
  lessons: 26,
  code: "BND-SAMPLE",
  issuedAt: "2026-10-04T12:00:00.000Z",
} as const;
