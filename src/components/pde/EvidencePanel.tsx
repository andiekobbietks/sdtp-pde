import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Camera, Database, Code, FileText } from "lucide-react";

export interface LogEntry {
  id: string;
  type: "screenshot" | "sql" | "code" | "milestone";
  title: string;
  description: string;
  timestamp: string;
  stage: string;
}

interface EvidencePanelProps {
  logs: LogEntry[];
}

const stageColors: Record<string, string> = {
  Analysis: "bg-forge-oracle/10 text-forge-oracle border-forge-oracle/30",
  Design: "bg-forge-blueprint/10 text-forge-blueprint border-forge-blueprint/30",
  Implementation: "bg-forge-transaction/10 text-forge-transaction border-forge-transaction/30",
  Testing: "bg-forge-plumbing/10 text-forge-plumbing border-forge-plumbing/30",
  Evaluation: "bg-forge-forge/10 text-forge-forge border-forge-forge/30",
};

const typeIcons: Record<string, typeof Camera> = {
  screenshot: Camera,
  sql: Database,
  code: Code,
  milestone: FileText,
};

const EvidencePanel = ({ logs }: EvidencePanelProps) => {
  if (logs.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No evidence logged yet. Actions in the PDE are captured automatically.
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4">
        <div className="relative space-y-3">
          <div className="absolute left-[15px] top-0 bottom-0 w-px bg-border" />

          {logs.map((log) => {
            const Icon = typeIcons[log.type] || FileText;
            return (
              <div key={log.id} className="relative flex gap-3 pl-8">
                <div className="absolute left-[10px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary" />

                <Card className="flex-1 border-border bg-card py-0">
                  <CardHeader className="pb-1 pt-2 px-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-1.5 text-xs">
                        <Icon className="h-3 w-3 text-muted-foreground" />
                        {log.title}
                      </CardTitle>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${stageColors[log.stage] || ""}`}>
                          {log.stage}
                        </Badge>
                        <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
                          <Clock className="h-2.5 w-2.5" />
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-2 px-3">
                    {log.type === "sql" ? (
                      <code className="block rounded bg-surface-code p-1.5 font-mono text-[10px] text-terminal-fg">
                        {log.description}
                      </code>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">{log.description}</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      </div>
    </ScrollArea>
  );
};

export default EvidencePanel;
