import { useParams, Link } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPDEChannel, broadcastMessage, onMessage, type PDEChannelMessage } from "@/lib/pde-channel";
import type { ForgeBlueprint } from "@/lib/forge-types";
import CLIPanel from "@/components/pde/CLIPanel";
import SQLWorkbenchPanel from "@/components/pde/SQLWorkbenchPanel";
import EvidencePanel, { type LogEntry } from "@/components/pde/EvidencePanel";

// Lazy-load canvas dependencies
import { lazy, Suspense } from "react";

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

  // Load initial state from sessionStorage
  useEffect(() => {
    const raw = sessionStorage.getItem("lampforge-blueprint-pde");
    if (raw) {
      try {
        setBlueprint(JSON.parse(raw));
      } catch {}
    }

    const rawLogs = sessionStorage.getItem("lampforge-evidence-logs");
    if (rawLogs) {
      try {
        setLogs(JSON.parse(rawLogs));
      } catch {}
    }
  }, []);

  // BroadcastChannel setup
  useEffect(() => {
    const channel = createPDEChannel();
    channelRef.current = channel;

    const cleanup = onMessage(channel, (msg) => {
      if (msg.type === "blueprint-update") {
        setBlueprint(msg.payload.blueprint);
      }
    });

    // Broadcast panel-closed on unload
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
  }, [panelId]);

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
          <div className="flex h-full items-center justify-center text-muted-foreground">
            Architecture Canvas — undocked view coming soon
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
      {/* Header */}
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

      {/* Panel content */}
      <div className="flex-1 overflow-hidden">
        {renderPanel()}
      </div>
    </div>
  );
};

export default PDEPanelPage;
