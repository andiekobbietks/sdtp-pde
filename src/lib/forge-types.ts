import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

// ── Enums ──────────────────────────────────────────────────────────

export const ScaffoldLevelSchema = z.enum(["exploratory", "competent", "exemplary", "rad"]);
export type ScaffoldLevel = z.infer<typeof ScaffoldLevelSchema>;

export const TargetStackSchema = z.enum(["lamp", "honc", "mern", "django", "mamp", "wamp"]);
export type TargetStack = z.infer<typeof TargetStackSchema>;

export const MysqlTypeSchema = z.enum([
  "INT", "BIGINT", "SMALLINT", "TINYINT",
  "VARCHAR", "CHAR", "TEXT", "LONGTEXT",
  "DECIMAL", "FLOAT", "DOUBLE",
  "DATETIME", "DATE", "TIMESTAMP", "TIME",
  "BOOLEAN", "ENUM", "JSON", "BLOB",
]);

export const ConstraintSchema = z.enum([
  "PRIMARY KEY", "NOT NULL", "UNIQUE", "DEFAULT", "CHECK", "FOREIGN KEY", "AUTO_INCREMENT",
]);

export const CardinalitySchema = z.enum(["1:1", "1:M", "M:M"]);

export const CrudOpSchema = z.enum(["CREATE", "READ", "UPDATE", "DELETE"]);

export const PageLayoutSchema = z.enum(["table-crud", "form", "dashboard", "detail"]);

// ── Route Policy ──────────────────────────────────────────────────

export const RoutePolicySchema = z.object({
  name: z.string().describe("Route classification name from Arch-Router"),
  model_hint: z.string().default("").describe("Suggested model for this route class"),
  confidence: z.number().min(0).max(1).default(1).describe("Router confidence score"),
});
export type RoutePolicy = z.infer<typeof RoutePolicySchema>;

// ── Field ──────────────────────────────────────────────────────────

export const ForgeFieldSchema = z.object({
  name: z.string().regex(/^[a-z][a-z0-9_]*$/, "Field name must be snake_case"),
  type: z.string().describe("SQL column type, e.g. VARCHAR(255), INT, TEXT"),
  constraint: z.string().default(""),
  nullable: z.boolean().default(true),
  default: z.string().optional(),
  references: z
    .object({
      entity: z.string(),
      field: z.string(),
    })
    .optional(),
});
export type ForgeField = z.infer<typeof ForgeFieldSchema>;

// ── Entity ─────────────────────────────────────────────────────────

export const ForgeEntitySchema = z.object({
  name: z.string().regex(/^[a-z][a-z0-9_]*$/, "Entity name must be snake_case"),
  fields: z.array(ForgeFieldSchema).min(1),
  indexes: z.array(z.string()).default([]),
  audit: z.boolean().default(false),
});
export type ForgeEntity = z.infer<typeof ForgeEntitySchema>;

// ── Relationship ───────────────────────────────────────────────────

export const ForgeRelationshipSchema = z.object({
  name: z.string(),
  from: z.string(),
  to: z.string(),
  cardinality: CardinalitySchema,
  on_delete: z.string().default("CASCADE"),
  on_update: z.string().default("CASCADE"),
});
export type ForgeRelationship = z.infer<typeof ForgeRelationshipSchema>;

// ── Transaction ────────────────────────────────────────────────────

export const ForgeTransactionSchema = z.object({
  entity: z.string(),
  operations: z.array(CrudOpSchema).min(1),
  auth: z.boolean().default(false),
  validation: z.array(z.string()).default([]),
  pagination: z.boolean().default(false),
});
export type ForgeTransaction = z.infer<typeof ForgeTransactionSchema>;

// ── Page ───────────────────────────────────────────────────────────

export const ForgePageSchema = z.object({
  route: z.string(),
  title: z.string(),
  entity: z.string(),
  layout: PageLayoutSchema.default("table-crud"),
  fields: z.array(z.string()).default([]),
});
export type ForgePage = z.infer<typeof ForgePageSchema>;

// ── Config ─────────────────────────────────────────────────────────

export const ForgeConfigSchema = z.object({
  server: z
    .object({
      port: z.number().default(3000),
      host: z.string().default("localhost"),
    })
    .default({}),
  database: z
    .object({
      host: z.string().default("localhost"),
      port: z.number().default(3306),
      name: z.string().default("lampforge_db"),
      user: z.string().default("root"),
    })
    .default({}),
  session: z
    .object({
      max_age: z.number().default(3600),
    })
    .default({}),
});
export type ForgeConfig = z.infer<typeof ForgeConfigSchema>;

// ── Blueprint (root) ──────────────────────────────────────────────

