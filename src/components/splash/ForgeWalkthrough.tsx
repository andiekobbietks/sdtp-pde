import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Flame, ArrowRight, ArrowLeft, Sparkles, Brain,
  Database, Link, Code2, Globe, Leaf, Shield, Layers
} from "lucide-react";

interface ForgeWalkthroughProps {
  onComplete: () => void;
}

const steps = [
  {
    id: "problem",
    badge: "The Problem",
    badgeIcon: Sparkles,
    badgeColor: "text-forge-oracle",
    title: "Infrastructure Friction Kills Learning",
    body: "Students spend more time wrestling with server configuration, SQL syntax errors, and deployment than learning how systems actually work. The cognitive load of tooling eclipses the pedagogy.",
    visual: (
      <div className="grid grid-cols-3 gap-3 text-center">
        {[
          { label: "Server Setup", time: "~4 hrs", color: "border-forge-forge" },
          { label: "SQL Debugging", time: "~6 hrs", color: "border-forge-blueprint" },
          { label: "Deployment", time: "~3 hrs", color: "border-forge-plumbing" },
        ].map((item) => (
          <div key={item.label} className={`rounded-lg border-2 ${item.color} bg-card p-4`}>
            <p className="text-2xl font-bold text-foreground">{item.time}</p>
            <p className="text-xs text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "taxonomy",
    badge: "The Framework",
    badgeIcon: Layers,
    badgeColor: "text-primary",
    title: "The 5-Family Cognitive Taxonomy",
    body: "Every concept in full-stack engineering maps to one of five colour-coded families. This semantic compression turns an overwhelming landscape into a navigable map — students always know where they are.",
    visual: (
      <div className="space-y-2">
        {[
          { name: "Blueprint", desc: "The What — entities, fields, data types", color: "bg-forge-blueprint" },
          { name: "Plumbing", desc: "How They Connect — relationships, joins", color: "bg-forge-plumbing" },
          { name: "Transaction", desc: "What Happens — CRUD, sessions, logic", color: "bg-forge-transaction" },
          { name: "Forge", desc: "How It's Built — generation, deployment", color: "bg-forge-forge" },
          { name: "Oracle", desc: "The Why — AI reasoning, validation", color: "bg-forge-oracle" },
        ].map((f) => (
          <div key={f.name} className="flex items-center gap-3 rounded-lg bg-card p-3">
            <div className={`h-3 w-3 rounded-full ${f.color} shrink-0`} />
            <div>
              <span className="text-sm font-semibold text-foreground">{f.name}</span>
              <span className="ml-2 text-xs text-muted-foreground">{f.desc}</span>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "how",
    badge: "How It Works",
    badgeIcon: Brain,
    badgeColor: "text-forge-oracle",
    title: "From Natural Language to Running Code",
    body: "You describe a system in plain English. Our AI pipeline classifies your intent, generates a validated data blueprint, then compiles it into SQL, PHP, and HTML — all inside your browser. No server required.",
    visual: (
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {[
          { icon: Sparkles, label: "Intent", color: "text-forge-oracle" },
          { icon: Database, label: "Blueprint", color: "text-forge-blueprint" },
          { icon: Link, label: "Relations", color: "text-forge-plumbing" },
          { icon: Code2, label: "Code", color: "text-forge-forge" },
        ].map((s, i) => (
          <div key={s.label} className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1 rounded-lg bg-card p-3 px-4">
              <s.icon className={`h-5 w-5 ${s.color}`} />
              <span className="text-xs font-medium text-foreground">{s.label}</span>
            </div>
            {i < 3 && <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />}
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "w3c",
    badge: "Standards-First",
    badgeIcon: Globe,
    badgeColor: "text-forge-blueprint",
    title: "Built on W3C Open Standards",
    body: "LAMPForge doesn't invent proprietary runtimes. It rides WebAssembly for in-browser SQL execution, BroadcastChannel for zero-infrastructure panel communication, and Cross-Origin Isolation for secure multi-threaded compute. Every capability maps to a published specification.",
    visual: (
      <div className="grid grid-cols-2 gap-3">
        {[
          { std: "WebAssembly", use: "sql.js runs SQLite in-browser", icon: Database },
          { std: "BroadcastChannel", use: "Panel undocking without servers", icon: Link },
          { std: "COOP / COEP", use: "SharedArrayBuffer for WASM", icon: Shield },
          { std: "postMessage", use: "IDE ↔ App bridge protocol", icon: Code2 },
        ].map((s) => (
          <div key={s.std} className="rounded-lg border border-border bg-card p-3">
            <s.icon className="mb-1 h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">{s.std}</p>
            <p className="text-xs text-muted-foreground">{s.use}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "green",
    badge: "Green Computing",
    badgeIcon: Leaf,
    badgeColor: "text-forge-plumbing",
    title: "Edge-First, Carbon-Light",
    body: "By running inference at the edge and SQL in the browser via WASM, LAMPForge eliminates persistent cloud compute. A typical session produces a fraction of the carbon footprint of traditional cloud-hosted development environments.",
    visual: (
      <div className="flex items-center justify-center gap-6">
        <div className="text-center">
          <div className="mb-2 text-3xl font-bold text-forge-forge">~120g</div>
          <p className="text-xs text-muted-foreground">CO₂ per session<br />(cloud IDE)</p>
        </div>
        <ArrowRight className="h-6 w-6 text-muted-foreground" />
        <div className="text-center">
          <div className="mb-2 text-3xl font-bold text-forge-plumbing">~3g</div>
          <p className="text-xs text-muted-foreground">CO₂ per session<br />(LAMPForge)</p>
        </div>
      </div>
    ),
  },
];

const ForgeWalkthrough = ({ onComplete }: ForgeWalkthroughProps) => {
  const [current, setCurrent] = useState(0);
  const step = steps[current];
  const isLast = current === steps.length - 1;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-background p-4">
      {/* Progress dots */}
      <div className="absolute top-6 left-1/2 flex -translate-x-1/2 gap-2">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`h-2 rounded-full transition-all ${
              i === current ? "w-8 bg-primary" : i < current ? "w-2 bg-primary/50" : "w-2 bg-border"
            }`}
          />
        ))}
      </div>

      {/* Skip */}
      <button
        onClick={onComplete}
        className="absolute top-6 right-6 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        Skip walkthrough
      </button>

      {/* Content */}
      <div className="w-full max-w-xl animate-in fade-in slide-in-from-bottom-4 duration-500" key={step.id}>
        <div className="mb-6 flex items-center gap-2">
          <step.badgeIcon className={`h-4 w-4 ${step.badgeColor}`} />
          <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            {step.badge}
          </span>
        </div>

        <h2 className="mb-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {step.title}
        </h2>

        <p className="mb-8 text-base leading-relaxed text-muted-foreground">
          {step.body}
        </p>

        {/* Visual */}
        <div className="mb-10">{step.visual}</div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrent((c) => c - 1)}
            disabled={current === 0}
            className="gap-1"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>

          <Button
            onClick={() => (isLast ? onComplete() : setCurrent((c) => c + 1))}
            className="gap-2"
          >
            {isLast ? (
              <>
                <Flame className="h-4 w-4" /> Start Forging
              </>
            ) : (
              <>
                Next <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ForgeWalkthrough;
