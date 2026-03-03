import { useEffect, useRef, useState } from "react";
import { Flame } from "lucide-react";

interface ForgeIntroAnimationProps {
  onComplete: () => void;
}

const ForgeIntroAnimation = ({ onComplete }: ForgeIntroAnimationProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhaseState] = useState<"warp" | "formula" | "logo" | "reveal">("warp");
  const phaseRef = useRef<"warp" | "formula" | "logo" | "reveal">("warp");
  const [formulaText, setFormulaText] = useState("");
  const typewriterRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const setPhase = (p: typeof phase) => {
    setPhaseState(p);
    phaseRef.current = p;
  };

  // Phase timing
  useEffect(() => {
    const t1 = setTimeout(() => {
      setPhase("formula");
      typewriter("ƒ(intent) → Blueprint → Code");
    }, 2500);
    const t2 = setTimeout(() => setPhase("logo"), 5200);
    const t3 = setTimeout(() => setPhase("reveal"), 6800);
    const t4 = setTimeout(() => onComplete(), 7800);

    return () => {
      [t1, t2, t3, t4].forEach(clearTimeout);
      if (typewriterRef.current) clearInterval(typewriterRef.current);
    };
  }, [onComplete]);

  const typewriter = (text: string) => {
    let i = 0;
    setFormulaText("");
    if (typewriterRef.current) clearInterval(typewriterRef.current);
    typewriterRef.current = setInterval(() => {
      setFormulaText(text.substring(0, i + 1));
      i++;
      if (i > text.length && typewriterRef.current) clearInterval(typewriterRef.current);
    }, 45);
  };

  // Canvas warp engine — 5-family colour particles
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let animId: number;
    let w = window.innerWidth;
    let h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;

    // 5-family taxonomy characters & colours (HSL from design tokens)
    const families = [
      { chars: "CREATE TABLE PRIMARY KEY VARCHAR INT", color: "hsl(210,100%,60%)" },   // blueprint
      { chars: "FOREIGN KEY REFERENCES JOIN ON CASCADE", color: "hsl(142,72%,50%)" },  // plumbing
      { chars: "INSERT SELECT UPDATE DELETE SESSION", color: "hsl(32,95%,60%)" },       // transaction
      { chars: "BUILD DEPLOY GENERATE SCAFFOLD FORGE", color: "hsl(0,72%,55%)" },      // forge
      { chars: "INTENT CLASSIFY VALIDATE SUGGEST AI", color: "hsl(270,70%,65%)" },     // oracle
    ];

    const particles: { x: number; y: number; z: number; char: string; color: string }[] = [];
    for (let i = 0; i < 350; i++) {
      const fam = families[i % families.length];
      const words = fam.chars.split(" ");
      particles.push({
        x: (Math.random() - 0.5) * w * 5,
        y: (Math.random() - 0.5) * h * 5,
        z: Math.random() * 4000,
        char: words[Math.floor(Math.random() * words.length)],
        color: fam.color,
      });
    }

    let last = performance.now();

    const render = (time: number) => {
      const dt = Math.min((time - last) / 16.67, 2);
      last = time;
      const cp = phaseRef.current;

      // Trail
      if (cp === "reveal") {
        ctx.fillStyle = "rgba(255,255,255,0.12)";
      } else {
        ctx.fillStyle = "rgba(12,17,29,0.35)";
      }
      ctx.fillRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;

      for (const p of particles) {
        let speed = 55;
        if (cp === "formula") speed = 4;
        else if (cp === "logo") speed = 85;
        else if (cp === "reveal") speed = 160;

        p.z -= speed * dt;
        if (p.z <= 10) {
          p.z = 4000;
          p.x = (Math.random() - 0.5) * w * 5;
          p.y = (Math.random() - 0.5) * h * 5;
        }

        const k = 300 / p.z;
        const px = p.x * k + cx;
        const py = p.y * k + cy;

        if (px >= -50 && px <= w + 50 && py >= -50 && py <= h + 50) {
          const size = (1 - p.z / 4000) * 18;
          if (size > 1.5) {
            ctx.font = `bold ${size}px "JetBrains Mono"`;
            ctx.fillStyle = p.color;
            ctx.globalAlpha = 1 - p.z / 4000;
            ctx.fillText(p.char, px, py);
            ctx.globalAlpha = 1;
          }
        }
      }
      animId = requestAnimationFrame(render);
    };

    render(performance.now());

    const onResize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-background">
      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* Phase 2: Formula typewriter */}
      <div
        className={`absolute inset-0 flex items-center justify-center transition-opacity duration-700 ${
          phase === "formula" ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="text-center">
          <p className="mb-2 text-xs font-mono uppercase tracking-widest text-muted-foreground">
            Cognitive Pipeline
          </p>
          <p className="font-mono text-2xl sm:text-4xl font-bold text-primary">
            {formulaText}
            <span className="animate-type-cursor text-forge-transaction">_</span>
          </p>
        </div>
      </div>

      {/* Phase 3: Logo reveal */}
      <div
        className={`absolute inset-0 flex items-center justify-center transition-opacity duration-500 ${
          phase === "logo" ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="relative flex items-center justify-center">
          {/* Spinning rings in 5-family colours */}
          <div className="absolute h-40 w-40 animate-spin rounded-full border-2 border-dashed border-forge-blueprint" style={{ animationDuration: "3s" }} />
          <div className="absolute h-32 w-32 animate-spin rounded-full border-2 border-dashed border-forge-plumbing" style={{ animationDuration: "2.5s", animationDirection: "reverse" }} />
          <div className="absolute h-24 w-24 animate-spin rounded-full border-2 border-dashed border-forge-oracle" style={{ animationDuration: "2s" }} />
          <div className="absolute h-16 w-16 animate-spin rounded-full border-2 border-dashed border-forge-transaction" style={{ animationDuration: "1.5s", animationDirection: "reverse" }} />

          {/* Core icon */}
          <div className="relative flex h-14 w-14 items-center justify-center rounded-xl bg-primary/20">
            <Flame className="h-8 w-8 text-forge-transaction" />
          </div>
        </div>

        <p className="absolute bottom-1/3 text-center">
          <span className="text-2xl font-bold tracking-tight">
            LAMP<span className="text-primary">Forge</span>
          </span>
        </p>
      </div>

      {/* Phase 4: Flash reveal */}
      <div
        className={`absolute inset-0 bg-background transition-opacity duration-700 ${
          phase === "reveal" ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />
    </div>
  );
};

export default ForgeIntroAnimation;
