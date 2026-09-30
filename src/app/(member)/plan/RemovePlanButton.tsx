"use client";

import { useTransition } from "react";
import { Ms } from "@/components/app/ui";
import { removePlannedSession } from "./actions";

/** Small × on a planned session in the week strip. */
export function RemovePlanButton({ id, label }: { id: string; label: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      onClick={() =>
        start(async () => {
          const res = await removePlannedSession(id);
          if (!res.ok) window.alert(res.error);
        })
      }
      disabled={pending}
      aria-label={`Remove ${label}`}
      title="Remove from plan"
      style={{ float: "right", marginLeft: 6, color: "var(--ink-3)", opacity: pending ? 0.4 : 1 }}
    >
      <Ms name="close" size="sm" />
    </button>
  );
}
