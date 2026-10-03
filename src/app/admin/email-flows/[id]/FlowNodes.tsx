"use client";

import { createContext, useContext } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { ConditionNode, EmailNode, FlowNode, SplitNode, WaitNode } from "@/lib/flows/graph";
import type { StepStats } from "@/lib/flows/stats";
import { percent } from "@/lib/flows/stats";

/** What the canvas shows on top of each step: live numbers and the trigger's wording. */
export interface FlowMeta {
  steps: Record<string, StepStats & { variants: Record<string, StepStats> }>;
  atStep: Record<string, number>;
  triggerLabel: string;
  triggerDetail: string;
}

export const FlowMetaContext = createContext<FlowMeta>({ steps: {}, atStep: {}, triggerLabel: "", triggerDetail: "" });

const LOOK: Record<FlowNode["type"], { icon: string; label: string; accent: string }> = {
  trigger: { icon: "bolt", label: "Trigger", accent: "#0e666a" },
  email: { icon: "mail", label: "Email", accent: "#b36200" },
  wait: { icon: "schedule", label: "Wait", accent: "#6c6a69" },
  condition: { icon: "call_split", label: "Condition", accent: "#1d4f91" },
  split: { icon: "science", label: "A/B split", accent: "#7a3fa0" },
  exit: { icon: "flag", label: "Exit", accent: "#6c6a69" },
};

const HANDLE = "!h-3 !w-3 !border-2 !border-white !bg-[#9b9997]";

function Shell({ id, type, selected, children }: { id: string; type: FlowNode["type"]; selected: boolean; children?: React.ReactNode }) {
  const meta = useContext(FlowMetaContext);
  const look = LOOK[type];
  const waiting = meta.atStep[id] ?? 0;
  return (
    <div
      className={`w-[230px] rounded-[12px] border bg-white text-left shadow-[0_1px_3px_rgba(0,0,0,0.08)] ${selected ? "border-[#343332] ring-2 ring-black/10" : "border-[#e7e6e4]"}`}
      style={{ borderTopColor: look.accent, borderTopWidth: 3 }}
    >
      <div className="flex items-center justify-between gap-2 px-3 pt-2.5">
        <span className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide" style={{ color: look.accent }}>
          <span className="material-symbols-outlined text-[16px]" aria-hidden>
            {look.icon}
          </span>
          {look.label}
        </span>
        {waiting > 0 && <span className="rounded-full bg-[#e6f0fb] px-2 py-0.5 text-[11px] font-medium text-[#1d4f91]">{waiting} here</span>}
      </div>
      <div className="px-3 pb-3 pt-1 text-[13px] text-[#1a1a19]">{children}</div>
    </div>
  );
}

function BranchHandles({ left, right }: { left: { id: string; label: string }; right: { id: string; label: string } }) {
  return (
    <>
      <Handle type="source" position={Position.Bottom} id={left.id} className={HANDLE} style={{ left: "25%" }} />
      <Handle type="source" position={Position.Bottom} id={right.id} className={HANDLE} style={{ left: "75%" }} />
      <div className="flex justify-between px-6 pb-1.5 text-[11px] font-semibold text-[#6c6a69]">
        <span>{left.label}</span>
        <span>{right.label}</span>
      </div>
    </>
  );
}

export function TriggerCard({ id, selected }: NodeProps) {
  const meta = useContext(FlowMetaContext);
  return (
    <>
      <Shell id={id} type="trigger" selected={selected}>
        <p className="font-medium">{meta.triggerLabel}</p>
        <p className="text-[12px] text-[#6c6a69]">{meta.triggerDetail}</p>
      </Shell>
      <Handle type="source" position={Position.Bottom} className={HANDLE} />
    </>
  );
}

export function EmailCard({ id, data, selected }: NodeProps) {
  const meta = useContext(FlowMetaContext);
  const email = data as EmailNode["data"];
  const stats = meta.steps[id];
  return (
    <>
      <Handle type="target" position={Position.Top} className={HANDLE} />
      <Shell id={id} type="email" selected={selected}>
        <p className="line-clamp-2 font-medium">{email.subject || <span className="text-[#a4262c]">No subject yet</span>}</p>
        {stats && stats.sent > 0 ? (
          <p className="mt-1.5 flex gap-2 text-[12px] text-[#6c6a69]">
            <span>{stats.sent} sent</span>
            <span>· {percent(stats.openRate)} open</span>
            <span>· {percent(stats.clickRate)} click</span>
          </p>
        ) : (
          <p className="mt-1.5 text-[12px] text-[#9b9997]">Not sent yet</p>
        )}
      </Shell>
      <Handle type="source" position={Position.Bottom} className={HANDLE} />
    </>
  );
}

export function WaitCard({ id, data, selected }: NodeProps) {
  const { days, hours } = data as WaitNode["data"];
  const parts = [days ? `${days} day${days === 1 ? "" : "s"}` : "", hours ? `${hours} hour${hours === 1 ? "" : "s"}` : ""].filter(Boolean);
  return (
    <>
      <Handle type="target" position={Position.Top} className={HANDLE} />
      <Shell id={id} type="wait" selected={selected}>
        <p className="font-medium">{parts.join(" ") || "Set a time"}</p>
      </Shell>
      <Handle type="source" position={Position.Bottom} className={HANDLE} />
    </>
  );
}

export function ConditionCard({ id, data, selected }: NodeProps) {
  const { check } = data as ConditionNode["data"];
  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className={HANDLE} />
      <Shell id={id} type="condition" selected={selected}>
        <p className="font-medium">{check === "opened" ? "Opened the last email?" : "Clicked in the last email?"}</p>
      </Shell>
      <BranchHandles left={{ id: "yes", label: "YES" }} right={{ id: "no", label: "NO" }} />
    </div>
  );
}

export function SplitCard({ id, data, selected }: NodeProps) {
  const { percentA } = data as SplitNode["data"];
  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className={HANDLE} />
      <Shell id={id} type="split" selected={selected}>
        <p className="font-medium">
          A {percentA}% · B {100 - percentA}%
        </p>
      </Shell>
      <BranchHandles left={{ id: "a", label: "A" }} right={{ id: "b", label: "B" }} />
    </div>
  );
}

export function ExitCard({ id, selected }: NodeProps) {
  return (
    <>
      <Handle type="target" position={Position.Top} className={HANDLE} />
      <Shell id={id} type="exit" selected={selected}>
        <p className="text-[12px] text-[#6c6a69]">The member leaves the flow.</p>
      </Shell>
    </>
  );
}

export const NODE_TYPES = { trigger: TriggerCard, email: EmailCard, wait: WaitCard, condition: ConditionCard, split: SplitCard, exit: ExitCard };
