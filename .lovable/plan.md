

# Plan: Full Browser PDE Experience — StackBlitz Codeflow-Grade Implementation

## Current State

The PDE exists at `/pde` with collapsible/undockable panels, a WebContainer editor, CLI, SQL Workbench, and Evidence Log. However the WebContainer editor is configured minimally — it uses `view: "editor"` (editor-only, no preview pane), `terminalHeight: 30`, and doesn't leverage the full StackBlitz SDK VM capabilities. For RAD 2.0 mode, the user wants a full Codeflow-grade IDE experience: file explorer, terminal, preview pane, split editor views, and sidebar toggling — all controlled programmatically via the VM API.

## What Changes

### 1. Enhanced WebContainer Editor for RAD 2.0 (`src/components/canvas/WebContainerEditor.tsx`)

Upgrade the WebContainer embed to expose full Codeflow capabilities based on scaffold level:

- **RAD 2.0 mode**: `view: "default"` (editor + preview split), `showSidebar: true`, `sidebarView: "project"`, `terminalHeight: 40`, `hideExplorer: false`, multiple `openFile` tabs (`sql/schema.sql,php/db_connect.php,html/forms/index.html`)
- **Other levels**: `view: "editor"`, `showSidebar: false`, `terminalHeight: 25`, single `openFile`
- **New props**: Accept `scaffoldLevel` prop to configure the embed appropriately
- **Expose more VM methods** via the imperative handle:
  - `openFile(path)` — delegates to `vm.editor.openFile`
  - `setView(view)` — delegates to `vm.editor.setView` (switch between editor/preview/default)
  - `showSidebar(visible)` — delegates to `vm.editor.showSidebar`
  - `setCurrentFile(path)` — delegates to `vm.editor.setCurrentFile`
  - `getPreviewUrl()` — delegates to `vm.preview.getUrl`
- **Cross-origin isolation**: Enable `crossOriginIsolated: true` for better WebContainer performance

### 2. PDEPage passes scaffold level to WebContainer (`src/pages/PDEPage.tsx`)

- Pass `scaffoldLevel` from the blueprint to `WebContainerEditor` so it configures itself for the right mode
- When scaffold level is RAD 2.0, the WebContainer shows the full IDE experience (file explorer, terminal, preview) — resembling StackBlitz Codeflow
- For non-RAD levels, the WebContainer shows a simplified editor-only view to avoid overwhelming the student
- Add toolbar buttons to toggle WebContainer view mode (editor/preview/both) using the new `setView` handle method
- Add a "Preview" button in the header that calls `vm.editor.setView("default")` to show the running app alongside the code

### 3. Richer project scaffold for RAD 2.0 (`src/lib/webcontainer-project.ts`)

Enhance the embedded project for RAD 2.0 mode:

- Add a `.lampforge/README.md` file explaining the project structure and how to use the PDE
- Add a `.lampforge/help.md` with the same content as the CLI `help` command output — the 5-Family Taxonomy, available commands, and how the PDE works. This file is viewable in the editor and acts as in-IDE documentation
- Add a `vite.config.js` + switch from Express to Vite for the dev server in RAD 2.0 mode — this enables sub-second HMR as described in the master narrative. The project will use `vite` as the dev server with an `index.html` entry point, making the preview pane update instantly on file changes
- For non-RAD levels, keep the existing Express-based `server.js` setup (simpler, more familiar to students)
- Accept `scaffoldLevel` parameter in `buildProject` to conditionally include the Vite setup

### 4. Undocked Canvas — Full React Flow in separate tab (`src/pages/PDEPanelPage.tsx`)

Replace the "coming soon" placeholder for the canvas panel with a full React Flow canvas:

- Import and render the same React Flow setup as PDEPage (entity nodes, transaction nodes, relationship edges)
- Read blueprint from `sessionStorage` to populate nodes/edges
- Listen on BroadcastChannel for `blueprint-update` messages to sync state
- Include the "Add Entity" and "Add Transaction" buttons

### 5. Non-RAD scaffold level defaults (`src/pages/PDEPage.tsx`)

Refine the panel defaults based on scaffold level:

- **Exploratory**: Only CLI visible in bottom area, canvas hidden, SQL hidden, evidence hidden. WebContainer in editor-only mode. Minimal cognitive load
- **Competent**: CLI + canvas visible, SQL hidden, evidence hidden. WebContainer in editor-only mode
- **Exemplary**: CLI + canvas + SQL visible, evidence hidden. WebContainer in editor-only mode
- **RAD 2.0**: All panels visible. WebContainer in full Codeflow mode (editor + preview + terminal + sidebar). Maximum capability

## Technical Details

- **StackBlitz SDK VM API**: The `VM` class exposes `editor.openFile`, `editor.setView`, `editor.showSidebar`, `editor.setCurrentFile`, `editor.setTheme`, `preview.getUrl`, `preview.setUrl`. These are all available after `embedProject` resolves. Currently only `applyFsDiff` and `getFsSnapshot` are used
- **Vite in WebContainer**: The StackBlitz WebContainer natively supports Vite — `template: "node"` with a `vite` dependency in `package.json` and `"dev": "vite"` as the start script. This gives HMR in the preview pane
- **No breaking changes**: All existing pages (`/canvas`, `/workbench`, `/evidence`) remain untouched. The `buildProject` function gains an optional `scaffoldLevel` parameter with a default that preserves current behavior
- **`crossOriginIsolated: true`**: Enables SharedArrayBuffer in the WebContainer, improving performance for filesystem operations

## Modified Files Summary

1. `src/components/canvas/WebContainerEditor.tsx` — Add scaffold-aware config, expose VM editor/preview methods
2. `src/pages/PDEPage.tsx` — Pass scaffoldLevel, add view toggle buttons, refine panel defaults per level
3. `src/lib/webcontainer-project.ts` — Add Vite-based project for RAD 2.0, add `.lampforge/` docs
4. `src/pages/PDEPanelPage.tsx` — Implement full React Flow canvas for undocked view

