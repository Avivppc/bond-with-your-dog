"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { moderatePost } from "@/app/(member)/community/actions";
import { BTN_DANGER, BTN_PRIMARY, BTN_SECONDARY } from "@/app/admin/_components/ui";

export type AdminModeration = "approve" | "remove" | "dismiss_reports";

const LABEL: Record<AdminModeration, string> = { approve: "Approve", remove: "Remove post", dismiss_reports: "Keep post (dismiss reports)" };
const STYLE: Record<AdminModeration, string> = { approve: BTN_PRIMARY, remove: BTN_DANGER, dismiss_reports: BTN_SECONDARY };

/** Approve / keep / remove buttons for one post in Community → Moderation. */
export function ModerationActions({ postId, actions }: { postId: string; actions: readonly AdminModeration[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: AdminModeration) {
    if (action === "remove" && !window.confirm("Remove this post? Members won't see it anymore.")) return;
    setError(null);
    start(async () => {
      const res = await moderatePost({ postId, action });
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {actions.map((a) => (
        <button key={a} type="button" disabled={pending} className={STYLE[a]} onClick={() => run(a)}>
          {LABEL[a]}
        </button>
      ))}
      {error && (
        <span role="alert" className="text-sm text-red-700">
          {error}
        </span>
      )}
    </div>
  );
}
