import { useState, useEffect, useRef, useCallback } from "react";
import initSqlJs, { type Database } from "sql.js";
import CodeEditor from "@/components/canvas/CodeEditor";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Play, Clock, Database as DatabaseIcon, ChevronLeft, ChevronRight } from "lucide-react";
import type { ForgeBlueprint } from "@/lib/forge-types";
import { generateDDL } from "@/lib/sql-generator";

interface SQLWorkbenchPanelProps {
  blueprint: ForgeBlueprint | null;
  onLog?: (entry: { type: string; title: string; description: string }) => void;
}

interface QueryResult {
  columns: string[];
  rows: string[][];
}

interface HistoryEntry {
  sql: string;
  timestamp: string;
  success: boolean;
}

// ── Adapt MySQL DDL for SQLite ────────────────────────────────

function adaptDDLForSQLite(ddl: string): string {
  return ddl
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim().toUpperCase();
      if (trimmed.startsWith("CREATE DATABASE")) return false;
      if (trimmed.startsWith("USE ")) return false;
      if (trimmed.startsWith("--")) return true;
      return true;
    })
    .join("\n")
    // Remove ENGINE=InnoDB and charset
    .replace(/\)\s*ENGINE=InnoDB[^;]*/gi, ")")
    // Remove AUTO_INCREMENT from field definitions
    .replace(/\bAUTO_INCREMENT\b/gi, "")
    // Remove ON UPDATE CURRENT_TIMESTAMP
    .replace(/ON UPDATE CURRENT_TIMESTAMP/gi, "")
    // Convert backtick quoting to no quoting
    .replace(/`/g, "")
    // Clean double spaces
    .replace(/  +/g, " ")
    // Clean trailing commas before closing paren
    .replace(/,\s*\)/g, "\n)");
}

const SQLWorkbenchPanel = ({ blueprint, onLog }: SQLWorkbenchPanelProps) => {
  const [db, setDb] = useState<Database | null>(null);
  const [sql, setSql] = useState("SELECT 1 AS hello;");
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tables, setTables] = useState<string[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const dbRef = useRef<Database | null>(null);
  const seededRef = useRef(false);

  // ── Initialize sql.js ─────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    initSqlJs({
      locateFile: (file: string) => `https://sql.js.org/dist/${file}`,
    }).then((SQL) => {
      if (cancelled) return;
      const database = new SQL.Database();
      dbRef.current = database;
      setDb(database);
      setIsLoading(false);
    }).catch((err) => {
      console.error("Failed to init sql.js:", err);
      setError("Failed to initialize SQL engine");
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
      dbRef.current?.close();
    };
  }, []);

  // ── Seed from blueprint ───────────────────────────────────────

  useEffect(() => {
    if (!db || !blueprint || seededRef.current) return;
    seededRef.current = true;

    const ddl = generateDDL(blueprint);
    const adapted = adaptDDLForSQLite(ddl);

    try {
      // Execute each statement separately
      const statements = adapted
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && !s.startsWith("--"));

      for (const stmt of statements) {
        try {
          db.run(stmt + ";");
        } catch (e) {
          console.warn("DDL statement skipped:", stmt, e);
        }
      }

      refreshTables();
      onLog?.({ type: "sql", title: "Schema Seeded", description: `DDL executed: ${blueprint.entities.length} tables created` });
    } catch (err) {
      console.error("Failed to seed DDL:", err);
    }
  }, [db, blueprint]);

  // ── Refresh table list ────────────────────────────────────────

  const refreshTables = useCallback(() => {
    if (!dbRef.current) return;
    try {
      const res = dbRef.current.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;");
      if (res.length > 0) {
        setTables(res[0].values.map((v) => String(v[0])));
      }
    } catch {
      // ignore
    }
  }, []);

  // ── Execute query ─────────────────────────────────────────────

  const runQuery = useCallback(() => {
    if (!dbRef.current || !sql.trim()) return;

    setError(null);
    setResult(null);

    try {
      const results = dbRef.current.exec(sql);
      if (results.length > 0) {
        const first = results[0];
        setResult({
          columns: first.columns,
          rows: first.values.map((row) => row.map((v) => (v === null ? "NULL" : String(v)))),
        });
      } else {
        setResult({ columns: ["Result"], rows: [["Query executed successfully. No rows returned."]] });
      }

      setHistory((prev) => [
        { sql: sql.trim(), timestamp: new Date().toISOString(), success: true },
        ...prev.slice(0, 49),
      ]);
      refreshTables();

      onLog?.({ type: "sql", title: "Query Executed", description: sql.trim().slice(0, 100) });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Query failed";
      setError(msg);
      setHistory((prev) => [
        { sql: sql.trim(), timestamp: new Date().toISOString(), success: false },
        ...prev.slice(0, 49),
      ]);
    }
  }, [sql, refreshTables, onLog]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-card">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-xs text-muted-foreground font-mono">Loading SQL engine…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-card">
      {/* Schema Explorer Sidebar */}
      {sidebarOpen && (
        <div className="flex w-48 flex-col border-r border-border">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tables</span>
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setSidebarOpen(false)}>
              <ChevronLeft className="h-3 w-3" />
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="space-y-0.5 p-2">
              {tables.length === 0 ? (
                <p className="px-2 py-4 text-xs text-muted-foreground text-center">No tables yet</p>
              ) : (
                tables.map((table) => (
                  <button
                    key={table}
                    onClick={() => setSql(`SELECT * FROM ${table};`)}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs font-mono text-foreground transition-colors hover:bg-accent"
                  >
                    <DatabaseIcon className="h-3 w-3 text-forge-blueprint" />
                    {table}
                  </button>
                ))
              )}
            </div>
          </ScrollArea>

          {/* History */}
          <div className="border-t border-border">
            <div className="px-3 py-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">History</span>
            </div>
            <ScrollArea className="max-h-32">
              <div className="space-y-0.5 px-2 pb-2">
                {history.slice(0, 10).map((h, i) => (
                  <button
                    key={i}
                    onClick={() => setSql(h.sql)}
                    className="flex w-full items-start gap-1.5 rounded px-2 py-1 text-left transition-colors hover:bg-accent"
                  >
                    <Clock className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                    <span className={`truncate text-[10px] font-mono ${h.success ? "text-foreground" : "text-destructive"}`}>
                      {h.sql.slice(0, 50)}
                    </span>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}

      {/* Main Area */}
      <div className="flex flex-1 flex-col">
        {/* Toolbar */}
        <div className="flex items-center gap-2 border-b border-border px-3 py-1.5">
          {!sidebarOpen && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSidebarOpen(true)}>
              <ChevronRight className="h-3 w-3" />
            </Button>
          )}
          <span className="text-xs font-mono text-muted-foreground">SQL Workbench</span>
          <div className="flex-1" />
          <Button size="sm" onClick={runQuery} className="h-7 gap-1.5 text-xs">
            <Play className="h-3 w-3" />
            Run
          </Button>
        </div>

        {/* Editor + Results split */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Editor */}
          <div className="h-1/2 min-h-[80px] border-b border-border">
            <CodeEditor value={sql} language="sql" onChange={(v) => setSql(v)} />
          </div>

          {/* Results */}
          <div className="flex-1 overflow-auto">
            {error && (
              <div className="p-3">
                <div className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive font-mono">
                  {error}
                </div>
              </div>
            )}
            {result && (
              <div className="p-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {result.columns.map((col) => (
                        <TableHead key={col} className="text-xs font-mono h-8">
                          {col}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.rows.map((row, i) => (
                      <TableRow key={i}>
                        {row.map((cell, j) => (
                          <TableCell key={j} className="text-xs font-mono py-1.5">
                            {cell}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="mt-2 px-2 text-[10px] text-muted-foreground">
                  {result.rows.length} row{result.rows.length !== 1 ? "s" : ""} returned
                </div>
              </div>
            )}
            {!error && !result && (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                Run a query to see results
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SQLWorkbenchPanel;
