import { supabase } from "@/integrations/supabase/client";
import {
  type ForgeBlueprint,
  type ScaffoldLevel,
  type TargetStack,
  validateBlueprint,
  getBlueprintToolSchema,
  STACK_MIGRATION_GUIDES,
} from "./forge-types";

// ── Route policies for Arch-Router-1.5B ──────────────────────────

const ROUTE_POLICIES = [
  {
    name: "schema_generation",
    description:
      "Complex database schema design with multiple entities, relationships, normalization, and transactional CRUD operations.",
    model_hint: "phi-4-mini",
  },
  {
    name: "simple_crud",
    description:
      "Basic single-entity CRUD application with simple forms and list views.",
    model_hint: "qwen2.5-0.5b-instruct",
  },
  {
    name: "ecommerce",
    description:
      "E-commerce or transactional website with products, shopping cart, user accounts, and order processing.",
    model_hint: "phi-4-mini",
  },
];

// ── Endpoints ────────────────────────────────────────────────────

const LOCAL_ENDPOINTS = [
  "http://localhost:5273/v1/chat/completions", // Foundry Local primary
  "http://localhost:5272/v1/chat/completions", // Foundry Local alternate
];

const OLLAMA_ENDPOINT = "http://localhost:11434/v1/chat/completions";

// ── Model Discovery ─────────────────────────────────────────────

export interface FoundryModelInfo {
  id: string;
  name: string;
  provider: string;
}

