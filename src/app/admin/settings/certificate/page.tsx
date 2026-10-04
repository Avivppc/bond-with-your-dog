import { requireStaff } from "@/lib/admin";
import { loadCertificateDesign } from "@/lib/certificates/server";
import { PageHeader } from "../../_components/ui";
import { CertificateEditor } from "./CertificateEditor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Certificate" };

/** The certificate members get when they finish a chapter: wording, signer, colour. */
export default async function CertificateSettingsPage() {
  await requireStaff("content");
  const design = await loadCertificateDesign();
  return (
    <div className="space-y-5">
      <PageHeader
        title="Certificate"
        description="What members receive when they finish every lesson of a chapter: the page in the app and the PDF they download and share."
      />
      <CertificateEditor initial={design} />
    </div>
  );
}
