import { type NodeProps } from "@xyflow/react";
import { Server, CheckCircle2, Cpu, Leaf, Radio, Zap } from "lucide-react";

interface ForgeStatusData {
  label?: string;
  provider?: string;
  route?: string;
  scaffoldLevel?: string;
  targetStack?: string;
  localModels?: { id: string; name: string; provider: string }[];
  [key: string]: unknown;
}

const ForgeStatusNode = ({ data, selected }: NodeProps) => {
  const d = data as ForgeStatusData;
  const isLocal = d.provider === "foundry-local";
  const modelCount = d.localModels?.length || 0;

  return (
    <div
      className={`min-w-[240px] rounded-md border-2 bg-card shadow-lg transition-colors ${
        selected ? "border-forge-forge shadow-forge-forge/20" : "border-forge-forge/40"
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 rounded-t-sm bg-forge-forge/10 px-3 py-2">
        <span className="text-xs font-bold text-forge-forge">🔴 FORGE</span>
        {d.targetStack && d.targetStack !== "lamp" && (
          <span className="ml-auto rounded bg-forge-oracle/20 px-1.5 py-0.5 text-[10px] font-mono text-forge-oracle">
            {d.targetStack.toUpperCase()}
          </span>
        )}
      </div>

      {/* Provider + Route */}
      <div className="flex items-center gap-3 border-b border-border px-3 py-2.5">
        <Server className="h-5 w-5 text-forge-forge" />
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">
            {d.provider === "foundry-local" ? "Local Inference" : d.provider === "cloud" ? "Cloud Inference" : "Server Status"}
          </p>
          <div className="flex items-center gap-1 text-xs text-forge-plumbing">
            <CheckCircle2 className="h-3 w-3" />
            {d.route || "Provisioned"}
          </div>
        </div>
      </div>

      {/* Energy & Model Info */}
      <div className="space-y-1.5 px-3 py-2.5">
        {/* Scaffold level */}
        {d.scaffoldLevel && (
          <div className="flex items-center gap-2 text-xs">
            <Zap className="h-3 w-3 text-forge-transaction" />
            <span className="text-muted-foreground">Rigor:</span>
            <span className="font-mono text-foreground">{d.scaffoldLevel}</span>
          </div>
        )}

        {/* Green computing indicator */}
        <div className="flex items-center gap-2 text-xs">
          <Leaf className={`h-3 w-3 ${isLocal ? "text-forge-plumbing" : "text-muted-foreground"}`} />
          <span className="text-muted-foreground">Carbon:</span>
          <span className={`font-mono ${isLocal ? "text-forge-plumbing" : "text-foreground"}`}>
            {isLocal ? "0g CO₂ (local)" : "~0.2g CO₂ (edge)"}
          </span>
        </div>

        {/* Local models discovered */}
        {modelCount > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <Cpu className="h-3 w-3 text-forge-blueprint" />
            <span className="text-muted-foreground">Models:</span>
            <span className="font-mono text-foreground">{modelCount} local</span>
          </div>
        )}

        {/* Model list (compact) */}
        {d.localModels && d.localModels.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {d.localModels.slice(0, 4).map((m) => (
              <span
                key={m.id}
                className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground"
              >
                {m.name.length > 20 ? m.name.slice(0, 18) + "…" : m.name}
              </span>
            ))}
            {d.localModels.length > 4 && (
              <span className="text-[10px] text-muted-foreground">+{d.localModels.length - 4} more</span>
            )}
          </div>
        )}

        {/* Legacy label fallback */}
        {d.label && !d.provider && (
          <div className="flex items-center gap-2 text-xs">
            <Radio className="h-3 w-3 text-forge-forge" />
            <span className="font-mono text-muted-foreground">{String(d.label)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgeStatusNode;
