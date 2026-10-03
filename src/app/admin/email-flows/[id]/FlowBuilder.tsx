"use client";

import "@xyflow/react/dist/style.css";
import { useCallback, useMemo, useState, useTransition } from "react";
import { addEdge, applyEdgeChanges, applyNodeChanges, Background, Controls, ReactFlow, type Connection, type Edge, type EdgeChange, type Node, type NodeChange } from "@xyflow/react";
import { BRANCHES, type FlowEdge, type FlowGraph, type FlowNode, type FlowNodeType } from "@/lib/flows/graph";
import type { FlowSettings } from "@/lib/flows/schema";
import { newNode, TRIGGER_LABEL } from "@/lib/flows/templates";
import { BTN_PRIMARY, BTN_SECONDARY, MUTED } from "../../_components/ui";
import { saveFlow, sendTestEmail, setFlowStatus, type FlowActionResult } from "../actions";
import { FlowMetaContext, NODE_TYPES, type FlowMeta } from "./FlowNodes";
import { SettingsPanel, StepPanel, type ChapterOption } from "./FlowInspector";

type Status = "draft" | "live" | "paused";

interface FlowBuilderProps {
  flowId: string;
  status: Status;
  settings: FlowSettings;
  graph: FlowGraph;
  chapters: readonly ChapterOption[];
  stats: Pick<FlowMeta, "steps" | "atStep">;
}

const ADDABLE: { type: Exclude<FlowNodeType, "trigger">; label: string; icon: string }[] = [
  { type: "email", label: "Email", icon: "mail" },
  { type: "wait", label: "Wait", icon: "schedule" },
  { type: "condition", label: "Condition", icon: "call_split" },
  { type: "split", label: "A/B split", icon: "science" },
  { type: "exit", label: "Exit", icon: "flag" },
];

const toRfNodes = (graph: FlowGraph): Node[] => graph.nodes.map((n) => ({ ...n, deletable: n.type !== "trigger" }));
const toRfEdges = (graph: FlowGraph): Edge[] => graph.edges.map((e) => ({ ...e, sourceHandle: e.sourceHandle ?? null, label: e.sourceHandle ? e.sourceHandle.toUpperCase() : undefined }));

/** Back to the stored shape: only the fields the flow needs, nothing React Flow adds. */
function toGraph(nodes: Node[], edges: Edge[]): FlowGraph {
  return {
    nodes: nodes.map((n) => ({ id: n.id, type: n.type, position: { x: Math.round(n.position.x), y: Math.round(n.position.y) }, data: n.data }) as FlowNode),
    edges: edges.map((e): FlowEdge => ({ id: e.id, source: e.source, target: e.target, sourceHandle: (e.sourceHandle as FlowEdge["sourceHandle"]) ?? null })),
  };
}

let counter = 0;
const freshId = (type: string) => `${type}-${Date.now().toString(36)}${(counter++).toString(36)}`;