export const ForgeBlueprintSchema = z.object({
  version: z.string().default("1.0"),
  project: z.object({
    name: z.string(),
    description: z.string().default(""),
    dialect: z.string().default("mysql"),
  }),
  scaffold_level: ScaffoldLevelSchema,
  target_stack: TargetStackSchema.default("lamp"),
  entities: z.array(ForgeEntitySchema).min(1),
  relationships: z.array(ForgeRelationshipSchema).default([]),
  transactions: z.array(ForgeTransactionSchema).default([]),
  pages: z.array(ForgePageSchema).default([]),
  config: ForgeConfigSchema.default({}),
  route_policy: RoutePolicySchema.optional().describe("Arch-Router classification persisted in the IR"),
  rad_migration_notes: z.array(z.string()).optional(),
});
export type ForgeBlueprint = z.infer<typeof ForgeBlueprintSchema>;

// ── Validation ────────────────────────────────────────────────────

export function validateBlueprint(raw: unknown): ForgeBlueprint {
  const result = ForgeBlueprintSchema.parse(raw);

  // Cross-reference: relationships must reference existing entity names
  const entityNames = new Set(result.entities.map((e) => e.name));
  for (const rel of result.relationships) {
    if (!entityNames.has(rel.from)) {
      throw new Error(`Relationship "${rel.name}" references unknown entity "${rel.from}"`);
    }
    if (!entityNames.has(rel.to)) {
      throw new Error(`Relationship "${rel.name}" references unknown entity "${rel.to}"`);
    }
  }

  // Cross-reference: transactions must reference existing entities
  for (const txn of result.transactions) {
    if (!entityNames.has(txn.entity)) {
      throw new Error(`Transaction references unknown entity "${txn.entity}"`);
    }
  }

  // Cross-reference: pages must reference existing entities
  for (const page of result.pages) {
    if (!entityNames.has(page.entity)) {
      throw new Error(`Page "${page.route}" references unknown entity "${page.entity}"`);
    }
  }

  return result;
}

// ── Auto-derived Tool Schema (single source of truth) ─────────────
// Replaces the 130-line hand-maintained getBlueprintToolSchema().
// The Zod schema IS the source of truth; the JSON Schema is derived.

let _cachedToolSchema: ReturnType<typeof _buildToolSchema> | null = null;

function _buildToolSchema() {
  const jsonSchema = zodToJsonSchema(ForgeBlueprintSchema, {
    name: "ForgeBlueprint",
    $refStrategy: "none",        // inline all definitions — no $ref
    errorMessages: false,
    target: "openAi",            // OpenAI-compatible output
  });

  // Extract just the properties schema (strip the wrapper)
  const schema = jsonSchema as Record<string, unknown>;
  const properties = (schema.properties ?? schema) as Record<string, unknown>;

  return {
    type: "function" as const,
    function: {
      name: "generate_blueprint",
      description:
        "Generate a ForgeBlueprint — a complete LAMP application architecture from the user's intent. " +
        "The IR supports multiple target stacks via the target_stack field, and persists the Arch-Router " +
        "classification in route_policy for canvas inspection.",
      parameters: {
        type: "object",
        properties,
        required: ["project", "scaffold_level", "entities"],
        additionalProperties: false,
      },
    },
  };
}

export function getBlueprintToolSchema() {
  if (!_cachedToolSchema) {
    _cachedToolSchema = _buildToolSchema();
  }
  return _cachedToolSchema;
}

// ── Stack Migration Notes ─────────────────────────────────────────

export const STACK_MIGRATION_GUIDES: Record<string, string[]> = {
  honc: [
    "HONC: Replace MySQL DDL with Drizzle ORM schema definitions (pgTable/sqliteTable)",
    "HONC: Swap PHP CRUD endpoints for Hono route handlers with typed middleware",
    "HONC: Deploy to Cloudflare Workers (V8 isolates, <5ms cold start)",
    "HONC: Use drizzle-zod to auto-derive validators from schema — single source of truth",
    "HONC: Use D1 (SQLite at edge) or Neon (serverless Postgres) as database",
  ],
  mern: [
    "MERN: Replace MySQL tables with Mongoose schemas (MongoDB documents)",
    "MERN: Swap PHP CRUD for Express.js route handlers with async/await",
    "MERN: Use React components instead of server-rendered HTML forms",
    "MERN: Session management via express-session + connect-mongo or JWT",
  ],
  django: [
    "Django: Convert entities to Django models (models.py) with ORM field types",
    "Django: Use Django REST Framework for CRUD API endpoints",
    "Django: Replace HTML forms with Django templates + CSRF middleware",
    "Django: Migrations handled by 'python manage.py makemigrations'",
  ],
  mamp: [
    "MAMP: Identical LAMP output — configure MAMP's Apache+MySQL paths",
    "MAMP: Place PHP files in /Applications/MAMP/htdocs/ (macOS)",
    "MAMP: Access via http://localhost:8888 (default MAMP port)",
  ],
  wamp: [
    "WAMP: Identical LAMP output — configure WampServer paths",
    "WAMP: Place PHP files in C:\\wamp64\\www\\",
    "WAMP: Access via http://localhost (default WAMP port)",
  ],
};
