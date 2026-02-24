

# Plan: Unified PDE with Collapsible + Undockable Panels and Animated CLI

## Summary

Build the unified Pedagogical Development Environment at `/pde` that consolidates the WebContainer editor (centerpiece), Architecture Canvas, SQL Workbench (with real sql.js execution), LAMPForge CLI (with animated ASCII banner and help system), and Evidence Log into a single workspace with collapsible and undockable panels. The landing page routes to `/pde` after forging. All existing pages remain untouched.

## New Files (7)

### 1. `src/pages/PDEPage.tsx` — The Unified Environment

Master workspace using `ResizablePanelGroup`:

- **State**: `panelStates: Record<string, "visible" | "hidden" | "undocked">` for panels: `canvas`, `sql`, `cli`, `evidence`
- **Layout**: Vertical split (top 70% / bottom 30%). Top area is horizontal split: left = collapsible Architecture Canvas (React Flow with entity/transaction/relationship nodes), right = WebContainer Editor (always visible, expands to full width when canvas hidden). Bottom area = tabbed panels (CLI, SQL Workbench, Evidence Log)
- **Panel toggle bar** in header: pill buttons with hide/show toggle + undock (`ExternalLink` icon) per panel
- **Blueprint consumption**: Same `sessionStorage` pattern as current CanvasPage — reads blueprint on mount, populates nodes, generates files, animates DDL
- **RAD 2.0 mode**: All panels visible by default. Other modes: only CLI + editor visible
- **BroadcastChannel**: Creates `"lampforge-pde"` channel for cross-tab sync with undocked panels

### 2. `src/pages/PDEPanelPage.tsx` — Undocked Panel Route

Route at `/pde/panel/:panelId` rendering a single panel full-screen in a new browser tab:

- Reads `panelId` from URL params (`"canvas"`, `"sql"`, `"cli"`, `"evidence"`)
- Renders the corresponding panel component full-viewport
- Joins `"lampforge-pde"` BroadcastChannel for state sync
- On `beforeunload`, broadcasts `panel-closed` so main PDE re-docks
- Reads initial state from `sessionStorage`, then relies on BroadcastChannel for live updates
- Minimal chrome: panel name header + "Return to PDE" link

### 3. `src/components/pde/SQLWorkbenchPanel.tsx` — Real SQL Execution

Self-contained SQL workbench using `sql.js` for real in-browser SQLite:

- **sql.js init**: `initSqlJs({ locateFile: file => \`https://sql.js.org/dist/${file}\` })` on mount, creates in-memory DB
- **Auto-seed**: When blueprint available, runs `adaptDDLForSQLite(generateDDL(blueprint))` to create tables
- **`adaptDDLForSQLite(ddl)`**: Strips MySQL syntax — removes `ENGINE=InnoDB`, `AUTO_INCREMENT`, `CREATE DATABASE`/`USE`, `ON UPDATE CURRENT_TIMESTAMP`, converts backtick quoting
- **Monaco editor** for SQL input (reuses `CodeEditor` component)
- **Schema explorer sidebar**: queries `sqlite_master` for table list, clicking table inserts `SELECT * FROM {table};`
- **Results grid**: `Table` UI component for tabular output
- **Query history**: stored in state, clickable to replay
- **BroadcastChannel**: broadcasts results, receives blueprint updates

### 4. `src/components/pde/PanelToggleBar.tsx` — Toggle + Undock Controls

Header toolbar with pill-shaped buttons per panel:

- Each has toggle (show/hide) and undock (`ExternalLink` icon) actions
- Visual states: highlighted when visible, muted when hidden, distinct "undocked" indicator
- Compact horizontal layout

### 5. `src/components/pde/EvidencePanel.tsx` — Inline Evidence Timeline

Compact version of Evidence page for embedding in bottom tabs:

- Receives `logs: LogEntry[]` as props
- Same timeline UI without header/sidebar chrome
- Auto-captures PDE actions (queries, file changes, node additions)

### 6. `src/lib/pde-channel.ts` — BroadcastChannel Utilities

Typed wrapper for cross-tab communication:

- Message types: `blueprint-update`, `terminal-output`, `sql-result`, `panel-closed`, `panel-undocked`
- `createPDEChannel()`, `broadcastMessage()`, `onMessage()` helpers
- Cleanup on unmount