export function FlowBuilder({ flowId, status: initialStatus, settings: initialSettings, graph, chapters, stats }: FlowBuilderProps) {
  const [nodes, setNodes] = useState<Node[]>(() => toRfNodes(graph));
  const [edges, setEdges] = useState<Edge[]>(() => toRfEdges(graph));
  const [settings, setSettings] = useState(initialSettings);
  const [status, setStatus] = useState<Status>(initialStatus);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [result, setResult] = useState<FlowActionResult | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();
  const [testing, startTest] = useTransition();

  const chapterTitle = chapters.find((c) => c.id === settings.courseId)?.title;
  const meta: FlowMeta = useMemo(
    () => ({
      ...stats,
      triggerLabel: TRIGGER_LABEL[settings.trigger],
      triggerDetail: `${chapterTitle ?? "Any chapter"}${settings.discountPercent ? ` · ${settings.discountPercent}% code for ${settings.discountValidDays} days` : ""}`,
    }),
    [stats, settings, chapterTitle],
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
        { ...c, id: freshId("edge"), label: c.sourceHandle ? c.sourceHandle.toUpperCase() : undefined },
        es.filter((e) => !(e.source === c.source && (e.sourceHandle ?? null) === (c.sourceHandle ?? null))),
      ),
    );
    setDirty(true);
  }, []);

  const selected = nodes.find((n) => n.id === selectedId) as unknown as FlowNode | undefined;

  function addStep(type: Exclude<FlowNodeType, "trigger">) {
    const from = nodes.find((n) => n.id === selectedId) ?? nodes[nodes.length - 1];
    const id = freshId(type);
    const position = from ? { x: from.position.x, y: from.position.y + 150 } : { x: 0, y: 0 };
    setNodes((ns) => [...ns.map((n) => ({ ...n, selected: false })), { ...newNode(type, id, position), selected: true }]);
    // Connect it under the selected step when that step still has a free exit.
    if (from) {
      const free = BRANCHES[from.type as FlowNodeType].find((h) => !edges.some((e) => e.source === from.id && (e.sourceHandle ?? null) === h));
      if (free !== undefined) setEdges((es) => [...es, { id: freshId("edge"), source: from.id, target: id, sourceHandle: free, label: free ? free.toUpperCase() : undefined }]);
    }
    setSelectedId(id);
    setDirty(true);
  }

  function updateData(id: string, data: FlowNode["data"]) {
    setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, data } : n)));
    setDirty(true);
  }

  function deleteStep(id: string) {
    setNodes((ns) => ns.filter((n) => n.id !== id));
    setEdges((es) => es.filter((e) => e.source !== id && e.target !== id));
    setSelectedId(null);
    setDirty(true);
  }

  function save() {
    start(async () => {
      const res = await saveFlow(flowId, settings, toGraph(nodes, edges));
      setResult(res);
      if (res.ok) setDirty(false);
    });
  }

  function changeStatus(next: "live" | "paused") {
    start(async () => {
      if (dirty) {
        const saved = await saveFlow(flowId, settings, toGraph(nodes, edges));
        if (!saved.ok) return setResult(saved);
        setDirty(false);
      }
      const res = await setFlowStatus(flowId, next);
      setResult(res);
      if (res.ok) setStatus(next);
    });
  }

  function test(nodeId: string) {
    startTest(async () => setResult(await sendTestEmail(nodeId, toGraph(nodes, edges))));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {ADDABLE.map((a) => (
          <button key={a.type} type="button" className={BTN_SECONDARY} onClick={() => addStep(a.type)}>
            <span className="material-symbols-outlined text-[18px]" aria-hidden>
              {a.icon}
            </span>
            {a.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          {dirty && <span className={`text-[13px] ${MUTED}`}>Unsaved changes</span>}
          <button type="button" className={BTN_SECONDARY} onClick={save} disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </button>
          {status === "live" ? (
            <button type="button" className={BTN_SECONDARY} onClick={() => changeStatus("paused")} disabled={pending}>
              Pause
            </button>
          ) : (
            <button type="button" className={BTN_PRIMARY} onClick={() => changeStatus("live")} disabled={pending}>
              {status === "paused" ? "Resume" : "Go live"}
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

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="h-[640px] overflow-hidden rounded-[12px] border border-[#e7e6e4] bg-[#fafaf9]">
          <FlowMetaContext.Provider value={meta}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={NODE_TYPES}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={(_, n) => setSelectedId(n.id)}
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
        <aside className="max-h-[640px] overflow-y-auto rounded-[12px] border border-[#e7e6e4] bg-white p-5">
          {selected ? (
            <StepPanel
              node={selected}
              stats={stats.steps[selected.id]}
              onData={(d) => updateData(selected.id, d)}
              onDelete={() => deleteStep(selected.id)}
              onTest={() => test(selected.id)}
              testing={testing}
            />
          ) : (
            <SettingsPanel
              settings={settings}
              chapters={chapters}
              onChange={(s) => {
                setSettings(s);
                setDirty(true);
              }}
            />
          )}
        </aside>
      </div>
    </div>
  );
}
