"use client";

import "@xyflow/react/dist/style.css";
import { useCallback, useMemo, useState, useTransition } from "react";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from "@xyflow/react";
import { emailDocFromNodeData } from "@/lib/email-blocks/defaults";
import type { EmailDoc } from "@/lib/email-blocks/types";
import { BRANCHES, type FlowEdge, type FlowGraph, type FlowNode, type FlowNodeType } from "@/lib/flows/graph";
import { insertOnEdge as insertOnEdgeGraph, tidyLayout } from "@/lib/flows/layout";
import type { FlowSettings } from "@/lib/flows/schema";
import { EXAMPLE_VARS, FLOW_TAGS } from "@/lib/flows/template";
import { newNode } from "@/lib/flows/templates";
import { describeTrigger } from "@/lib/flows/triggers";
import { EmailEditorModal } from "../../_components/email-editor/EmailEditor";
import { uploadImage } from "../../_components/email-editor/upload-client";
import { BTN_PRIMARY, BTN_SECONDARY, MUTED } from "../../_components/ui";
import { saveFlow, sendTestEmail, setFlowStatus, type FlowActionResult } from "../actions";
import { EDGE_TYPES, FlowMetaContext, NODE_TYPES, STEP_LOOK, type FlowMeta } from "./FlowNodes";
import { SettingsPanel, StepPanel, type ChapterOption } from "./FlowInspector";

type Status = "draft" | "live" | "paused";
type AddableType = Exclude<FlowNodeType, "trigger">;

interface FlowBuilderProps {
  flowId: string;
  status: Status;
  settings: FlowSettings;
  graph: FlowGraph;
  chapters: readonly ChapterOption[];
  stats: Pick<FlowMeta, "steps" | "atStep" | "actionsDone">;
  siteUrl: string;
}

/** A stable object: the email preview memoizes on it. */
const EXAMPLE: Record<string, string> = { ...EXAMPLE_VARS };

const PALETTE: AddableType[] = ["email", "wait", "condition", "action", "split", "exit"];
const DRAG_TYPE = "application/x-bonded-step";
/** Dropping within this distance (canvas px) of a connection's middle inserts the step on it. */
const SNAP_TO_EDGE = 80;
/** Approximate card size, for finding connection midpoints. */
const CARD = { w: 230, h: 80 };

const toRfNodes = (graph: FlowGraph): Node[] => graph.nodes.map((n) => ({ ...n, deletable: n.type !== "trigger" }) as unknown as Node);
const toRfEdge = (e: FlowEdge): Edge => ({ ...e, type: "insertable", sourceHandle: e.sourceHandle ?? null, label: e.sourceHandle ? e.sourceHandle.toUpperCase() : undefined });

/** Back to the stored shape: only the fields the flow needs, nothing React Flow adds. */
function toGraph(nodes: Node[], edges: Edge[]): FlowGraph {
  return {
    nodes: nodes.map((n) => ({ id: n.id, type: n.type, position: { x: Math.round(n.position.x), y: Math.round(n.position.y) }, data: n.data }) as unknown as FlowNode),
    edges: edges.map((e): FlowEdge => ({ id: e.id, source: e.source, target: e.target, sourceHandle: (e.sourceHandle as FlowEdge["sourceHandle"]) ?? null })),
  };
}

let counter = 0;
const freshId = (type: string) => `${type}-${Date.now().toString(36)}${(counter++).toString(36)}`;