### 7. `src/components/pde/CLIPanel.tsx` — Enhanced LAMPForge CLI

Enhanced version of `TerminalPanel` with:

- **Animated ASCII banner** on first load — frame-based animation of LAMPForge logo using semantic ANSI color roles mapped to the forge design token palette (blueprint=blue, transaction=orange, plumbing=green, forge=red, oracle=purple). ~10 frames, 80ms per frame, renders via React state updates. Respects `prefers-reduced-motion` — skips animation if set
- **`help` command implementation**: Rich help output explaining the 5-Family Taxonomy (Blueprint, Plumbing, Transaction, Forge, Oracle), available commands, keyboard shortcuts, and how the PDE works. Structured as a scrollable ASCII document with section headers
- **Admin-extensible command registry**: Commands stored as a `Map<string, CommandHandler>` where `CommandHandler = (args: string[], ctx: CLIContext) => string[]`. Built-in commands: `help`, `clear`, `schema`, `tables`, `describe <table>`, `forge <intent>`, `level <scaffold>`, `export`, `history`. New commands can be registered via `registerCommand(name, handler)`
- **`schema` command**: Dumps current DDL to terminal
- **`tables` command**: Lists all entities from current blueprint
- **`describe <table>` command**: Shows fields, types, constraints for a specific entity
- **`forge <intent>` command**: Triggers a new forge cycle from the CLI
- **`level` command**: Shows/changes current scaffold level
- **`export` command**: Triggers evidence export
- **`history` command**: Shows command history

## Modified Files (2)

### 8. `src/App.tsx`

- Import `PDEPage` and `PDEPanelPage`
- Add routes: `/pde` → `PDEPage`, `/pde/panel/:panelId` → `PDEPanelPage`
- All existing routes remain untouched

### 9. `src/pages/LandingPage.tsx`

- Change line 91: `navigate("/canvas")` → `navigate("/pde")`
- Everything else stays exactly as-is

## Technical Details

- **Undocking flow**: User clicks `⧉` → `window.open("/pde/panel/sql", "_blank")` → panel marked as `"undocked"` in main PDE → BroadcastChannel syncs state → closing undocked tab broadcasts `panel-closed` → main PDE re-docks panel
- **sql.js WASM**: Loaded from CDN. SQLite used as MySQL stand-in. `adaptDDLForSQLite` handles syntax translation
- **Panel persistence**: `sessionStorage` stores panel visibility states within session
- **ResizablePanel collapse**: Uses `collapsible={true}` and `collapsedSize={0}` from `react-resizable-panels`
- **ASCII animation**: Frame array of string templates, each with duration and color map. Colors reference design tokens (forge-blueprint, forge-transaction, etc.). Rendered via `useState` + `setInterval`. Auto-plays once on PDE mount, then shows static logo
- **No existing pages are deleted or modified** beyond the two listed above

```text
User Flow After Forge:
Landing Page → /pde
┌──────────────────────────────────────────────┐
│ Header: [LAMPForge PDE] [⊞Canvas] [⊞SQL]    │
│         [⊞CLI] [⊞Evidence] [Run]             │
├────────────────┬─────────────────────────────┤
│ Architecture   │ WebContainer Editor         │
│ Canvas         │ (StackBlitz embedded)       │
│ (collapsible)  │ (centerpiece)               │
│ (undockable)   │                             │
├────────────────┴─────────────────────────────┤
│ [CLI] [SQL Workbench] [Evidence]             │
│ ┌──────────────────────────────────────────┐ │
│ │ LAMPForge CLI v1.0.0                     │ │
│ │ ╔═══════════════════════╗                │ │
│ │ ║  LAMP  ╔═╗ FORGE     ║ (animated)     │ │
│ │ ╚═══════════════════════╝                │ │
│ │ Type 'help' for available commands.      │ │
│ │ lampforge>                               │ │
│ └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘

Undocked panel (separate browser tab):
/pde/panel/sql
┌──────────────────────────────────────────────┐
│ SQL Workbench (undocked) [↩ Return to PDE]   │
├──────────────────────────────────────────────┤
│ Full SQL Workbench with Monaco + results     │
│ Synced via BroadcastChannel                  │
└──────────────────────────────────────────────┘
```

