import "server-only";
import { cache } from "react";
import { createServiceClient } from "@/lib/supabase/admin";
import { readCertificateDesign, type CertificateDesign } from "./design";

/** The certificate design, read once per request; a failed read falls back to the defaults. */
export const loadCertificateDesign = cache(async (): Promise<CertificateDesign> => {
  const { data, error } = await createServiceClient().from("certificate_design").select("design").eq("id", 1).maybeSingle();
  if (error) console.error("[certificates] design load failed", error.message);
  return readCertificateDesign(data?.design ?? null);
});
