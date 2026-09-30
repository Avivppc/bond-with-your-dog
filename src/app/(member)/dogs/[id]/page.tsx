import { notFound } from "next/navigation";
import { requireMember } from "@/lib/member/viewer";
import { Breadcrumbs } from "@/components/app/ui";
import { DogForm } from "../DogForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit dog" };

export default async function EditDogPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requireMember(`/dogs/${id}`);
  const dog = viewer.dogs.find((d) => d.id === id);
  if (!dog) notFound();
  return (
    <>
      <Breadcrumbs items={[{ href: "/dogs", label: "Your dogs" }, { label: dog.name }]} />
      <div className="head-block">
        <span className="eyebrow">Your dogs</span>
        <h1 className="h1">{dog.name}</h1>
      </div>
      <DogForm
        initial={{
          id: dog.id,
          name: dog.name,
          breed: dog.breed ?? "",
          ageGroup: dog.age_group,
          size: dog.size,
          limitations: dog.limitations as ("joints" | "injury" | "other")[],
          limitationNote: dog.limitation_note ?? "",
          photoUrl: dog.photo_url,
        }}
        canDelete
      />
    </>
  );
}