export async function discoverLocalModels(): Promise<FoundryModelInfo[]> {
  const models: FoundryModelInfo[] = [];

  // Probe Foundry Local
  for (const base of ["http://localhost:5273", "http://localhost:5272"]) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${base}/v1/models`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        const list = data.data || data.models || [];
        for (const m of list) {
          models.push({
            id: m.id || m.name,
            name: m.id || m.name,
            provider: "foundry-local",
          });
        }
      }
    } catch {
      // Not available
    }
  }

  // Probe Ollama
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch("http://localhost:11434/api/tags", {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      for (const m of data.models || []) {
        models.push({
          id: m.name,
          name: m.name,
          provider: "ollama",
        });
      }
    }
  } catch {
    // Not available
  }

  return models;
}

// ── System prompts ───────────────────────────────────────────────

function getSystemPrompt(scaffoldLevel: ScaffoldLevel, routeContext?: string): string {
  const routeLine = routeContext
    ? `\nThe routing model classified this intent as "${routeContext}". Optimize your schema accordingly.`
    : "";

  const levelInstructions: Record<ScaffoldLevel, string> = {
    exploratory: `You are a database schema designer for a WJEC/Eduqas student targeting Grade E/D.
Produce FLAT 1NF tables only. Simple column types (INT, VARCHAR, TEXT, DATE). 
NO foreign keys, NO constraints beyond PRIMARY KEY. NO indexes. NO audit columns.
Each entity is a standalone table with an auto-increment id.`,

    competent: `You are a database schema designer for a WJEC/Eduqas student targeting Grade C/B.
Produce 2NF-normalized tables with PRIMARY KEYs and basic FOREIGN KEYs.
Use NOT NULL on key fields. Basic data types. No composite indexes.
No audit columns (created_at/updated_at). Simple relationships.`,

    exemplary: `You are a database schema designer for a WJEC/Eduqas student targeting Grade A/A*.
Produce fully normalized 3NF schemas. Include:
- AUTO_INCREMENT primary keys
- FOREIGN KEY constraints with ON DELETE CASCADE
- Composite indexes on frequently queried columns
- created_at and updated_at audit columns (DATETIME DEFAULT CURRENT_TIMESTAMP)
- Junction tables for M:M relationships with timestamps
- NOT NULL, UNIQUE, CHECK constraints where appropriate`,

    rad: `You are an expert database architect in RAD 2.0 (Rapid Architectural Development) mode.
Produce the most robust, production-grade normalized schema possible. No grade ceiling. Include EVERY best practice:
- Full 3NF+ normalization
- AUTO_INCREMENT primary keys
- FOREIGN KEY constraints with ON DELETE CASCADE / ON UPDATE CASCADE
- Composite indexes, UNIQUE constraints, CHECK constraints
- created_at, updated_at, and deleted_at (for soft deletes) audit columns
- Junction tables for M:M with timestamps
- Full CRUD with pagination and search considerations
- Input validation requirements
- Session and CSRF token considerations
If the user mentions a non-LAMP stack, still produce the LAMP reference architecture but add rad_migration_notes explaining how to translate to their target stack.`,
  };

  return `${levelInstructions[scaffoldLevel]}${routeLine}

CRITICAL: You must call the generate_blueprint tool with a complete ForgeBlueprint JSON. 
The scaffold_level must be "${scaffoldLevel}".
Entity and field names MUST be snake_case (lowercase letters, numbers, underscores only, starting with a letter).
Every entity MUST have at least one field.
Every entity MUST have an "id" field as PRIMARY KEY.`;
}

// ── Stage 1: Arch-Router (optional) ─────────────────────────────

export type ForgeProgress = (status: string) => void;

async function tryArchRouter(
  intent: string,
  onProgress?: ForgeProgress
): Promise<string | null> {
  onProgress?.("Routing intent via Arch-Router...");

  const routeDescriptions = ROUTE_POLICIES.map(
    (p) => `- "${p.name}": ${p.description}`
  ).join("\n");

  const userMessage = `Given the following route policies:\n${routeDescriptions}\n\nClassify this user intent into the best matching route. Return JSON with a single "route" key.\n\nUser intent: "${intent}"`;

  const payload = {
    model: "arch-router-1.5b",
    messages: [
      {
        role: "system",
        content: "You are a helpful assistant designed to find the best suited route. Respond with a JSON object containing a single 'route' key matching one of the provided route policy names.",
      },
      { role: "user", content: userMessage },
    ],
    temperature: 0,
    max_tokens: 50,
  };

  const endpoints = [OLLAMA_ENDPOINT, ...LOCAL_ENDPOINTS];

  for (const endpoint of endpoints) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) continue;

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";

      try {
        const parsed = JSON.parse(content);
        if (parsed.route && ROUTE_POLICIES.some((p) => p.name === parsed.route)) {
          onProgress?.(`Route: ${parsed.route} (via Arch-Router)`);
          return parsed.route;
        }
      } catch {
        for (const policy of ROUTE_POLICIES) {
          if (content.toLowerCase().includes(policy.name)) {
            onProgress?.(`Route: ${policy.name} (via Arch-Router)`);
            return policy.name;
          }
        }
      }
    } catch {
      continue;
    }
  }

  onProgress?.("Arch-Router unavailable — using default route");
  return null;
}

// ── Stage 2a: Foundry Local generation ──────────────────────────

async function tryFoundryLocal(
  intent: string,
  scaffoldLevel: ScaffoldLevel,
  routeContext?: string,
  onProgress?: ForgeProgress
): Promise<ForgeBlueprint | null> {
  onProgress?.("Generating blueprint via Foundry Local...");

  const toolSchema = getBlueprintToolSchema();
  const systemPrompt = getSystemPrompt(scaffoldLevel, routeContext);

  const toolPayload = {
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: intent },
    ],
    tools: [toolSchema],
    tool_choice: { type: "function", function: { name: "generate_blueprint" } },
    temperature: 0.2,
    max_tokens: 4096,
  };

  const jsonPayload = {
    messages: [
      {
        role: "system",
        content: `${systemPrompt}\n\nIMPORTANT: Since tool-calling is not available, respond with a raw JSON object matching the ForgeBlueprint schema. No markdown, no code fences, just the JSON object.`,
      },
      { role: "user", content: intent },
    ],
    temperature: 0.2,
    max_tokens: 4096,
  };

  for (const endpoint of LOCAL_ENDPOINTS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toolPayload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.ok) {
        const data = await response.json();

        const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
        if (toolCall?.function?.arguments) {
          const args =
            typeof toolCall.function.arguments === "string"
              ? JSON.parse(toolCall.function.arguments)
              : toolCall.function.arguments;

          onProgress?.("Validating blueprint...");
          const blueprint = validateBlueprint(args);
          onProgress?.("Blueprint validated — Foundry Local ✓");
          return blueprint;
        }

        const content = data.choices?.[0]?.message?.content;
        if (content) {
          const parsed = extractJSON(content);
          if (parsed) {
            onProgress?.("Validating blueprint...");
            const blueprint = validateBlueprint(parsed);
            onProgress?.("Blueprint validated — Foundry Local ✓");
            return blueprint;
          }
        }
      }
    } catch {
      // Tool-calling failed — try JSON fallback
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(jsonPayload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          const parsed = extractJSON(content);
          if (parsed) {
            onProgress?.("Validating blueprint...");
            const blueprint = validateBlueprint(parsed);
            onProgress?.("Blueprint validated — Foundry Local (JSON mode) ✓");
            return blueprint;
          }
        }
      }
    } catch {
      continue;
    }
  }

  return null;
}

// ── Stage 2b: Cloud fallback ────────────────────────────────────

async function tryCloudFallback(
  intent: string,
  scaffoldLevel: ScaffoldLevel,
  routeContext?: string,
  onProgress?: ForgeProgress
): Promise<ForgeBlueprint> {
  onProgress?.("Falling back to cloud...");

  const { data, error } = await supabase.functions.invoke("forge-schema", {
    body: { intent, scaffoldLevel, routeContext },
  });

  if (error) {
    throw new Error(`Cloud fallback failed: ${error.message}`);
  }

  if (data?.error) {
    if (data.status === 429) {
      throw new Error("Rate limit exceeded. Please wait a moment and try again.");
    }
    if (data.status === 402) {
      throw new Error("AI credits exhausted. Please add credits to continue.");
    }
    throw new Error(data.error);
  }

  onProgress?.("Validating blueprint...");
  const blueprint = validateBlueprint(data);
  onProgress?.("Blueprint validated — Cloud ✓");
  return blueprint;
}

// ── Post-processing: inject stack migration notes + route_policy ──

function postProcess(
  blueprint: ForgeBlueprint,
  route: string | null,
  provider: string
): ForgeBlueprint {
  // Inject route_policy into IR
  if (route) {
    const policy = ROUTE_POLICIES.find((p) => p.name === route);
    blueprint.route_policy = {
      name: route,
      model_hint: policy?.model_hint || "",
      confidence: 1,
    };
  }

  // If target_stack is not lamp, inject migration notes
  const stack = blueprint.target_stack || "lamp";
  if (stack !== "lamp" && STACK_MIGRATION_GUIDES[stack]) {
    const existingNotes = blueprint.rad_migration_notes || [];
    const stackNotes = STACK_MIGRATION_GUIDES[stack];
    // Merge without duplicates
    const merged = [...existingNotes];
    for (const note of stackNotes) {
      if (!merged.includes(note)) {
        merged.push(note);
      }
    }
    blueprint.rad_migration_notes = merged;
  }

  return blueprint;
}

// ── Public API ──────────────────────────────────────────────────

export interface ForgeResult {
  blueprint: ForgeBlueprint;
  provider: string;
  route: string;
  localModels?: FoundryModelInfo[];
}

export async function forgeSchema(
  intent: string,
  scaffoldLevel: ScaffoldLevel,
  onProgress?: ForgeProgress,
  targetStack?: TargetStack
): Promise<ForgeResult> {
  // Stage 0: Model discovery (fire-and-forget, parallel with routing)
  const modelDiscovery = discoverLocalModels();

  // Stage 1: Route classification
  const route = await tryArchRouter(intent, onProgress);

  // Stage 2: Generation — try local first, then cloud
  const localBlueprint = await tryFoundryLocal(
    intent,
    scaffoldLevel,
    route || undefined,
    onProgress
  );

  let blueprint: ForgeBlueprint;
  let provider: string;

  if (localBlueprint) {
    blueprint = localBlueprint;
    provider = "foundry-local";
  } else {
    blueprint = await tryCloudFallback(
      intent,
      scaffoldLevel,
      route || undefined,
      onProgress
    );
    provider = "cloud";
  }

  // Set target_stack if specified
  if (targetStack) {
    blueprint.target_stack = targetStack;
  }

  // Post-process: inject route_policy + stack migration notes
  blueprint = postProcess(blueprint, route, provider);

  // Await model discovery
  const localModels = await modelDiscovery;

  return {
    blueprint,
    provider,
    route: route || "schema_generation",
    localModels: localModels.length > 0 ? localModels : undefined,
  };
}

// ── Helpers ─────────────────────────────────────────────────────

function extractJSON(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch { /* continue */ }

  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1]);
    } catch { /* continue */ }
  }

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(text.slice(firstBrace, lastBrace + 1));
    } catch { /* give up */ }
  }

  return null;
}
