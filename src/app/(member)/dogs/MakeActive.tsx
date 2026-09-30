"use client";

import { useTransition } from "react";
import { setActiveDog } from "@/app/(member)/actions";

export function MakeActive({ dogId }: { dogId: string }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" className="btn btn-ghost btn-sm" disabled={pending} onClick={() => start(() => setActiveDog(dogId))}>
      {pending ? "Switching…" : "Make active"}
    </button>
  );
}
