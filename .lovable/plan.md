

# Plan: Embed Code - OSS (vscode-web) as the PDE IDE Surface

## The Vision

You will fork `microsoft/vscode`, set up a GitHub Action that builds the web version (`yarn gulp vscode-web-min`), and pushes the minified output to your Lovable project repo at `public/pde/`. Because Lovable bidirectionally syncs with GitHub, the built VS Code web assets will automatically appear in your project.

On the Lovable side, the plan below prepares the infrastructure to **load and use** those built assets.

## What Changes on the Lovable Side

### 1. `src/components/ide/CodeOSSFrame.tsx` — New Component

A new component that loads the Code - OSS web build from `/pde/` as an iframe, with bidirectional messaging to the rest of the PDE:

- Renders an `<iframe src="/pde/index.html" />` pointing to the built vscode-web assets in `public/pde/`
- Sets `sandbox="allow-scripts allow-same-origin allow-popups allow-forms"` for security while allowing full editor functionality
- Implements a `postMessage` bridge so the parent PDE can:
  - Send file content updates (from the forge/SQL generator) into the editor workspace
  - Receive file-save events back for evidence logging
- Exposes an imperative handle (`CodeOSSFrameHandle`) with methods:
  - `openFile(path: string)` — posts a message to the iframe to open a specific file
  - `applyFsDiff(create: Record<string, string>)` — posts file creation messages
  - `reload()` — reloads the iframe
- Shows a loading skeleton while the iframe initializes
- Falls back to the existing StackBlitz SDK embed if `/pde/index.html` is not found (404 check on mount)

### 2. `src/pages/PDEPage.tsx` — Replace WebContainerEditor with CodeOSSFrame

- Import `CodeOSSFrame` instead of `WebContainerEditor`
- Replace the `<WebContainerEditor>` render with `<CodeOSSFrame>`
- Keep the same imperative ref pattern so `applyFsDiff` from the forge pipeline still works
- Hide canvas by default for all scaffold levels: update `getDefaultPanelStates` so canvas is `"hidden"` for every level
- Show view toggle buttons (Editor/Split/Preview) for all levels, not just RAD
- The `scaffoldLevel` prop is still passed — it controls which documentation/help files are injected, not the IDE surface

### 3. `vite.config.ts` — Cross-Origin Isolation Headers

Add the headers required for SharedArrayBuffer (needed by Code - OSS web for its worker threads):

```typescript
server: {
  headers: {
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Opener-Policy': 'same-origin',
  }
}
```

### 4. `public/pde/.gitkeep` — Placeholder for CI/CD Output

Create an empty placeholder so the `public/pde/` directory exists in the repo. Your GitHub Action will populate this directory with the built `out-vscode-web` assets. Until those assets arrive, the `CodeOSSFrame` component falls back to the StackBlitz SDK embed.

### 5. `src/lib/vscode-bridge.ts` — PostMessage Protocol

A small utility defining the message protocol between the parent PDE and the Code - OSS iframe:

```text
Parent → iframe:
  { type: "lampforge:open-file", path: "sql/schema.sql" }
  { type: "lampforge:write-file", path: "...", content: "..." }
  { type: "lampforge:set-theme", theme: "vs-dark" }

iframe → Parent:
  { type: "lampforge:file-saved", path: "...", content: "..." }
  { type: "lampforge:ready" }
```

This protocol allows the forge pipeline (SQL generator, blueprint populator) to push generated files into the VS Code editor, and allows the editor to report saves back for evidence logging.

## What You Do on GitHub (Outside Lovable)

This is the sovereign CI/CD pipeline you described:

1. **Fork** `microsoft/vscode` to your GitHub account
2. **Create** `.github/workflows/forge-build.yml` in the fork:
   - Trigger: on push to `main` OR on cron schedule (nightly sync)
   - Steps: checkout, `yarn install`, `yarn gulp vscode-web-min`
   - Push `out-vscode-web/*` to your Lovable repo at `public/pde/` using a PAT or deploy key
3. **Sync fork** with upstream Microsoft via a scheduled "sync" action
4. Lovable's bidirectional GitHub sync picks up the new `public/pde/` files automatically

## The Chain

```text
Microsoft updates vscode
  → Your fork auto-syncs (GitHub Action cron)
    → Build Action runs: yarn gulp vscode-web-min
      → Action pushes out-vscode-web → your-lovable-repo/public/pde/
        → Lovable sees new files via GitHub sync
          → CodeOSSFrame loads /pde/index.html
            → Full VS Code in your PDE
```

## Fallback Strategy

Until the CI/CD pipeline delivers the first build:
- `CodeOSSFrame` checks if `/pde/index.html` exists (HEAD request)
- If 404: renders the existing StackBlitz SDK embed as fallback
- If 200: renders the Code - OSS iframe
- This means the PDE works immediately and upgrades itself when the build lands

## File Summary

| File | Action |
|---|---|
| `src/components/ide/CodeOSSFrame.tsx` | New — iframe wrapper + postMessage bridge |
| `src/lib/vscode-bridge.ts` | New — message protocol types/utilities |
| `src/pages/PDEPage.tsx` | Modified — use CodeOSSFrame, canvas hidden, view toggles for all |
| `vite.config.ts` | Modified — add COOP/COEP headers |
| `public/pde/.gitkeep` | New — placeholder for CI/CD output |