function Palette({ onAdd }: { onAdd: (type: AddableType) => void }) {
  return (
    <aside className="flex flex-row flex-wrap gap-2 lg:flex-col" aria-label="Steps">
      <p className={`hidden text-[12px] font-semibold uppercase tracking-wide lg:block ${MUTED}`}>Drag a step</p>
      {PALETTE.map((type) => (
        <button
          key={type}
          type="button"
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData(DRAG_TYPE, type);
            e.dataTransfer.effectAllowed = "move";
          }}
          onClick={() => onAdd(type)}
          className="flex cursor-grab items-center gap-2 rounded-[10px] border border-[#e7e6e4] bg-white px-3 py-2 text-[14px] shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:bg-[#f8f8f8] active:cursor-grabbing"
          title="Drag onto the canvas or a connection, or click to add below the selected step"
        >
          <span className="material-symbols-outlined text-[18px]" style={{ color: STEP_LOOK[type].accent }} aria-hidden>
            {STEP_LOOK[type].icon}
          </span>
          {STEP_LOOK[type].label}
        </button>
      ))}
    </aside>
  );
}

function Builder({ flowId, status: initialStatus, settings: initialSettings, graph, chapters, stats, siteUrl }: FlowBuilderProps) {
  const flow = useReactFlow();
  const [nodes, setNodes] = useState<Node[]>(() => toRfNodes(graph));
  const [edges, setEdges] = useState<Edge[]>(() => graph.edges.map(toRfEdge));
  const [settings, setSettings] = useState(initialSettings);
  const [status, setStatus] = useState<Status>(initialStatus);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [result, setResult] = useState<FlowActionResult | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();
  const [testing, startTest] = useTransition();
  const touch = () => setDirty(true);

  const replaceGraph = useCallback((g: FlowGraph) => {
    setNodes(toRfNodes(g));
    setEdges(g.edges.map(toRfEdge));
    setDirty(true);
  }, []);

  const chapterTitle = useCallback((id: string | null | undefined) => chapters.find((c) => c.id === id)?.title ?? "", [chapters]);

  const insertOnEdge = useCallback(
    (edgeId: string, type: AddableType, position?: { x: number; y: number }) => {
      const edge = edges.find((e) => e.id === edgeId);
      const source = nodes.find((n) => n.id === edge?.source);
      const target = nodes.find((n) => n.id === edge?.target);
      const at = position ?? (source && target ? { x: (source.position.x + target.position.x) / 2, y: (source.position.y + target.position.y) / 2 } : { x: 0, y: 0 });
      const id = freshId(type);
      const next = insertOnEdgeGraph(toGraph(nodes, edges), edgeId, newNode(type, id, at), () => freshId("edge"));
      replaceGraph(tidyLayout(next));
      setSelectedId(id);
    },
    [nodes, edges, replaceGraph],
  );

  const meta: FlowMeta = useMemo(
    () => ({
      ...stats,
      chapterTitle,
      insertOnEdge: (edgeId, type) => insertOnEdge(edgeId, type),
      triggerLabel: describeTrigger(settings.trigger, settings.triggerParams, chapterTitle(settings.triggerParams.courseId) || undefined),
      triggerDetail: settings.discountPercent ? `${settings.discountPercent}% code for ${settings.discountValidDays} days` : settings.reentry === "once" ? "Once per person" : "Every time it happens",
    }),
    [stats, settings, chapterTitle, insertOnEdge],
  );

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((ns) => applyNodeChanges(changes, ns));
    if (changes.some((c) => c.type !== "select" && c.type !== "dimensions")) setDirty(true);
  }, []);
  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((es) => applyEdgeChanges(changes, es));
    if (changes.some((c) => c.type !== "select")) setDirty(true);
  }, []);
  const onConnect = useCallback((c: Connection) => {
    if (c.source === c.target) return;
    // One line per exit: reconnecting a branch replaces its old line.
    setEdges((es) =>
      addEdge(
        { ...c, id: freshId("edge"), type: "insertable", label: c.sourceHandle ? c.sourceHandle.toUpperCase() : undefined },
        es.filter((e) => !(e.source === c.source && (e.sourceHandle ?? null) === (c.sourceHandle ?? null))),
      ),
    );
    setDirty(true);
  }, []);

  /** Click in the palette: add below the selected step (connected when it has a free exit). */
  function addStep(type: AddableType) {
    const from = nodes.find((n) => n.id === selectedId) ?? nodes[nodes.length - 1];
    const id = freshId(type);
    const position = from ? { x: from.position.x, y: from.position.y + 150 } : { x: 0, y: 0 };
    setNodes((ns) => [...ns.map((n) => ({ ...n, selected: false })), { ...(newNode(type, id, position) as unknown as Node), selected: true }]);
    if (from) {
      const free = BRANCHES[from.type as FlowNodeType].find((h) => !edges.some((e) => e.source === from.id && (e.sourceHandle ?? null) === h));
      if (free !== undefined) setEdges((es) => [...es, toRfEdge({ id: freshId("edge"), source: from.id, target: id, sourceHandle: free })]);
    }
    setSelectedId(id);
    touch();
  }

  /** Drop from the palette: on a connection it's inserted there; elsewhere it's placed where dropped. */
  function onDrop(e: React.DragEvent) {
    const type = e.dataTransfer.getData(DRAG_TYPE) as AddableType;
    if (!PALETTE.includes(type)) return;
    e.preventDefault();
    const at = flow.screenToFlowPosition({ x: e.clientX, y: e.clientY });
    const nearest = edges
      .map((edge) => {
        const s = nodes.find((n) => n.id === edge.source);
        const t = nodes.find((n) => n.id === edge.target);
        if (!s || !t) return null;
        const mid = { x: (s.position.x + t.position.x) / 2 + CARD.w / 2, y: (s.position.y + CARD.h + t.position.y) / 2 };
        return { edge, distance: Math.hypot(mid.x - at.x, mid.y - at.y) };
      })
      .filter((x): x is { edge: Edge; distance: number } => x !== null)
      .sort((a, b) => a.distance - b.distance)[0];
    if (nearest && nearest.distance < SNAP_TO_EDGE && type !== "exit") return insertOnEdge(nearest.edge.id, type, at);
    const id = freshId(type);
    setNodes((ns) => [...ns.map((n) => ({ ...n, selected: false })), { ...(newNode(type, id, { x: at.x - CARD.w / 2, y: at.y - CARD.h / 2 }) as unknown as Node), selected: true }]);
    setSelectedId(id);
    touch();
  }

  function updateData(id: string, data: FlowNode["data"]) {
    setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, data: data as unknown as Record<string, unknown> } : n)));
    touch();
  }

  function deleteStep(id: string) {
    setNodes((ns) => ns.filter((n) => n.id !== id));
    setEdges((es) => es.filter((e) => e.source !== id && e.target !== id));
    setSelectedId(null);
    touch();
  }

  function duplicateStep(id: string) {
    const original = nodes.find((n) => n.id === id);
    if (!original) return;
    const copy = { ...original, id: freshId(original.type ?? "step"), position: { x: original.position.x + 40, y: original.position.y + 40 }, selected: true, data: structuredClone(original.data) };
    setNodes((ns) => [...ns.map((n) => ({ ...n, selected: false })), copy]);
    setSelectedId(copy.id);
    touch();
  }

  function save() {
    start(async () => {
      const res = await saveFlow(flowId, settings, toGraph(nodes, edges));
      setResult(res);
      if (res.ok) setDirty(false);
    });
  }

  function changeStatus(next: "live" | "paused", catchUp = false) {
    start(async () => {
      if (dirty) {
        const saved = await saveFlow(flowId, settings, toGraph(nodes, edges));
        if (!saved.ok) return setResult(saved);
        setDirty(false);
      }
      const res = await setFlowStatus(flowId, next, catchUp);
      setResult(res);
      if (res.ok) setStatus(next);
    });
  }

  const selected = nodes.find((n) => n.id === selectedId) as unknown as FlowNode | undefined;
  const editing = nodes.find((n) => n.id === editingEmail);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={BTN_SECONDARY} onClick={() => replaceGraph(tidyLayout(toGraph(nodes, edges)))}>
          <span className="material-symbols-outlined text-[18px]" aria-hidden>
            account_tree
          </span>
          Tidy up
        </button>
        <div className="ml-auto flex items-center gap-2">
          {dirty && <span className={`text-[13px] ${MUTED}`}>Unsaved changes</span>}
          <button type="button" className={BTN_SECONDARY} onClick={save} disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </button>
          {status === "live" ? (
            <button type="button" className={BTN_SECONDARY} onClick={() => changeStatus("paused")} disabled={pending}>
              Pause
            </button>
          ) : status === "paused" ? (
            <>
              <button
                type="button"
                className={BTN_SECONDARY}
                onClick={() => changeStatus("live", true)}
                disabled={pending}
                title="Also lets in everyone who hit the trigger while the flow was paused"
              >
                Resume and catch up
              </button>
              <button type="button" className={BTN_PRIMARY} onClick={() => changeStatus("live")} disabled={pending} title="People inside continue; only new people from now on">
                Resume
              </button>
            </>
          ) : (
            <button type="button" className={BTN_PRIMARY} onClick={() => changeStatus("live")} disabled={pending}>
              Go live
            </button>
          )}
        </div>
      </div>

      {result && (
        <div role="status" className={`rounded-[8px] px-4 py-3 text-[14px] ${result.ok ? "bg-[#e3f5e8] text-[#1c6b35]" : "bg-[#fde8e8] text-[#a4262c]"}`}>
          {result.ok ? result.message : result.error}
          {!result.ok && result.problems && (
            <ul className="mt-1 list-disc pl-5">
              {result.problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[150px_minmax(0,1fr)_360px]">
        <Palette onAdd={addStep} />
        <div className="h-[680px] overflow-hidden rounded-[12px] border border-[#e7e6e4] bg-[#fafaf9]" onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
          <FlowMetaContext.Provider value={meta}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={NODE_TYPES}
              edgeTypes={EDGE_TYPES}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={(_, n) => setSelectedId(n.id)}
              onNodeDoubleClick={(_, n) => n.type === "email" && setEditingEmail(n.id)}
              onPaneClick={() => setSelectedId(null)}
              deleteKeyCode={["Backspace", "Delete"]}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              proOptions={{ hideAttribution: true }}
            >
              <Background gap={20} color="#e7e6e4" />
              <Controls showInteractive={false} />
            </ReactFlow>
          </FlowMetaContext.Provider>
        </div>
        <aside className="max-h-[680px] overflow-y-auto rounded-[12px] border border-[#e7e6e4] bg-white p-5">
          {selected ? (
            <StepPanel
              node={selected}
              chapters={chapters}
              stats={stats.steps[selected.id]}
              onData={(d) => updateData(selected.id, d)}
              onDelete={() => deleteStep(selected.id)}
              onDuplicate={() => duplicateStep(selected.id)}
              onEditEmail={() => setEditingEmail(selected.id)}
              onTest={() => startTest(async () => setResult(await sendTestEmail(emailDocFromNodeData(selected.data))))}
              testing={testing}
            />
          ) : (
            <SettingsPanel
              settings={settings}
              chapters={chapters}
              onChange={(s) => {
                setSettings(s);
                touch();
              }}
            />
          )}
        </aside>
      </div>

      {editing && (
        <EmailEditorModal
          open
          title="Edit email"
          value={emailDocFromNodeData(editing.data)}
          tags={FLOW_TAGS}
          exampleVars={EXAMPLE}
          siteUrl={siteUrl}
          uploadImage={uploadImage}
          onClose={() => setEditingEmail(null)}
          onSave={(doc: EmailDoc) => {
            updateData(editing.id, doc);
            setEditingEmail(null);
          }}
          saveLabel="Done"
        />
      )}
    </div>
  );
}

export function FlowBuilder(props: FlowBuilderProps) {
  return (
    <ReactFlowProvider>
      <Builder {...props} />
    </ReactFlowProvider>
  );
}
