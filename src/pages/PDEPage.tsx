import { useCallback, useState, useMemo, useRef, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type Edge,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  Flame,
  Plus,
  Play,
  ArrowLeft,
  LayoutGrid,
  Database,
  Terminal,
  FileText,
} from "lucide-react";
import EntityNode from "@/components/canvas/EntityNode";
import TransactionNode from "@/components/canvas/TransactionNode";
import ForgeStatusNode from "@/components/canvas/ForgeStatusNode";
import OracleNode from "@/components/canvas/OracleNode";
import WebContainerEditor, {
  type WebContainerEditorHandle,
} from "@/components/canvas/WebContainerEditor";
import CLIPanel from "@/components/pde/CLIPanel";
import SQLWorkbenchPanel from "@/components/pde/SQLWorkbenchPanel";
import EvidencePanel, { type LogEntry } from "@/components/pde/EvidencePanel";
import PanelToggleBar, { type PanelState } from "@/components/pde/PanelToggleBar";
import {
  createPDEChannel,
  broadcastMessage,
  onMessage,
} from "@/lib/pde-channel";
import type { ForgeBlueprint } from "@/lib/forge-types";
import { generateAllFiles, generateDDL } from "@/lib/sql-generator";

// ── Panel config ───────────────────────────────────────────────

const PANEL_CONFIGS = [
  { id: "canvas", label: "Canvas", icon: LayoutGrid },
  { id: "sql", label: "SQL", icon: Database },
  { id: "cli", label: "CLI", icon: Terminal },
  { id: "evidence", label: "Evidence", icon: FileText },
];

