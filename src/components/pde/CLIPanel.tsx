import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ForgeBlueprint } from "@/lib/forge-types";
import { generateDDL } from "@/lib/sql-generator";

// ── Types ──────────────────────────────────────────────────────

interface CLIContext {
  blueprint: ForgeBlueprint | null;
  addLog: (entry: { type: string; title: string; description: string }) => void;
}

type CommandHandler = (args: string[], ctx: CLIContext) => string[];

interface CLIPanelProps {
  blueprint: ForgeBlueprint | null;
  onForgeIntent?: (intent: string) => void;
  onExport?: () => void;
  onLog?: (entry: { type: string; title: string; description: string }) => void;
}

// ── ASCII Animation Frames ─────────────────────────────────────

interface AnimationFrame {
  content: string;
  duration: number;
}

const BANNER_FRAMES: AnimationFrame[] = [
  { duration: 100, content: `┌┐\n││\n└┘` },
  { duration: 80, content: `┌────┐\n│    │\n│    │\n└────┘` },
  { duration: 80, content: `┌──────────┐\n│          │\n│  LAMP    │\n│          │\n└──────────┘` },
  { duration: 80, content: `┌──────────────────┐\n│                  │\n│  LAMP  FORGE     │\n│                  │\n└──────────────────┘` },
  { duration: 80, content: `╔══════════════════════╗\n║                      ║\n║   LAMP  ╔═╗  FORGE   ║\n║         ╚═╝          ║\n╚══════════════════════╝` },
  { duration: 80, content: `╔════════════════════════════╗\n║                            ║\n║   ██╗      █████╗ ███╗     ║\n║   ██║     ██╔══██╗████║    ║\n║   ██║     ███████║██╔██║   ║\n║   ██║     ██╔══██║██║╚██║  ║\n║   ███████╗██║  ██║██║ ╚██║ ║\n║   ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝║\n║                            ║\n║   LAMP ⚡ FORGE  v1.0.0    ║\n║   Pedagogical Dev Env      ║\n║                            ║\n╚════════════════════════════╝` },
];

const STATIC_BANNER = BANNER_FRAMES[BANNER_FRAMES.length - 1].content;

// ── Color Roles (semantic mapping to forge design tokens) ──────

type ColorRole = "border" | "title" | "accent" | "version" | "subtitle";

const COLOR_CLASSES: Record<ColorRole, string> = {
  border: "text-forge-blueprint",
  title: "text-forge-transaction",
  accent: "text-forge-forge",
  version: "text-forge-plumbing",
  subtitle: "text-forge-oracle",
};

function colorizeBanner(content: string): { text: string; className: string }[] {
  return content.split("\n").map((line) => {
    if (line.includes("╔") || line.includes("╚") || line.includes("║") || line.includes("┌") || line.includes("└") || line.includes("│")) {
      if (line.includes("FORGE") || line.includes("LAMP")) {
        return { text: line, className: COLOR_CLASSES.title };
      }
      if (line.includes("v1.0.0")) {
        return { text: line, className: COLOR_CLASSES.version };
      }
      if (line.includes("Pedagogical") || line.includes("Dev")) {
        return { text: line, className: COLOR_CLASSES.subtitle };
      }
      return { text: line, className: COLOR_CLASSES.border };
    }
    if (line.includes("██")) {
      return { text: line, className: COLOR_CLASSES.accent };
    }
    return { text: line, className: "text-terminal-fg" };
  });
}

// ── Command Registry ──────────────────────────────────────────

