import { useParams, Link } from "react-router-dom";
import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { createPDEChannel, broadcastMessage, onMessage, type PDEChannelMessage } from "@/lib/pde-channel";
import type { ForgeBlueprint } from "@/lib/forge-types";
import EntityNode from "@/components/canvas/EntityNode";
import TransactionNode from "@/components/canvas/TransactionNode";
import ForgeStatusNode from "@/components/canvas/ForgeStatusNode";
import OracleNode from "@/components/canvas/OracleNode";
import CLIPanel from "@/components/pde/CLIPanel";
import SQLWorkbenchPanel from "@/components/pde/SQLWorkbenchPanel";
import EvidencePanel, { type LogEntry } from "@/components/pde/EvidencePanel";

const PANEL_LABELS: Record<string, string> = {
  canvas: "Architecture Canvas",
  sql: "SQL Workbench",
  cli: "LAMPForge CLI",
  evidence: "Evidence Log",
};

const PDEPanelPage = () => {
  const { panelId } = useParams<{ panelId: string }>();
  const [blueprint, setBlueprint] = useState<ForgeBlueprint | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Canvas state (for undocked canvas)
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const nodeTypes = useMemo(
    () => ({ entity: EntityNode, transaction: TransactionNode, forgeStatus: ForgeStatusNode, oracle: OracleNode }),
    []
  );

  // Load initial state from sessionStorage
  useEffect(() => {
    const raw = sessionStorage.getItem("lampforge-blueprint-pde");
    if (raw) {
      try {
        const bp = JSON.parse(raw) as ForgeBlueprint;
        setBlueprint(bp);
        if (panelId === "canvas") {
          populateCanvasFromBlueprint(bp);
        }
      } catch {}
    }

    const rawLogs = sessionStorage.getItem("lampforge-evidence-logs");
    if (rawLogs) {
      try {
        setLogs(JSON.parse(rawLogs));
      } catch {}
    }
  }, [panelId]);

  // Populate canvas nodes/edges from blueprint
  const populateCanvasFromBlueprint = useCallback((bp: ForgeBlueprint) => {
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

    setNodes(newNodes);
    setEdges(newEdges);
  }, [setNodes, setEdges]);

  // BroadcastChannel setup
  useEffect(() => {
    const channel = createPDEChannel();
    channelRef.current = channel;

    const cleanup = onMessage(channel, (msg) => {
      if (msg.type === "blueprint-update") {
        const bp = msg.payload.blueprint;
        setBlueprint(bp);
        if (panelId === "canvas") {
          populateCanvasFromBlueprint(bp);
        }
      }
    });

    const handleUnload = () => {
      if (channel && panelId) {
        broadcastMessage(channel, { type: "panel-closed", payload: { panelId } });
      }
    };
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      cleanup();
      window.removeEventListener("beforeunload", handleUnload);
      channel?.close();
    };
  }, [panelId, populateCanvasFromBlueprint]);

  const label = PANEL_LABELS[panelId || ""] || "Panel";

  const addLog = (entry: { type: string; title: string; description: string }) => {
    const newLog: LogEntry = {
      id: Date.now().toString(),
      ...entry,
      timestamp: new Date().toISOString(),
      stage: "Implementation",
    } as LogEntry;
    setLogs((prev) => [newLog, ...prev]);
  };

  // Canvas interactions
  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge({ ...params, animated: true, style: { stroke: "hsl(142, 72%, 50%)" } }, eds)
      );
    },
    [setEdges]
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

  const renderPanel = () => {
    switch (panelId) {
      case "cli":
        return <CLIPanel blueprint={blueprint} onLog={addLog} />;
      case "sql":
        return <SQLWorkbenchPanel blueprint={blueprint} onLog={addLog} />;
      case "evidence":
        return <EvidencePanel logs={logs} />;
      case "canvas":
        return (
          <div className="h-full w-full">
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
        );
      default:
        return (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            Unknown panel: {panelId}
          </div>
        );
    }
  };

  return (
    <div className="dark flex h-screen flex-col bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-sm">{label}</span>
          <span className="text-xs text-muted-foreground">(undocked)</span>
        </div>
        <Button variant="ghost" size="sm" asChild className="gap-1.5 text-xs">
          <Link to="/pde">
            <ArrowLeft className="h-3 w-3" />
            Return to PDE
          </Link>
        </Button>
      </header>

      <div className="flex-1 overflow-hidden">
        {renderPanel()}
      </div>
    </div>
  );
};

export default PDEPanelPage;
