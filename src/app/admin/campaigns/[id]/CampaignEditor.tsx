"use client";

import { useEffect, useState, useTransition } from "react";
import { newCampaignBlock } from "@/lib/email-blocks/defaults";
import type { EmailDoc } from "@/lib/email-blocks/types";
import type { Audience, AudienceKind } from "@/lib/flows/server/campaigns";
import { EXAMPLE_VARS, FLOW_TAGS } from "@/lib/flows/template";
import { BLOCK_TYPES } from "../../_components/email-editor/block-meta";
import { EmailEditor } from "../../_components/email-editor/EmailEditor";
import { uploadImage } from "../../_components/email-editor/upload-client";
import { BTN_PRIMARY, BTN_SECONDARY, INPUT, LABEL, MUTED } from "../../_components/ui";
import { ConsentChoice } from "../../_components/ConsentChoice";
import { sendTestEmail } from "../../email-flows/actions";
import { countAudience, saveCampaign, scheduleCampaign, unscheduleCampaign, type CampaignActionResult } from "../actions";
import { AUDIENCE_LABEL, AUDIENCE_NEEDS_CHAPTER } from "../audience";

interface ChapterOption {
  id: string;
  title: string;
}

interface CampaignEditorProps {
  id: string;
  status: "draft" | "scheduled";
  scheduledAt: string | null;
  initial: { name: string; audience: Audience; email: EmailDoc };
  chapters: readonly ChapterOption[];
  siteUrl: string;
}

/** Campaigns only fill names and app links (no flow offer), so the editor offers those tags. */
const CAMPAIGN_TAGS = FLOW_TAGS.filter((t) => ["first_name", "dog_name", "app_url"].includes(t.tag));
/** …and no member-code block, since a campaign issues no codes. */
const CAMPAIGN_BLOCKS = BLOCK_TYPES.filter((t) => t !== "code");
const EXAMPLE: Record<string, string> = { ...EXAMPLE_VARS };

/** "2026-10-04T18:00" in the browser's zone, for <input type="datetime-local">. */
function localInput(iso: string | null): string {
  const d = iso ? new Date(iso) : new Date(Date.now() + 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CampaignEditor({ id, status: initialStatus, scheduledAt, initial, chapters, siteUrl }: CampaignEditorProps) {
  const [name, setName] = useState(initial.name);
  const [audience, setAudience] = useState<Audience>(initial.audience);
  const [email, setEmail] = useState<EmailDoc>(initial.email);
  const [status, setStatus] = useState(initialStatus);
  const [when, setWhen] = useState(localInput(scheduledAt));
  const [count, setCount] = useState<string>("…");
  const [result, setResult] = useState<CampaignActionResult | null>(null);
  const [pending, start] = useTransition();
  const draft = () => ({ name, audience, email });

  useEffect(() => {
    let cancelled = false;
    countAudience(audience).then((r) => {
      if (!cancelled) setCount(r.ok ? String(r.count) : "—");
    });
    return () => {
      cancelled = true;
    };
  }, [audience]);

  const run = (action: () => Promise<CampaignActionResult>, onOk?: () => void) =>
    start(async () => {
      const res = await action();
      setResult(res);
      if (res.ok) onOk?.();
    });

  return (
    <div className="flex flex-col gap-4">
      {status === "scheduled" && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-[8px] bg-[#e6f0fb] px-4 py-3 text-[14px] text-[#1d4f91]">
          Scheduled for {new Date(scheduledAt ?? when).toLocaleString()}. You can still edit it until it starts sending.
          <button type="button" className={BTN_SECONDARY} disabled={pending} onClick={() => run(() => unscheduleCampaign(id), () => setStatus("draft"))}>
            Unschedule
          </button>
        </div>
      )}
      {result && <div role="status" className={`rounded-[8px] px-4 py-3 text-[14px] ${result.ok ? "bg-[#e3f5e8] text-[#1c6b35]" : "bg-[#fde8e8] text-[#a4262c]"}`}>{result.ok ? result.message : result.error}</div>}

      <div className="grid gap-4 rounded-[12px] border border-[#e7e6e4] bg-white p-5 md:grid-cols-3">
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>Campaign name (only you see it)</span>
          <input className={INPUT} value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>Send to</span>
          <select className={INPUT} value={audience.kind} onChange={(e) => setAudience({ kind: e.target.value as AudienceKind, courseId: null, days: 14, consent: audience.consent })}>
            {(Object.keys(AUDIENCE_LABEL) as AudienceKind[]).map((k) => (
              <option key={k} value={k}>
                {AUDIENCE_LABEL[k]}
              </option>
            ))}
          </select>
          <span className={`text-[12px] ${MUTED}`}>{count} people right now (unsubscribed people are left out)</span>
        </label>
        {AUDIENCE_NEEDS_CHAPTER.includes(audience.kind) && (
          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>Chapter</span>
            <select className={INPUT} value={audience.courseId ?? ""} onChange={(e) => setAudience({ ...audience, courseId: e.target.value || null })}>
              <option value="">Choose a chapter</option>
              {chapters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </label>
        )}
        {audience.kind === "has_tag" && (
          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>Tag</span>
            <input className={INPUT} maxLength={40} placeholder="vip" value={audience.tag ?? ""} onChange={(e) => setAudience({ ...audience, tag: e.target.value.toLowerCase() })} />
          </label>
        )}
        {audience.kind === "inactive_practice" && (
          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>No practice for (days)</span>
            <input className={INPUT} type="number" min={1} max={365} value={audience.days ?? 14} onChange={(e) => setAudience({ ...audience, days: Math.max(1, Math.round(Number(e.target.value) || 14)) })} />
          </label>
        )}
      </div>

      <div className="rounded-[12px] border border-[#e7e6e4] bg-white p-5">
        <ConsentChoice value={audience.consent ?? "marketing"} onChange={(consent) => setAudience({ ...audience, consent })} />
      </div>

      <EmailEditor
        value={email}
        onChange={setEmail}
        tags={CAMPAIGN_TAGS}
        exampleVars={EXAMPLE}
        siteUrl={siteUrl}
        uploadImage={uploadImage}
        blockTypes={CAMPAIGN_BLOCKS}
        makeBlock={newCampaignBlock}
      />

      <div className="flex flex-wrap items-end gap-2 rounded-[12px] border border-[#e7e6e4] bg-white p-4">
        <button type="button" className={BTN_SECONDARY} disabled={pending} onClick={() => run(() => saveCampaign(id, draft()))}>
          Save draft
        </button>
        <button type="button" className={BTN_SECONDARY} disabled={pending} onClick={() => run(() => sendTestEmail(email))}>
          Send a test to me
        </button>
        <div className="ml-auto flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1">
            <span className={`text-[12px] ${MUTED}`}>Send at (your time)</span>
            <input className={INPUT} type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
          </label>
          <button type="button" className={BTN_SECONDARY} disabled={pending} onClick={() => run(() => scheduleCampaign(id, draft(), new Date(when).toISOString()), () => setStatus("scheduled"))}>
            Schedule
          </button>
          <button
            type="button"
            className={BTN_PRIMARY}
            disabled={pending}
            onClick={() => {
              if (window.confirm(`Send "${email.subject || name}" to ${count} people now?`)) run(() => scheduleCampaign(id, draft(), null), () => setStatus("scheduled"));
            }}
          >
            Send now
          </button>
        </div>
      </div>
    </div>
  );
}
