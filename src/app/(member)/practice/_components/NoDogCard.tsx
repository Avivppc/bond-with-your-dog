import Link from "next/link";
import { Ms, StateCard } from "@/components/app/ui";

/** Dog-specific screens before the member has added a dog. */
export function NoDogCard({ eyebrow, what }: { eyebrow: string; what: string }) {
  return (
    <StateCard
      icon="pets"
      tone="orange"
      eyebrow={eyebrow}
      title="Add your dog first"
      action={
        <Link className="btn btn-primary" href="/dogs/new">
          <Ms name="add" size="sm" />
          Add your dog
        </Link>
      }
    >
      {what}
    </StateCard>
  );
}
