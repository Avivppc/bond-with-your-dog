import { requireStaff } from "@/lib/admin";
import { PageHeader } from "../../_components/ui";
import { loadOfferOptions } from "../_lib/person-data";
import { ImportWizard } from "./ImportWizard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Import contacts" };

export default async function ImportContactsPage() {
  await requireStaff("sales");
  const offers = await loadOfferOptions();
  return (
    <div className="max-w-5xl space-y-5">
      <PageHeader
        title="Import contacts"
        crumbs={[{ label: "Contacts", href: "/admin/people" }, { label: "Import" }]}
        description="Bring people over from Kajabi or a spreadsheet. Running the same file twice updates people instead of adding them again."
      />
      <ImportWizard offers={offers} />
    </div>
  );
}
