"use client";

import { useRef, useState, useTransition } from "react";
import { SavedReplies } from "@/app/admin/_components/SavedReplies";
import { isFilledIn, type ReplyVars } from "@/lib/saved-replies/replies";
import { EMAIL_OUTCOME_NOTE } from "@/lib/feedback/email-outcome";
import { replyAsStaff } from "./actions";

/** Reply box for Roni's team under a member's video. */
export function StaffReply({ videoId, memberName, vars, onDone }: { videoId: string; memberName: string; vars: ReplyVars; onDone: (msg: string) => void }) {
  const [body, setBody] = useState("");
  const box = useRef<HTMLTextAreaElement>(null);
  const [pending, start] = useTransition();

  function send() {
    start(async () => {
      const res = await replyAsStaff({ videoId, body });
      if (!res.ok) {
        onDone(res.error);
        return;
      }
      setBody("");
      onDone(`Reply sent to ${memberName} ${EMAIL_OUTCOME_NOTE[res.data.email]}`);
    });
  }

  return (
    <div className="stack" style={{ gap: 8 }}>
      <label className="label" htmlFor="staffReply">
        Reply to {memberName}
      </label>
      <textarea ref={box} className="input" id="staffReply" style={{ minHeight: 84 }} maxLength={2000} value={body} onChange={(e) => setBody(e.target.value)} />
      <SavedReplies textareaRef={box} value={body} onChange={setBody} vars={vars} />
      <button type="button" className="btn btn-ghost btn-sm" style={{ alignSelf: "flex-start" }} onClick={send} disabled={pending || !body.trim() || !isFilledIn(body)}>
        {pending ? "Sending…" : "Send reply"}
      </button>
    </div>
  );
}
