"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { certificateDesignSchema, type CertificateDesign } from "@/lib/certificates/design";

export type SaveResult = { ok: true } | { ok: false; error: string };

/** Saves the certificate design; every certificate (page and PDF) uses it from now on. */
export async function saveCertificateDesign(input: CertificateDesign): Promise<SaveResult> {
  const { user } = await requireStaff("content");
  const parsed = certificateDesignSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the design." };
  const { error } = await createServiceClient()
    .from("certificate_design")
    .upsert({ id: 1, design: parsed.data, updated_by: user.id, updated_at: new Date().toISOString() });
  if (error) {
    console.error("[certificates] design save failed", error.message);
    return { ok: false, error: "Could not save. Please try again." };
  }
  revalidatePath("/admin/settings/certificate");
  revalidatePath("/(member)/certificates/[code]", "page");
  return { ok: true };
}