const PDEPage = () => {
  const navigate = useNavigate();
  const editorRef = useRef<WebContainerEditorHandle>(null);

  // ── React Flow state ────────────────────────────────────────────
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // ── Panel states ────────────────────────────────────────────────
  const [panelStates, setPanelStates] = useState<Record<string, PanelState>>(() => {
    const saved = sessionStorage.getItem("lampforge-panel-states");
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return { canvas: "visible", sql: "visible", cli: "visible", evidence: "visible" };
  });

  // ── Blueprint & terminal ────────────────────────────────────────
  const [blueprint, setBlueprint] = useState<ForgeBlueprint | null>(null);
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const [evidenceLogs, setEvidenceLogs] = useState<LogEntry[]>([]);
  const [activeBottomTab, setActiveBottomTab] = useState("cli");
  const hasPopulated = useRef(false);
  const channelRef = useRef<BroadcastChannel | null>(null);

  const nodeTypes = useMemo(
    () => ({ entity: EntityNode, transaction: TransactionNode, forgeStatus: ForgeStatusNode, oracle: OracleNode }),
    []
  );

  // ── Persist panel states ──────────────────────────────────────
  useEffect(() => {
    sessionStorage.setItem("lampforge-panel-states", JSON.stringify(panelStates));
  }, [panelStates]);

  // ── BroadcastChannel ──────────────────────────────────────────
  useEffect(() => {
    const channel = createPDEChannel();
    channelRef.current = channel;

    const cleanup = onMessage(channel, (msg) => {
      if (msg.type === "panel-closed") {
        setPanelStates((prev) => ({
          ...prev,
          [msg.payload.panelId]: "visible",
        }));
      }
    });

    return () => {
      cleanup();
      channel?.close();
    };
  }, []);

  // ── Populate from blueprint on mount ──────────────────────────
  useEffect(() => {
    if (hasPopulated.current) return;

    const raw = sessionStorage.getItem("lampforge-blueprint");
    if (!raw) return;
    hasPopulated.current = true;

    const provider = sessionStorage.getItem("lampforge-provider") || "unknown";
    const route = sessionStorage.getItem("lampforge-route") || "schema_generation";

    // Keep a copy for PDE panels (don't delete yet so undocked panels can read it)
    sessionStorage.setItem("lampforge-blueprint-pde", raw);

    // Clean up landing page keys
    sessionStorage.removeItem("lampforge-blueprint");
    sessionStorage.removeItem("lampforge-provider");
    sessionStorage.removeItem("lampforge-route");

    let bp: ForgeBlueprint;
    try {
      bp = JSON.parse(raw);
    } catch {
      return;
    }

    setBlueprint(bp);
    populateFromBlueprint(bp, provider, route);

    // Determine default panel visibility based on scaffold level
    if (bp.scaffold_level === "rad") {
      setPanelStates({ canvas: "visible", sql: "visible", cli: "visible", evidence: "visible" });
    } else {
      setPanelStates({ canvas: "visible", sql: "hidden", cli: "visible", evidence: "hidden" });
    }

    addEvidenceLog("milestone", "Project Initialized", `Blueprint forged via ${provider}, scaffold: ${bp.scaffold_level}`);
  }, []);

  // ── Evidence logging ──────────────────────────────────────────
  const addEvidenceLog = useCallback(
    (type: string, title: string, description: string) => {
      const entry: LogEntry = {
        id: Date.now().toString() + Math.random().toString(36).slice(2),
        type: type as LogEntry["type"],
        title,
        description,
        timestamp: new Date().toISOString(),
        stage: "Implementation",
      };
      setEvidenceLogs((prev) => {
        const updated = [entry, ...prev];
        sessionStorage.setItem("lampforge-evidence-logs", JSON.stringify(updated.slice(0, 100)));
        return updated;
      });
    },
    []
  );

  // ── Blueprint population (same as CanvasPage) ─────────────────
  const populateFromBlueprint = (bp: ForgeBlueprint, provider: string, route: string) => {
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];

    bp.entities.forEach((entity, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = col * 350 + 100;
      const y = row * 300 + 100;

      newNodes.push({
        id: `entity-${entity.name}`,
        type: "entity",
        position: { x, y },
        data: { label: entity.name, fields: entity.fields },
      });

      const txn = bp.transactions.find((t) => t.entity === entity.name);
      if (txn) {
        newNodes.push({
          id: `txn-${entity.name}`,
          type: "transaction",
          position: { x: x + 50, y: y + 200 },
          data: { label: `${entity.name} CRUD`, operation: txn.operations.join(", ") },
        });
        newEdges.push({
          id: `edge-entity-txn-${entity.name}`,
          source: `entity-${entity.name}`,
          target: `txn-${entity.name}`,
          animated: true,
          style: { stroke: "hsl(32, 95%, 60%)" },
        });
      }
    });

    for (const rel of bp.relationships) {
      newEdges.push({
        id: `edge-rel-${rel.name}`,
        source: `entity-${rel.from}`,
        target: `entity-${rel.to}`,
        animated: true,
        label: `${rel.cardinality}`,
        style: { stroke: "hsl(142, 72%, 50%)" },
      });
    }

    newNodes.push({
      id: "forge-status",
      type: "forgeStatus",
      position: { x: 100, y: -80 },
      data: { label: `${provider} | ${bp.scaffold_level} | ${route}` },
    });

    setNodes(newNodes);
    setEdges(newEdges);

    // Push files to WebContainer
    const files = generateAllFiles(bp);
    setTimeout(() => {
      editorRef.current?.applyFsDiff(files);
    }, 2000);
  };

  // ── Panel toggle & undock ─────────────────────────────────────
  const handleToggle = useCallback((id: string) => {
    setPanelStates((prev) => {
      const current = prev[id];
      if (current === "undocked") return prev; // can't toggle undocked
      return { ...prev, [id]: current === "visible" ? "hidden" : "visible" };
    });
  }, []);

  const handleUndock = useCallback(
    (id: string) => {
      window.open(`/pde/panel/${id}`, `lampforge-${id}`, "width=900,height=600");
      setPanelStates((prev) => ({ ...prev, [id]: "undocked" }));
      broadcastMessage(channelRef.current, {
        type: "panel-undocked",
        payload: { panelId: id },
      });
    },
    []
  );

  // ── Canvas interactions ───────────────────────────────────────
  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge({ ...params, animated: true, style: { stroke: "hsl(142, 72%, 50%)" } }, eds)
      );
      addEvidenceLog("code", "Relationship Created", "New relationship edge added on canvas");
    },
    [setEdges, addEvidenceLog]
  );

  const addEntityNode = () => {
    const id = `entity-${Date.now()}`;
    setNodes((nds) => [
      ...nds,
      {
        id,
        type: "entity",
        position: { x: 100 + Math.random() * 300, y: 100 + Math.random() * 200 },
        data: {
          label: "NewEntity",
          fields: [
            { name: "id", type: "INT", constraint: "PRIMARY KEY" },
            { name: "name", type: "VARCHAR(255)", constraint: "NOT NULL" },
          ],
        },
      },
    ]);
    addEvidenceLog("code", "Entity Added", "New entity node added to canvas");
  };

  const addTransactionNode = () => {
    const id = `txn-${Date.now()}`;
    setNodes((nds) => [
      ...nds,
      {
        id,
        type: "transaction",
        position: { x: 400 + Math.random() * 200, y: 100 + Math.random() * 200 },
        data: { label: "CRUD Operation", operation: "CREATE" },
      },
    ]);
  };

  // ── Derived state ─────────────────────────────────────────────
  const canvasVisible = panelStates.canvas === "visible";
  const bottomVisible = ["cli", "sql", "evidence"].some((id) => panelStates[id] === "visible");

  return (
    <div className="dark flex h-screen flex-col bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Flame className="h-5 w-5 text-forge-transaction" />
          <span className="font-semibold">LAMPForge PDE</span>
        </div>

        <PanelToggleBar
          panels={PANEL_CONFIGS}
          states={panelStates}
          onToggle={handleToggle}
          onUndock={handleUndock}
        />

        <Button size="sm" className="gap-1.5">
          <Play className="h-3.5 w-3.5" />
          Run
        </Button>
      </header>

      {/* Main content */}
      <ResizablePanelGroup direction="vertical" className="flex-1">
        {/* Top: Canvas + Editor */}
        <ResizablePanel defaultSize={bottomVisible ? 65 : 100} minSize={30}>
          <ResizablePanelGroup direction="horizontal">
            {/* Architecture Canvas */}
            {canvasVisible && (
              <>
                <ResizablePanel
                  defaultSize={40}
                  minSize={20}
                  collapsible
                  collapsedSize={0}
                >
                  <div className="relative h-full">
                    <ReactFlow
                      nodes={nodes}
                      edges={edges}
                      onNodesChange={onNodesChange}
                      onEdgesChange={onEdgesChange}
                      onConnect={onConnect}
                      nodeTypes={nodeTypes}
                      fitView
                      className="bg-background"
                    >
                      <Background gap={20} size={1} />
                      <Controls className="!bg-card !border-border !shadow-none [&>button]:!bg-card [&>button]:!border-border [&>button]:!text-foreground" />
                      <MiniMap
                        nodeColor={(n) => {
                          if (n.type === "entity") return "hsl(210, 100%, 60%)";
                          if (n.type === "transaction") return "hsl(32, 95%, 60%)";
                          if (n.type === "forgeStatus") return "hsl(0, 72%, 55%)";
                          if (n.type === "oracle") return "hsl(270, 70%, 65%)";
                          return "hsl(220, 15%, 16%)";
                        }}
                        className="!bg-card !border-border"
                      />
                      <Panel position="top-left" className="flex gap-2">
                        <Button size="sm" variant="secondary" onClick={addEntityNode} className="gap-1.5 text-xs">
                          <Plus className="h-3 w-3" />
                          <span className="text-forge-blueprint">■</span> Entity
                        </Button>
                        <Button size="sm" variant="secondary" onClick={addTransactionNode} className="gap-1.5 text-xs">
                          <Plus className="h-3 w-3" />
                          <span className="text-forge-transaction">■</span> Transaction
                        </Button>
                      </Panel>
                    </ReactFlow>
                  </div>
                </ResizablePanel>
                <ResizableHandle withHandle />
              </>
            )}

            {/* WebContainer Editor (always visible) */}
            <ResizablePanel defaultSize={canvasVisible ? 60 : 100} minSize={30}>
              <WebContainerEditor ref={editorRef} />
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>

        {/* Bottom: Tabbed Panels */}
        {bottomVisible && (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={35} minSize={15} collapsible collapsedSize={0}>
              <Tabs value={activeBottomTab} onValueChange={setActiveBottomTab} className="flex h-full flex-col">
                <TabsList className="mx-2 mt-1 w-fit">
                  {panelStates.cli === "visible" && (
                    <TabsTrigger value="cli" className="gap-1.5 text-xs">
                      <Terminal className="h-3 w-3" />
                      CLI
                    </TabsTrigger>
                  )}
                  {panelStates.sql === "visible" && (
                    <TabsTrigger value="sql" className="gap-1.5 text-xs">
                      <Database className="h-3 w-3" />
                      SQL Workbench
                    </TabsTrigger>
                  )}
                  {panelStates.evidence === "visible" && (
                    <TabsTrigger value="evidence" className="gap-1.5 text-xs">
                      <FileText className="h-3 w-3" />
                      Evidence
                    </TabsTrigger>
                  )}
                </TabsList>

                <div className="flex-1 overflow-hidden">
                  {panelStates.cli === "visible" && (
                    <TabsContent value="cli" className="mt-0 h-full">
                      <CLIPanel blueprint={blueprint} onLog={(e) => addEvidenceLog(e.type, e.title, e.description)} />
                    </TabsContent>
                  )}
                  {panelStates.sql === "visible" && (
                    <TabsContent value="sql" className="mt-0 h-full">
                      <SQLWorkbenchPanel blueprint={blueprint} onLog={(e) => addEvidenceLog(e.type, e.title, e.description)} />
                    </TabsContent>
                  )}
                  {panelStates.evidence === "visible" && (
                    <TabsContent value="evidence" className="mt-0 h-full">
                      <EvidencePanel logs={evidenceLogs} />
                    </TabsContent>
                  )}
                </div>
              </Tabs>
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
};

export default PDEPage;
