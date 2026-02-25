# System Architecture

## Overview

LAMPForge follows a **client-heavy architecture** where the browser is the primary compute surface. All code generation, SQL execution, and evidence logging happen client-side. The only server-side component is the AI blueprint generation edge function.

---

## High-Level Architecture

```mermaid
graph TB
    subgraph "Browser Runtime"
        direction TB
        
        subgraph "Pages"
            LP[LandingPage.tsx<br/>Intent + Scaffold]
            PDE[PDEPage.tsx<br/>Unified PDE]
            CP[CanvasPage.tsx<br/>Standalone Canvas]
            WBP[WorkbenchPage.tsx<br/>Standalone Workbench]
            EVP[EvidencePage.tsx<br/>Standalone Evidence]
        end
        
        subgraph "Code Generation Engine"
            SG[sql-generator.ts<br/>DDL + PHP + HTML]
            FT[forge-types.ts<br/>Zod Schemas]
        end
        
        subgraph "AI Pipeline"
            FA[forge-ai.ts<br/>3-Stage Inference]
        end
        
        subgraph "IDE Surface"
            COF[CodeOSSFrame.tsx<br/>Code-OSS / StackBlitz]
            VB[vscode-bridge.ts<br/>PostMessage Protocol]
            WCE[WebContainerEditor.tsx<br/>StackBlitz SDK]
            WCP[webcontainer-project.ts<br/>Project Builder]
        end
        
        subgraph "Panels"
            CLIP[CLIPanel.tsx<br/>Command Registry]
            SQLP[SQLWorkbenchPanel.tsx<br/>sql.js + SQLite WASM]
            EVPP[EvidencePanel.tsx<br/>Timeline View]
            PTB[PanelToggleBar.tsx<br/>Visibility Controls]
        end
        
        subgraph "Canvas Nodes"
            EN[EntityNode.tsx]
            TN[TransactionNode.tsx]
            ON[OracleNode.tsx]
            FSN[ForgeStatusNode.tsx]
        end
        
        subgraph "Communication"
            PDC[pde-channel.ts<br/>BroadcastChannel]
        end
    end
    
    subgraph "Edge (Serverless)"
        EF[forge-schema/<br/>Edge Function]
        AG[Lovable AI Gateway<br/>Gemini 3 Flash]
    end
    
    subgraph "Optional Local"
        OL[Ollama / Foundry Local<br/>Phi-4-mini]
    end
    
    LP --> FA
    FA --> OL
    FA --> EF
    EF --> AG
    
    FA -->|"ForgeBlueprint"| PDE
    PDE --> SG
    SG --> COF
    PDE --> CLIP
    PDE --> SQLP
    PDE --> EVPP
    
    COF --> VB
    COF --> WCE
    WCE --> WCP
    
    PDE --> CV[React Flow Canvas]
    CV --> EN
    CV --> TN
    CV --> ON
    CV --> FSN
    
    PDE --> PDC
```

---

## Data Flow

### 1. Intent → Blueprint

```mermaid
sequenceDiagram
    participant U as User
    participant LP as LandingPage
    participant AI as AI Pipeline
    participant V as Zod Validator
    participant SS as sessionStorage
    
    U->>LP: Enter intent + select level
    LP->>AI: forgeSchema(intent, level)
    AI->>AI: tryArchRouter() → route
    AI->>AI: tryFoundryLocal() → blueprint?
    alt Local success
        AI-->>LP: {blueprint, provider: "foundry-local"}
    else Local unavailable
        AI->>AI: tryCloudFallback()
        AI-->>LP: {blueprint, provider: "cloud"}
    end
    LP->>V: validateBlueprint(raw)
    V-->>LP: ForgeBlueprint (validated)
    LP->>SS: Store blueprint + metadata
    LP->>LP: navigate("/pde")
```

### 2. Blueprint → Code

```mermaid
sequenceDiagram
    participant PDE as PDEPage
    participant SS as sessionStorage
    participant SG as sql-generator
    participant IDE as CodeOSSFrame
    participant CV as Canvas
    
    PDE->>SS: Read blueprint
    PDE->>CV: Populate entity/transaction nodes
    PDE->>SG: generateAllFiles(blueprint)
    SG-->>PDE: {sql/schema.sql, php/*.php, html/*.html}
    PDE->>IDE: applyFsDiff(files)
    IDE->>IDE: Write files to WebContainer/iframe
```

### 3. Panel Undocking

```mermaid
sequenceDiagram
    participant PDE as PDEPage
    participant BC as BroadcastChannel
    participant TAB as New Browser Tab
    
    PDE->>PDE: User clicks undock icon
    PDE->>BC: {type: "panel-undocked", panelId: "sql"}
    PDE->>TAB: window.open("/pde/panel/sql")
    TAB->>BC: Subscribe to channel
    Note over PDE,TAB: Panels communicate via BroadcastChannel
    TAB->>BC: {type: "panel-closed", panelId: "sql"}
    BC->>PDE: Panel returns to main view
```

---

## Component Relationships

### Page → Component Map

| Page | Key Components |
|------|---------------|
| `LandingPage` | Template gallery, scaffold selector, intent textarea |
| `PDEPage` | `CodeOSSFrame`, `CLIPanel`, `SQLWorkbenchPanel`, `EvidencePanel`, `PanelToggleBar`, React Flow canvas |
| `CanvasPage` | React Flow canvas, `WebContainerEditor`, `TerminalPanel` |
| `WorkbenchPage` | `CodeEditor` (Monaco), results table |
| `EvidencePage` | Timeline cards, SDLC stage sidebar |

### Library → Consumer Map

| Library | Consumed By |
|---------|------------|
| `forge-ai.ts` | `LandingPage` |
| `forge-types.ts` | `forge-ai.ts`, `sql-generator.ts`, `pde-channel.ts`, `PDEPage`, `CanvasPage`, `CLIPanel`, `SQLWorkbenchPanel` |
| `sql-generator.ts` | `PDEPage`, `CanvasPage`, `CLIPanel`, `SQLWorkbenchPanel` |
| `vscode-bridge.ts` | `CodeOSSFrame` |
| `pde-channel.ts` | `PDEPage`, `PDEPanelPage` |
| `webcontainer-project.ts` | `WebContainerEditor` |

---

## Security Model

| Layer | Mechanism |
|-------|-----------|
| **Code-OSS iframe** | `sandbox="allow-scripts allow-same-origin allow-popups allow-forms"` |
| **PostMessage** | `lampforge:` prefix validation via `isLampforgeMessage()` |
| **Edge Function** | CORS headers, API key via `LOVABLE_API_KEY` env var |
| **Generated PHP** | CSRF tokens, PDO prepared statements (at Exemplary/RAD levels) |
| **Cross-Origin Isolation** | `COEP: require-corp`, `COOP: same-origin` headers in Vite config |

---

*This document is part of the LAMPForge doc-as-code suite. See [README.md](../README.md) for the full documentation index.*
