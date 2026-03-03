import { useState, useEffect } from "react";
import { Flame, Database, Code2, Brain, Link, Shield } from "lucide-react";

interface ForgeHUDLoadingProps {
  status: string;
}

const PIPELINE_LOGS = [
  "Initializing Arch-Router classification...",
  "Parsing intent vector space...",
  "Routing to inference tier...",
  "Constructing entity graph...",
  "Resolving foreign key topology...",
  "Validating blueprint against Zod schema...",
  "Generating SQL DDL statements...",
  "Compiling PHP CRUD scaffolds...",
  "Mapping Bootstrap 5 design tokens...",
  "Cross-referencing normalisation form...",
  "Assembling HTML form templates...",
  "Finalizing build artefacts...",
];

const ForgeHUDLoading = ({ status }: ForgeHUDLoadingProps) => {
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    setLogs([`> forge_pipeline.init()`]);
    const interval = setInterval(() => {
      setLogs((prev) => {
        const ts = new Date().toISOString().split("T")[1].split(".")[0];
        const next = PIPELINE_LOGS[Math.floor(Math.random() * PIPELINE_LOGS.length)];
        const updated = [...prev, `[${ts}] ${next}`];
        return updated.length > 6 ? updated.slice(-6) : updated;
      });
    }, 700);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="flex w-full max-w-md flex-col items-center gap-6 px-4">
        {/* Spinning HUD rings */}
        <div className="relative flex h-36 w-36 items-center justify-center">
          {/* Outer rings — 5-family colours */}
          <div
            className="absolute h-36 w-36 animate-spin rounded-full border-2 border-dashed border-forge-blueprint"
            style={{ animationDuration: "4s" }}
          />
          <div
            className="absolute h-28 w-28 animate-spin rounded-full border-2 border-dashed border-forge-plumbing"
            style={{ animationDuration: "3s", animationDirection: "reverse" }}
          />
          <div
            className="absolute h-20 w-20 animate-spin rounded-full border-2 border-dashed border-forge-transaction"
            style={{ animationDuration: "2.5s" }}
          />
          <div
            className="absolute h-14 w-14 animate-spin rounded-full border-2 border-dashed border-forge-oracle"
            style={{ animationDuration: "2s", animationDirection: "reverse" }}
          />

          {/* Core pulse */}
          <div className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20 animate-forge-pulse">
            <Flame className="h-6 w-6 text-forge-transaction" />
          </div>

          {/* Orbiting particles */}
          <div className="absolute h-36 w-36 animate-spin" style={{ animationDuration: "6s" }}>
            <div className="absolute left-0 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-forge-blueprint" />
          </div>
          <div className="absolute h-28 w-28 animate-spin" style={{ animationDuration: "4s", animationDirection: "reverse" }}>
            <div className="absolute right-0 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-forge-oracle" />
          </div>
        </div>

        {/* Status text */}
        <p className="text-center font-mono text-sm font-medium uppercase tracking-widest text-primary animate-pulse">
          {status || "FORGING_BLUEPRINT"}
        </p>

        {/* Pipeline stage icons */}
        <div className="flex items-center gap-3">
          {[
            { icon: Brain, color: "text-forge-oracle", label: "Classify" },
            { icon: Database, color: "text-forge-blueprint", label: "Model" },
            { icon: Link, color: "text-forge-plumbing", label: "Relate" },
            { icon: Code2, color: "text-forge-forge", label: "Generate" },
            { icon: Shield, color: "text-forge-transaction", label: "Validate" },
          ].map((s, i) => (
            <div key={s.label} className="flex flex-col items-center gap-1">
              <s.icon className={`h-4 w-4 ${s.color}`} />
              <span className="text-[10px] text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Terminal window */}
        <div className="w-full overflow-hidden rounded-lg border border-border bg-terminal-bg">
          {/* Window chrome */}
          <div className="flex items-center gap-2 border-b border-border px-3 py-1.5">
            <div className="flex gap-1.5">
              <div className="h-2 w-2 rounded-full bg-forge-forge" />
              <div className="h-2 w-2 rounded-full bg-forge-transaction" />
              <div className="h-2 w-2 rounded-full bg-forge-plumbing" />
            </div>
            <span className="text-[10px] font-mono text-muted-foreground">forge_pipeline</span>
          </div>

          {/* Log output */}
          <div className="p-3 font-mono text-xs leading-relaxed">
            {logs.map((log, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-forge-plumbing select-none">{">"}</span>
                <span className="text-terminal-fg/80">{log}</span>
              </div>
            ))}
            <div className="mt-1 flex items-center gap-1">
              <span className="animate-type-cursor text-terminal-cursor">▌</span>
              <span className="text-muted-foreground">Working...</span>
            </div>
          </div>

          {/* Scanline overlay */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)",
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default ForgeHUDLoading;
