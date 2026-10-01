import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireMember } from "@/lib/member/viewer";
import { CopyButton } from "@/components/app/CopyButton";
import { Ms } from "@/components/app/ui";
import { LocalTime } from "@/components/ui/LocalTime";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your certificate" };

interface Certificate {
  code: string;
  student_name: string;
  course_title: string;
  issued_at: string;
  dog_name: string | null;
}

export default async function CertificatePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!/^[A-Za-z0-9-]{4,40}$/.test(code)) notFound();
  const viewer = await requireMember(`/certificates/${code}`);
  const supabase = await createClient();
  const [{ data: cert }, { data: own }] = await Promise.all([
    supabase.rpc("verify_certificate", { p_code: code }).maybeSingle<Certificate>(),
    supabase.from("certificates").select("course_id").eq("code", code).eq("user_id", viewer.userId).maybeSingle(),
  ]);
  if (!cert) notFound();
  const pdf = `/api/certificates/${encodeURIComponent(cert.code)}`;
  const lessons = own ? (await supabase.from("lessons").select("id", { count: "exact", head: true }).eq("course_id", own.course_id)).count : null;

  return (
    <>
      <div className="between">
        <div className="head-block">
          <span className="eyebrow">
            Earned <LocalTime iso={cert.issued_at} format="longDate" />
          </span>
          <h1 className="h1">{own ? "Your certificate" : "Certificate"}</h1>
        </div>
        <div className="row">
          <CopyButton value={pdf} label="Copy share link" />
          <a className="btn btn-primary btn-sm" href={pdf} download={`bonded-certificate-${cert.code}.pdf`}>
            <Ms name="download" size="sm" />
            Download PDF
          </a>
        </div>
      </div>
      <div className="cert">
        <div className="cert-inner">
          <div className="sketch">
            {/* eslint-disable-next-line @next/next/no-img-element -- illustration */}
            <img src="/app/img/give-a-hug.jpg" alt="" style={{ width: 110 }} />
          </div>
          <span className="eyebrow" style={{ color: "#9a7a1a" }}>
            Certificate of Completion
          </span>
          <p className="faint" style={{ fontSize: 14 }}>
            This certifies that
          </p>
          <h2 className="display" style={{ fontSize: 40 }}>
            {cert.student_name}
            {cert.dog_name ? ` & ${cert.dog_name}` : ""}
          </h2>
          <p className="muted" style={{ maxWidth: "48ch" }}>
            {cert.dog_name ? "have" : "has"} completed {lessons ? `all ${lessons} lessons of ` : ""}
            <b>{cert.course_title}</b>, building focus, trust and body awareness together.
          </p>
          <div className="cert-meta">
            <div>
              <span className="sig">Roni Sagi</span>
              <hr />
              <span>Roni Sagi · Founder</span>
            </div>
            <div>
              <span style={{ fontFamily: "var(--display)", fontSize: 18, color: "var(--ink)", textTransform: "none", fontWeight: 700, lineHeight: "46px" }}>
                <LocalTime iso={cert.issued_at} format="shortDate" />
              </span>
              <hr />
              <span>Date</span>
            </div>
            <div>
              <span style={{ fontFamily: "var(--display)", fontSize: 18, color: "var(--ink)", letterSpacing: ".04em", textTransform: "none", fontWeight: 700, lineHeight: "46px" }}>{cert.code}</span>
              <hr />
              <span>Certificate code</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
