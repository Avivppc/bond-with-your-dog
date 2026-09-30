import { requireMember } from "@/lib/member/viewer";
import { Breadcrumbs } from "@/components/app/ui";
import { DogForm } from "../DogForm";

export const metadata = { title: "Add a dog" };

export default async function NewDogPage() {
  await requireMember("/dogs/new");
  return (
    <>
      <Breadcrumbs items={[{ href: "/dogs", label: "Your dogs" }, { label: "Add a dog" }]} />
      <div className="head-block">
        <span className="eyebrow">Your dogs</span>
        <h1 className="h1">Meet your dog</h1>
      </div>
      <DogForm initial={{ name: "", breed: "", ageGroup: "adult", size: null, limitations: [], limitationNote: "", photoUrl: null }} canDelete={false} />
    </>
  );
}
