import type { Project } from "@stackblitz/sdk";
import type { ScaffoldLevel } from "@/components/canvas/WebContainerEditor";

/**
 * Builds a StackBlitz Project object from a file map.
 * RAD 2.0 mode uses Vite for HMR; other levels use Express for simplicity.
 */
export function buildProject(
  files: Record<string, string>,
  scaffoldLevel: ScaffoldLevel = "exploratory"
): Project {
  const isRad = scaffoldLevel === "rad";

  if (isRad) {
    return buildRadProject(files);
  }

  return buildStandardProject(files);
}

// ── RAD 2.0: Vite-powered project with HMR ────────────────────

function buildRadProject(files: Record<string, string>): Project {
  const packageJson = JSON.stringify(
    {
      name: "lampforge-rad",
      version: "1.0.0",
      private: true,
      type: "module",
      scripts: {
        dev: "vite --host 0.0.0.0",
      },
      devDependencies: {
        vite: "^5.4.0",
      },
    },
    null,
    2
  );

  const viteConfig = `import { defineConfig } from 'vite';

export default defineConfig({
  root: './html',
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
});
`;

  const readmeMd = `# LAMPForge Project

## Project Structure

\`\`\`
├── .lampforge/        # LAMPForge documentation
│   ├── README.md      # This file
│   └── help.md        # CLI help & 5-Family Taxonomy
├── html/              # Frontend HTML files (Vite root)
│   ├── index.html     # Entry point
│   └── forms/         # Generated CRUD forms
├── php/               # PHP backend files
│   └── db_connect.php # Database connection
├── sql/               # SQL schema & queries
│   └── schema.sql     # Auto-generated DDL
├── package.json       # Dependencies (Vite for HMR)
└── vite.config.js     # Vite dev server config
\`\`\`

## Getting Started

The Vite dev server starts automatically, giving you **sub-second HMR**.
Edit any HTML file and see changes instantly in the Preview pane.

## PDE Controls

- **Toggle panels**: Use the header toggle bar to show/hide Canvas, SQL, CLI, Evidence
- **Undock panels**: Click the ⧉ icon to pop a panel into its own browser tab
- **View modes**: Switch between Editor, Preview, or Split view using the toolbar
`;

  const helpMd = `# LAMPForge CLI — Help

## The 5-Family Taxonomy

| Family      | Color  | Purpose                                    |
|-------------|--------|--------------------------------------------|
| Blueprint   | 🔵 Blue   | Entity design, schema, ERD                |
| Transaction | 🟠 Orange | CRUD operations, data flow                |
| Plumbing    | 🟢 Green  | Relationships, FK, joins                  |
| Forge       | 🔴 Red    | Code generation, build, deploy            |
| Oracle      | 🟣 Purple | AI inference, analysis, suggestions       |

## Available Commands

| Command              | Description                              |
|----------------------|------------------------------------------|
| \`help\`              | Show this help document                  |
| \`clear\`             | Clear the terminal                       |
| \`schema\`            | Display current DDL                      |
| \`tables\`            | List all entities                        |
| \`describe <table>\`  | Show fields/types/constraints            |
| \`forge <intent>\`    | Trigger a new forge cycle                |
| \`level [level]\`     | Show or change scaffold level            |
| \`export\`            | Export evidence log                      |
| \`history\`           | Show command history                     |

## Scaffold Levels

- **Exploratory**: Minimal — CLI + editor only
- **Competent**: CLI + Canvas + editor
- **Exemplary**: CLI + Canvas + SQL + editor
- **RAD 2.0**: Full Codeflow IDE — all panels, preview, HMR
`;

  // For RAD mode, the index.html lives at html/index.html (Vite root = ./html)
  const htmlIndex = files["html/forms/index.html"] || `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LAMPForge App</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body>
<nav class="navbar navbar-dark bg-dark mb-4">
  <div class="container"><a class="navbar-brand" href="#">LAMPForge App</a></div>
</nav>
<div class="container">
    <h1>LAMPForge Generated Application</h1>
    <p class="text-muted">Add entities to the canvas to generate your application.</p>
</div>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
`;

  // Build the Vite root index.html that points to forms/index.html
  const viteIndex = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LAMPForge App</title>
</head>
<body>
    <script type="module">
      // Redirect to forms
      window.location.href = '/forms/index.html';
    </script>
</body>
</html>
`;

  return {
    title: "LAMPForge RAD 2.0 Project",
    description: "Full Codeflow IDE with Vite HMR",
    template: "node",
    files: {
      "package.json": packageJson,
      "vite.config.js": viteConfig,
      "html/index.html": viteIndex,
      ".lampforge/README.md": readmeMd,
      ".lampforge/help.md": helpMd,
      ...files,
    },
  };
}

// ── Standard: Express-based project ────────────────────────────

function buildStandardProject(files: Record<string, string>): Project {
  const embeddedPackageJson = JSON.stringify(
    {
      name: "lampforge-project",
      version: "1.0.0",
      description: "LAMPForge Generated LAMP Application",
      scripts: {
        start: "node server.js",
      },
      dependencies: {
        express: "^4.18.2",
      },
    },
    null,
    2
  );

  const serverJs = `const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = 3000;

// Serve static HTML files
app.use(express.static(path.join(__dirname, 'html')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve SQL files as plain text
app.get('/sql/:file', (req, res) => {
  const filePath = path.join(__dirname, 'sql', req.params.file);
  if (fs.existsSync(filePath)) {
    res.type('text/plain').send(fs.readFileSync(filePath, 'utf8'));
  } else {
    res.status(404).send('File not found');
  }
});

// Serve PHP files as plain text (php-wasm integration point)
app.get('/php/:file', (req, res) => {
  const filePath = path.join(__dirname, 'php', req.params.file);
  if (fs.existsSync(filePath)) {
    res.type('text/plain').send(fs.readFileSync(filePath, 'utf8'));
  } else {
    res.status(404).send('File not found');
  }
});

// Index route
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, 'html', 'forms', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send('<h1>LAMPForge Project</h1><p>Add entities to the canvas to generate your application.</p>');
  }
});

app.listen(PORT, () => {
  console.log(\`LAMPForge server running on port \${PORT}\`);
});
`;

  return {
    title: "LAMPForge Project",
    description: "Generated from architectural canvas",
    template: "node",
    files: {
      "package.json": embeddedPackageJson,
      "server.js": serverJs,
      ...files,
    },
  };
}

/**
 * Generates the default starter files when the canvas is empty.
 */
export function getDefaultFiles(): Record<string, string> {
  return {
    "sql/schema.sql": `-- LAMPForge Auto-Generated Schema
-- Generated from architectural canvas

-- Add entities to the canvas to generate SQL here
`,
    "php/db_connect.php": `<?php
// LAMPForge Database Connection
$host = 'localhost';
$dbname = 'lampforge_db';
$user = 'root';
$pass = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    die("Connection failed: " . $e->getMessage());
}
?>
`,
    "html/forms/index.html": `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LAMPForge App</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body>
<nav class="navbar navbar-dark bg-dark mb-4">
  <div class="container"><a class="navbar-brand" href="#">LAMPForge App</a></div>
</nav>
<div class="container">
    <h1>LAMPForge Generated Application</h1>
    <p class="text-muted">Add entities to the canvas to generate your application.</p>
</div>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
`,
  };
}
