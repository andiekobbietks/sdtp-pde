import { useEffect, useRef, useImperativeHandle, forwardRef, useState } from "react";
import sdk, { type VM } from "@stackblitz/sdk";
import { buildProject, getDefaultFiles } from "@/lib/webcontainer-project";

export interface WebContainerEditorHandle {
  applyFsDiff: (create: Record<string, string>, destroy?: string[]) => Promise<void>;
  getFsSnapshot: () => Promise<Record<string, string> | undefined>;
  openFile: (path: string | string[]) => Promise<void>;
  setView: (view: "default" | "editor" | "preview") => Promise<void>;
  showSidebar: (visible: boolean) => Promise<void>;
  setCurrentFile: (path: string) => Promise<void>;
  getPreviewUrl: () => Promise<string | null>;
}

export type ScaffoldLevel = "exploratory" | "competent" | "exemplary" | "rad";

interface WebContainerEditorProps {
  files?: Record<string, string>;
  openFile?: string;
  scaffoldLevel?: ScaffoldLevel;
}

const WebContainerEditor = forwardRef<WebContainerEditorHandle, WebContainerEditorProps>(
  ({ files, openFile, scaffoldLevel = "exploratory" }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const vmRef = useRef<VM | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const mountedRef = useRef(false);

    const isRad = scaffoldLevel === "rad";

    useImperativeHandle(ref, () => ({
      applyFsDiff: async (create, destroy = []) => {
        if (vmRef.current) {
          await vmRef.current.applyFsDiff({ create, destroy });
        }
      },
      getFsSnapshot: async () => {
        if (vmRef.current) {
          return (await vmRef.current.getFsSnapshot()) as Record<string, string>;
        }
        return undefined;
      },
      openFile: async (path) => {
        if (vmRef.current) {
          await vmRef.current.editor.openFile(path);
        }
      },
      setView: async (view) => {
        if (vmRef.current) {
          await vmRef.current.editor.setView(view);
        }
      },
      showSidebar: async (visible) => {
        if (vmRef.current) {
          await vmRef.current.editor.showSidebar(visible);
        }
      },
      setCurrentFile: async (path) => {
        if (vmRef.current) {
          await vmRef.current.editor.setCurrentFile(path);
        }
      },
      getPreviewUrl: async () => {
        if (vmRef.current) {
          return vmRef.current.preview.getUrl();
        }
        return null;
      },
    }));

    useEffect(() => {
      if (mountedRef.current || !containerRef.current) return;
      mountedRef.current = true;

      const allFiles = { ...getDefaultFiles(), ...files };
      const project = buildProject(allFiles, scaffoldLevel);

      // Scaffold-aware embed options
      const embedOptions = isRad
        ? {
            theme: "dark" as const,
            view: "default" as const,         // editor + preview split
            hideExplorer: false,
            showSidebar: true,
            sidebarView: "project" as const,
            openFile: openFile || "sql/schema.sql,php/db_connect.php,html/forms/index.html",
            terminalHeight: 40,
            height: "100%" as const,
            crossOriginIsolated: true,
            startScript: "dev",
          }
        : {
            theme: "dark" as const,
            view: "editor" as const,          // editor only
            hideExplorer: true,
            showSidebar: false,
            openFile: openFile || "sql/schema.sql",
            terminalHeight: 25,
            height: "100%" as const,
            crossOriginIsolated: true,
          };

      sdk
        .embedProject(containerRef.current, project, embedOptions)
        .then((vm) => {
          vmRef.current = vm;
          setIsLoading(false);
        })
        .catch((err) => {
          console.error("Failed to boot WebContainer:", err);
          setIsLoading(false);
        });
    }, []); // mount once

    return (
      <div className="relative h-full w-full">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-card">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="text-sm text-muted-foreground font-mono">
                {isRad ? "Booting Codeflow IDE…" : "Booting WebContainer…"}
              </span>
            </div>
          </div>
        )}
        <div ref={containerRef} className="h-full w-full" />
      </div>
    );
  }
);

WebContainerEditor.displayName = "WebContainerEditor";

export default WebContainerEditor;
