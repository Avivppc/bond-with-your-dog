"use client";

import { useActionState } from "react";
import { resendStaffConfirmLink, type StaffLinkState } from "@/app/(member)/staff-invite-actions";
import { Ms } from "./ui";

interface StaffInviteBannerProps {
  email: string;
  role: "owner" | "editor";
}

const ROLE_NAME = { owner: "an owner", editor: "a content editor" } as const;
const INITIAL: StaffLinkState = { status: "idle", message: "" };

/** Shown to an admin invitee whose inbox isn't proven yet, so they know why they only see the member app. */
export function StaffInviteBanner({ email, role }: StaffInviteBannerProps) {
  const [state, send, pending] = useActionState(resendStaffConfirmLink, INITIAL);

  return (
    <div className="studio-banner staff-invite-banner" role="status">
      <Ms name="admin_panel_settings" fill />
      <div className="staff-invite-text">
        <strong>You&apos;re invited to the Bonded admin as {ROLE_NAME[role]}.</strong>{" "}
        {state.message || <>Confirm it&apos;s your email: open the link we sent to {email}.</>}
      </div>
      <form action={send}>
        <button type="submit" className="btn btn-ghost btn-sm" disabled={pending}>
          {pending ? "Sending…" : "Send the link again"}
        </button>
      </form>
    </div>
  );
}