function createCommandRegistry(
  setOutput: React.Dispatch<React.SetStateAction<string[]>>,
  commandHistoryRef: React.MutableRefObject<string[]>
) {
  const registry = new Map<string, CommandHandler>();

  registry.set("help", () => [
    "",
    "╔══════════════════════════════════════════════════════════╗",
    "║              LAMPForge PDE — Help System                ║",
    "╚══════════════════════════════════════════════════════════╝",
    "",
    "  The 5-Family Architectural Taxonomy:",
    "  ─────────────────────────────────────",
    "  🔵 Blueprint   — Data modeling (entities, fields, relationships)",
    "  🟢 Plumbing     — Connectivity (state, APIs, db connections)",
    "  🟠 Transaction  — Logic (CRUD operations, sessions, validation)",
    "  🔴 Forge        — Provisioning (servers, databases, containers)",
    "  🟣 Oracle       — Validation & Theory of Mind feedback",
    "",
    "  Available Commands:",
    "  ─────────────────────────────────────",
    "  help                 Show this help message",
    "  clear                Clear the terminal",
    "  schema               Display the current DDL schema",
    "  tables               List all entities in the blueprint",
    "  describe <table>     Show fields and constraints for a table",
    "  forge <intent>       Trigger a new forge cycle from CLI",
    "  level [scaffold]     Show or change current scaffold level",
    "  export               Export evidence log",
    "  history              Show command history",
    "",
    "  Keyboard Shortcuts:",
    "  ─────────────────────────────────────",
    "  Enter                Execute command",
    "  Up/Down Arrow        Navigate command history",
    "",
    "  How the PDE Works:",
    "  ─────────────────────────────────────",
    "  1. Declare intent in natural language on the Landing Page",
    "  2. LAMPForge translates intent → architectural blueprint",
    "  3. Blueprint populates the Architecture Canvas (React Flow)",
    "  4. DDL and CRUD code are generated into the WebContainer",
    "  5. Use the SQL Workbench to execute queries against SQLite",
    "  6. Evidence Log captures your SDLC journey automatically",
    "  7. Panels can be collapsed or undocked to separate tabs",
    "",
    "  Admin: New commands can be registered via registerCommand()",
    "",
  ]);

  registry.set("clear", () => {
    setOutput(["lampforge> "]);
    return [];
  });

  registry.set("schema", (_args, ctx) => {
    if (!ctx.blueprint) return ["  No blueprint loaded. Forge a project first.", ""];
    const ddl = generateDDL(ctx.blueprint);
    return ["", "-- Current Schema DDL:", ...ddl.split("\n"), ""];
  });

  registry.set("tables", (_args, ctx) => {
    if (!ctx.blueprint) return ["  No blueprint loaded.", ""];
    const lines = ["", "  Tables in blueprint:", "  ───────────────────"];
    ctx.blueprint.entities.forEach((e) => {
      lines.push(`  • ${e.name} (${e.fields.length} fields)`);
    });
    lines.push("");
    return lines;
  });

  registry.set("describe", (args, ctx) => {
    if (!ctx.blueprint) return ["  No blueprint loaded.", ""];
    const tableName = args[0];
    if (!tableName) return ["  Usage: describe <table_name>", ""];
    const entity = ctx.blueprint.entities.find((e) => e.name === tableName);
    if (!entity) return [`  Table '${tableName}' not found.`, ""];
    const lines = [
      "",
      `  Table: ${entity.name}`,
      "  ┌──────────────────┬────────────────┬─────────────────┐",
      "  │ Field            │ Type           │ Constraint      │",
      "  ├──────────────────┼────────────────┼─────────────────┤",
    ];
    entity.fields.forEach((f) => {
      const name = f.name.padEnd(16);
      const type = f.type.padEnd(14);
      const cons = (f.constraint || "").padEnd(15);
      lines.push(`  │ ${name} │ ${type} │ ${cons} │`);
    });
    lines.push("  └──────────────────┴────────────────┴─────────────────┘");
    lines.push("");
    return lines;
  });

  registry.set("forge", (args, ctx) => {
    const intent = args.join(" ");
    if (!intent) return ["  Usage: forge <intent description>", ""];
    return [`  ⚡ Forge request queued: "${intent}"`, "  (Navigate to Landing Page to forge)", ""];
  });

  registry.set("level", (args, ctx) => {
    if (!ctx.blueprint) return ["  No blueprint loaded.", ""];
    if (args.length === 0) {
      return [`  Current scaffold level: ${ctx.blueprint.scaffold_level}`, ""];
    }
    return [`  Scaffold level display: ${ctx.blueprint.scaffold_level}`, "  (Change level on the Landing Page before forging)", ""];
  });

  registry.set("export", (_args, ctx) => {
    ctx.addLog({ type: "milestone", title: "Export Requested", description: "Evidence export triggered from CLI" });
    return ["  📦 Evidence export triggered.", ""];
  });

  registry.set("history", () => {
    const hist = commandHistoryRef.current;
    if (hist.length === 0) return ["  No command history.", ""];
    const lines = ["", "  Command History:", "  ────────────────"];
    hist.forEach((cmd, i) => {
      lines.push(`  ${i + 1}. ${cmd}`);
    });
    lines.push("");
    return lines;
  });

  return registry;
}

