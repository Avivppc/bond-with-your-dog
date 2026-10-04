import "server-only";
import { cache } from "react";
import { createServiceClient } from "@/lib/supabase/admin";
import { readCertificateDesign, type CertificateDesign } from "./design";

/** Live lessons in a certificate's chapter (for "all 26 lessons of"); null when unknown. */
export async function certificateLessonCount(code: string): Promise<number | null> {
  const sb = createServiceClient();
  const { data: cert } = await sb.from("certificates").select("course_id").eq("code", code).maybeSingle();
  if (!cert) return null;
  const { count, error } = await sb.from("lessons").select("id", { count: "exact", head: true }).eq("course_id", cert.course_id).eq("published", true);
  if (error) console.error("[certificates] lesson count failed", { code, error: error.message });
  return count ?? null;
}

/** The certificate design, read once per request; a failed read falls back to the defaults. */
export const loadCertificateDesign = cache(async (): Promise<CertificateDesign> => {
  const { data, error } = await createServiceClient().from("certificate_design").select("design").eq("id", 1).maybeSingle();
  if (error) console.error("[certificates] design load failed", error.message);
  return readCertificateDesign(data?.design ?? null);
});
