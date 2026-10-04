import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { loadCertificateDesign } from "@/lib/certificates/server";
import { certificatePdfStream } from "@/lib/certificates/pdf";

export const dynamic = "force-dynamic";

const CODE = /^[A-Za-z0-9-]{4,40}$/;

/** How many lessons the certificate's course has (for "all 26 lessons of"); null when unknown. */
async function lessonCount(code: string): Promise<number | null> {
  const sb = createServiceClient();
  const { data: cert } = await sb.from("certificates").select("course_id").eq("code", code).maybeSingle();
  if (!cert) return null;
  const { count, error } = await sb.from("lessons").select("id", { count: "exact", head: true }).eq("course_id", cert.course_id);
  if (error) console.error("[certificates] lesson count failed", { code, error: error.message });
  return count ?? null;
}

/** A certificate's PDF, for anyone with its code (public verification), in the admin's design. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!CODE.test(code)) return NextResponse.json({ error: "certificate not found" }, { status: 404 });
  const supabase = await createClient();
  // Public verification by code; the certificates table itself is own-rows only.
  const { data: cert, error } = await supabase
    .rpc("verify_certificate", { p_code: code })
    .maybeSingle<{ code: string; student_name: string; course_title: string; issued_at: string; dog_name: string | null }>();
  if (error || !cert) return NextResponse.json({ error: "certificate not found" }, { status: 404 });

  const [design, lessons] = await Promise.all([loadCertificateDesign(), lessonCount(cert.code)]);
  const body = await certificatePdfStream(
    { studentName: cert.student_name, dogName: cert.dog_name, courseTitle: cert.course_title, issuedAt: cert.issued_at, code: cert.code, lessons },
    design,
  );
  return new Response(body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="bonded-certificate-${cert.code}.pdf"`,
    },
  });
}
