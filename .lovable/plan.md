

# Plan: Full Browser PDE Experience — StackBlitz Codeflow-Grade Implementation

## Status: ✅ IMPLEMENTED

## What Changed

### 1. WebContainerEditor — Scaffold-Aware Codeflow Config
- Accepts `scaffoldLevel` prop
- **RAD 2.0**: `view: "default"` (editor+preview split), `showSidebar: true`, `sidebarView: "project"`, `terminalHeight: 40`, multi-file tabs, `crossOriginIsolated: true`, `startScript: "dev"`
- **Other levels**: `view: "editor"`, `hideExplorer: true`, `showSidebar: false`, single file
- Exposes full VM API: `openFile`, `setView`, `showSidebar`, `setCurrentFile`, `getPreviewUrl`

### 2. PDEPage — Scaffold-Aware Layout + View Toggles
- Reads `scaffold_level` from blueprint, sets panel defaults per level
- RAD 2.0: all panels visible + Editor/Split/Preview toggle buttons in header
- Exploratory: CLI only. Competent: CLI+Canvas. Exemplary: CLI+Canvas+SQL
- RAD 2.0 badge shown in header

### 3. webcontainer-project — Vite HMR for RAD 2.0
- RAD 2.0: Vite dev server with HMR, `.lampforge/README.md` + `help.md` (5-Family Taxonomy docs)
- Other levels: Express-based `server.js` (unchanged)
- `buildProject` accepts optional `scaffoldLevel` parameter

### 4. PDEPanelPage — Full Undocked Canvas
- Canvas panel renders full React Flow with entity/transaction/relationship nodes
- Reads blueprint from sessionStorage, syncs via BroadcastChannel
- Add Entity / Add Transaction buttons available in undocked view
