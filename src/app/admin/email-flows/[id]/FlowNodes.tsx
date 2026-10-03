"use client";

import { createContext, useContext, useState } from "react";
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, Handle, Position, ViewportPortal, type EdgeProps, type NodeProps } from "@xyflow/react";
import type { ActionNode, ConditionNode, EmailStepData, FlowNode, FlowNodeType, SplitNode, WaitNode } from "@/lib/flows/graph";
import { ACTION_LABEL } from "@/lib/flows/actions";
import type { StepStats } from "@/lib/flows/stats";
import { percent } from "@/lib/flows/stats";

/** What the canvas shows on top of each step: live numbers, the trigger's wording, and the insert action. */
export interface FlowMeta {
  steps: Record<string, StepStats & { variants: Record<string, StepStats> }>;
  atStep: Record<string, number>;
  /** How many people each action step has been carried out for. */
  actionsDone: Record<string, number>;
  triggerLabel: string;
  triggerDetail: string;
  chapterTitle: (id: string | null | undefined) => string;
  insertOnEdge: (edgeId: string, type: Exclude<FlowNodeType, "trigger" | "exit">) => void;
}

export const FlowMetaContext = createContext<FlowMeta>({
  steps: {},
  atStep: {},
  actionsDone: {},
  triggerLabel: "",
  triggerDetail: "",
  chapterTitle: () => "",
  insertOnEdge: () => undefined,
});

export const STEP_LOOK: Record<FlowNodeType, { icon: string; label: string; accent: string }> = {
  trigger: { icon: "bolt", label: "Trigger", accent: "#0e666a" },
  email: { icon: "mail", label: "Email", accent: "#b36200" },
  wait: { icon: "schedule", label: "Wait", accent: "#6c6a69" },
  condition: { icon: "call_split", label: "Condition", accent: "#1d4f91" },
  split: { icon: "science", label: "A/B split", accent: "#7a3fa0" },
  action: { icon: "electric_bolt", label: "Action", accent: "#1c6b35" },
  exit: { icon: "flag", label: "Exit", accent: "#6c6a69" },
};

const HANDLE = "!h-3 !w-3 !border-2 !border-white !bg-[#9b9997]";

