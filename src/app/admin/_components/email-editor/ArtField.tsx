"use client";

import { useId } from "react";
import { EMAIL_ART_KINDS, EMAIL_ART_LABELS, isEmailArtKind, type EmailArtKind } from "@/lib/email-art";
import { INPUT, LABEL, MUTED } from "../ui";

interface ArtFieldProps {
  /** This email's own choice; undefined = follow the default. */
  value: EmailArtKind | undefined;
  /** What Settings → Email gives this kind of email. */
  defaultArt: EmailArtKind;
  onChange: (art: EmailArtKind | undefined) => void;
}

/** The "Top picture" choice for one email: the Settings default, Roni's photo, a line drawing or none. */
export function ArtField({ value, defaultArt, onChange }: ArtFieldProps) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={LABEL}>
        Top picture
      </label>
      <select
        id={id}
        className={INPUT}
        value={value ?? ""}
        onChange={(e) => onChange(isEmailArtKind(e.target.value) ? e.target.value : undefined)}
      >
        <option value="">Default ({EMAIL_ART_LABELS[defaultArt].toLowerCase()})</option>
        {EMAIL_ART_KINDS.map((kind) => (
          <option key={kind} value={kind}>
            {EMAIL_ART_LABELS[kind]}
          </option>
        ))}
      </select>
      <span className={`text-[12px] ${MUTED}`}>Shown above the text. An email that starts with its own image block has no picture by default.</span>
    </div>
  );
}