// ── CLIPanel Component ────────────────────────────────────────

const CLIPanel = ({ blueprint, onForgeIntent, onExport, onLog }: CLIPanelProps) => {
  const [output, setOutput] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [animationDone, setAnimationDone] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const commandHistory = useRef<string[]>([]);
  const hasAnimated = useRef(false);

  const addLog = useCallback(
    (entry: { type: string; title: string; description: string }) => {
      onLog?.(entry);
    },
    [onLog]
  );

  const ctx: CLIContext = useMemo(
    () => ({ blueprint, addLog }),
    [blueprint, addLog]
  );

  const registry = useMemo(
    () => createCommandRegistry(setOutput, commandHistory),
    []
  );

  // Register a new command (admin-extensible)
  const registerCommand = useCallback(
    (name: string, handler: CommandHandler) => {
      registry.set(name, handler);
    },
    [registry]
  );

  // ── ASCII Animation on mount ──────────────────────────────────

  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;

    // Respect prefers-reduced-motion
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) {
      const bannerLines = colorizeBanner(STATIC_BANNER);
      setOutput([
        ...bannerLines.map((l) => l.text),
        "",
        "Type 'help' for available commands.",
        "",
        "lampforge> ",
      ]);
      setAnimationDone(true);
      return;
    }

    let frameIndex = 0;
    let timeout: ReturnType<typeof setTimeout>;

    const showFrame = () => {
      if (frameIndex >= BANNER_FRAMES.length) {
        setOutput((prev) => [
          ...prev.slice(0, -BANNER_FRAMES[frameIndex - 1].content.split("\n").length),
          ...STATIC_BANNER.split("\n"),
          "",
          "Type 'help' for available commands.",
          "",
          "lampforge> ",
        ]);
        setAnimationDone(true);
        return;
      }

      const frame = BANNER_FRAMES[frameIndex];
      const lines = frame.content.split("\n");

      if (frameIndex === 0) {
        setOutput(lines);
      } else {
        const prevLines = BANNER_FRAMES[frameIndex - 1].content.split("\n").length;
        setOutput((prev) => {
          const base = prev.slice(0, Math.max(0, prev.length - prevLines));
          return [...base, ...lines];
        });
      }

      frameIndex++;
      timeout = setTimeout(showFrame, frame.duration);
    };

    showFrame();
    return () => clearTimeout(timeout);
  }, []);

  // ── Auto-scroll ───────────────────────────────────────────────

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [output]);

  // ── Command execution ─────────────────────────────────────────

  const executeCommand = useCallback(
    (cmd: string) => {
      const parts = cmd.trim().split(/\s+/);
      const command = parts[0]?.toLowerCase();
      const args = parts.slice(1);

      commandHistory.current.push(cmd);
      setHistoryIndex(-1);

      const handler = registry.get(command || "");
      if (handler) {
        const result = handler(args, ctx);
        if (result.length > 0) {
          setOutput((prev) => [...prev, `lampforge> ${cmd}`, ...result, "lampforge> "]);
        }
      } else {
        setOutput((prev) => [
          ...prev,
          `lampforge> ${cmd}`,
          `  Unknown command: '${command}'. Type 'help' for available commands.`,
          "",
          "lampforge> ",
        ]);
      }

      addLog({ type: "code", title: `CLI: ${cmd}`, description: `Command executed: ${cmd}` });
    },
    [ctx, registry, addLog]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && input.trim()) {
      executeCommand(input.trim());
      setInput("");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const hist = commandHistory.current;
      if (hist.length > 0) {
        const newIdx = historyIndex === -1 ? hist.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIdx);
        setInput(hist[newIdx]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const hist = commandHistory.current;
      if (historyIndex >= 0) {
        const newIdx = historyIndex + 1;
        if (newIdx >= hist.length) {
          setHistoryIndex(-1);
          setInput("");
        } else {
          setHistoryIndex(newIdx);
          setInput(hist[newIdx]);
        }
      }
    }
  };

  return (
    <div className="flex h-full flex-col bg-terminal-bg">
      {/* Terminal header */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-1.5">
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-forge-forge" />
          <div className="h-2.5 w-2.5 rounded-full bg-forge-transaction" />
          <div className="h-2.5 w-2.5 rounded-full bg-forge-plumbing" />
        </div>
        <span className="text-xs font-mono text-muted-foreground">LAMPForge CLI v1.0.0</span>
      </div>

      {/* Output */}
      <div ref={scrollRef} className="flex-1 overflow-auto p-4 font-mono text-sm">
        {output.map((line, i) => {
          // Colorize banner lines
          if (!animationDone && (line.includes("╔") || line.includes("║") || line.includes("╚") || line.includes("██"))) {
            const colored = colorizeBanner(line);
            return (
              <div key={i} className="leading-relaxed whitespace-pre">
                <span className={colored[0]?.className || "text-terminal-fg"}>{line}</span>
              </div>
            );
          }

          return (
            <div key={i} className="leading-relaxed whitespace-pre">
              {line.startsWith("--") || line.startsWith("  --") ? (
                <span className="text-forge-plumbing">{line}</span>
              ) : line.startsWith("lampforge>") ? (
                <span className="text-terminal-fg">{line}</span>
              ) : line.startsWith("ALTER") || line.startsWith("CREATE") || line.startsWith("SELECT") ? (
                <span className="text-forge-blueprint">{line}</span>
              ) : line.includes("╔") || line.includes("║") || line.includes("╚") || line.includes("┌") || line.includes("└") || line.includes("│") || line.includes("├") || line.includes("───") ? (
                <span className="text-forge-blueprint">{line}</span>
              ) : line.includes("🔵") ? (
                <span className="text-forge-blueprint">{line}</span>
              ) : line.includes("🟢") ? (
                <span className="text-forge-plumbing">{line}</span>
              ) : line.includes("🟠") ? (
                <span className="text-forge-transaction">{line}</span>
              ) : line.includes("🔴") ? (
                <span className="text-forge-forge">{line}</span>
              ) : line.includes("🟣") ? (
                <span className="text-forge-oracle">{line}</span>
              ) : line.includes("██") ? (
                <span className="text-forge-forge">{line}</span>
              ) : line.includes("⚡") ? (
                <span className="text-forge-transaction">{line}</span>
              ) : line.includes("📦") ? (
                <span className="text-forge-plumbing">{line}</span>
              ) : (
                <span className="text-terminal-fg/80">{line}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div className="flex items-center border-t border-border px-4 py-2">
        <span className="mr-2 font-mono text-sm text-forge-plumbing">lampforge&gt;</span>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type 'help' for available commands..."
          className="flex-1 bg-transparent font-mono text-sm text-terminal-fg outline-none placeholder:text-muted-foreground"
        />
        <span className="animate-type-cursor font-mono text-terminal-cursor">▌</span>
      </div>
    </div>
  );
};

export default CLIPanel;