function Shell({ id, type, selected, children }: { id: string; type: FlowNodeType; selected: boolean; children?: React.ReactNode }) {
  const meta = useContext(FlowMetaContext);
  const look = STEP_LOOK[type];
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

function TriggerCard({ id, selected }: NodeProps) {
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

function EmailCard({ id, data, selected }: NodeProps) {
  const meta = useContext(FlowMetaContext);
  const subject = (data as unknown as EmailStepData).subject;
  const stats = meta.steps[id];
  return (
    <>
      <Handle type="target" position={Position.Top} className={HANDLE} />
      <Shell id={id} type="email" selected={selected}>
        <p className="line-clamp-2 font-medium">{subject || <span className="text-[#a4262c]">No subject yet</span>}</p>
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

function WaitCard({ id, data, selected }: NodeProps) {
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

/** "Owns Bonded: Moves?", "Practiced in the last 7 days?" — a condition in plain words. */
export function conditionQuestion(data: ConditionNode["data"], chapterTitle: (id: string | null | undefined) => string): string {
  switch (data.check) {
    case "opened":
      return "Opened the last email?";
    case "clicked":
      return "Clicked in the last email?";
    case "owns_chapter":
      return `Has ${chapterTitle(data.courseId) || "the chapter"}?`;
    case "completed_chapter":
      return `Finished ${chapterTitle(data.courseId) || "the chapter"}?`;
    case "practiced_recently":
      return `Practiced in the last ${data.days ?? 7} days?`;
    case "has_purchased":
      return "Has bought anything?";
    case "is_member":
      return "Has an account?";
    case "has_tag":
      return data.tag ? `Tagged "${data.tag}"?` : "Has a tag?";
  }
}

/** "Give Bonded: Moves", "Add tag vip", "Webhook to hooks.zapier.com" — an action in plain words. */
export function actionSummary(data: ActionNode["data"], chapterTitle: (id: string | null | undefined) => string): string {
  switch (data.action) {
    case "grant_chapter":
      return `Give ${chapterTitle(data.courseId) || "a chapter"}`;
    case "revoke_chapter":
      return `Take back ${chapterTitle(data.courseId) || "a chapter"}`;
    case "add_tag":
      return data.tag ? `Add tag "${data.tag}"` : "Add a tag";
    case "remove_tag":
      return data.tag ? `Remove tag "${data.tag}"` : "Remove a tag";
    case "notify_team":
      return "Notify the team";
    case "webhook": {
      const host = (() => {
        try {
          return new URL(data.url ?? "").hostname;
        } catch {
          return "";
        }
      })();
      return host ? `Webhook to ${host}` : ACTION_LABEL.webhook;
    }
  }
}

function ConditionCard({ id, data, selected }: NodeProps) {
  const meta = useContext(FlowMetaContext);
  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className={HANDLE} />
      <Shell id={id} type="condition" selected={selected}>
        <p className="font-medium">{conditionQuestion(data as ConditionNode["data"], meta.chapterTitle)}</p>
      </Shell>
      <BranchHandles left={{ id: "yes", label: "YES" }} right={{ id: "no", label: "NO" }} />
    </div>
  );
}

function SplitCard({ id, data, selected }: NodeProps) {
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

function ActionCard({ id, data, selected }: NodeProps) {
  const meta = useContext(FlowMetaContext);
  const done = meta.actionsDone[id] ?? 0;
  return (
    <>
      <Handle type="target" position={Position.Top} className={HANDLE} />
      <Shell id={id} type="action" selected={selected}>
        <p className="line-clamp-2 font-medium">{actionSummary(data as unknown as ActionNode["data"], meta.chapterTitle)}</p>
        <p className="mt-1.5 text-[12px] text-[#9b9997]">{done > 0 ? `Done for ${done}` : "Not run yet"}</p>
      </Shell>
      <Handle type="source" position={Position.Bottom} className={HANDLE} />
    </>
  );
}

function ExitCard({ id, selected }: NodeProps) {
  return (
    <>
      <Handle type="target" position={Position.Top} className={HANDLE} />
      <Shell id={id} type="exit" selected={selected}>
        <p className="text-[12px] text-[#6c6a69]">The person leaves the flow.</p>
      </Shell>
    </>
  );
}

export const NODE_TYPES = { trigger: TriggerCard, email: EmailCard, wait: WaitCard, condition: ConditionCard, split: SplitCard, action: ActionCard, exit: ExitCard };

const INSERTABLE: Exclude<FlowNodeType, "trigger" | "exit">[] = ["email", "wait", "condition", "action", "split"];

/** A connection with a "+" in the middle that inserts a step right there. */
function InsertableEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, label, markerEnd, style }: EdgeProps) {
  const meta = useContext(FlowMetaContext);
  const [open, setOpen] = useState(false);
  const [path, labelX, labelY] = getSmoothStepPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });
  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <div className="nodrag nopan absolute flex flex-col items-center gap-1" style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`, pointerEvents: "all" }}>
          {label && <span className="rounded bg-white px-1 text-[10px] font-semibold text-[#6c6a69]">{label}</span>}
          <button
            type="button"
            className="grid h-6 w-6 place-items-center rounded-full border border-[#d9d8d6] bg-white text-[#343332] shadow-sm hover:bg-[#f3f3f2]"
            aria-label="Insert a step here"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden>
              add
            </span>
          </button>
        </div>
      </EdgeLabelRenderer>
      {open && (
        <ViewportPortal>
          <div
            role="menu"
            className="nodrag nopan absolute z-10 flex flex-col rounded-[10px] border border-[#e7e6e4] bg-white p-1 shadow-lg"
            style={{ transform: `translate(-50%, 16px) translate(${labelX}px, ${labelY}px)`, pointerEvents: "all" }}
          >
            {INSERTABLE.map((type) => (
              <button
                key={type}
                type="button"
                role="menuitem"
                className="flex items-center gap-2 rounded-[6px] px-2.5 py-1.5 text-left text-[13px] hover:bg-[#f3f3f2]"
                onClick={() => {
                  setOpen(false);
                  meta.insertOnEdge(id, type);
                }}
              >
                <span className="material-symbols-outlined text-[16px]" style={{ color: STEP_LOOK[type].accent }} aria-hidden>
                  {STEP_LOOK[type].icon}
                </span>
                {STEP_LOOK[type].label}
              </button>
            ))}
          </div>
        </ViewportPortal>
      )}
    </>
  );
}

export const EDGE_TYPES = { insertable: InsertableEdge };

/** For FlowNode typing on the canvas: React Flow only needs id/type/position/data. */
export type CanvasNode = FlowNode;
