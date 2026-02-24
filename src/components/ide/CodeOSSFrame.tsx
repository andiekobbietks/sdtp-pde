import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  useEffect,
  useCallback,
} from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  postToIframe,
  onIframeMessage,
  type IframeToParentMessage,
} from "@/lib/vscode-bridge";
import type { ScaffoldLevel } from "@/components/canvas/WebContainerEditor";

// ── Fallback: lazy-load the StackBlitz editor ──────────────────
import WebContainerEditor, {
  type WebContainerEditorHandle,
} from "@/components/canvas/WebContainerEditor";

export interface CodeOSSFrameHandle {
  applyFsDiff: (create: Record<string, string>, destroy?: string[]) => Promise<void>;
  openFile: (path: string) => Promise<void>;
  reload: () => void;
  setView: (view: "default" | "editor" | "preview") => Promise<void>;
}

interface CodeOSSFrameProps {
  scaffoldLevel?: ScaffoldLevel;
  onFileSaved?: (path: string, content: string) => void;
}

const CodeOSSFrame = forwardRef<CodeOSSFrameHandle, CodeOSSFrameProps>(
  ({ scaffoldLevel = "exploratory", onFileSaved }, ref) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const fallbackRef = useRef<WebContainerEditorHandle>(null);
    const [status, setStatus] = useState<"checking" | "codeoss" | "fallback">("checking");
    const [iframeReady, setIframeReady] = useState(false);

    // ── Check if Code - OSS assets exist ─────────────────────────
    useEffect(() => {
      let cancelled = false;
      fetch("/pde/index.html", { method: "HEAD" })
        .then((res) => {
          if (cancelled) return;
          setStatus(res.ok ? "codeoss" : "fallback");
        })
        .catch(() => {
          if (!cancelled) setStatus("fallback");
        });
      return () => { cancelled = true; };
    }, []);

    // ── Listen for iframe messages ───────────────────────────────
    useEffect(() => {
      if (status !== "codeoss") return;

      const cleanup = onIframeMessage((msg: IframeToParentMessage) => {
        if (msg.type === "lampforge:ready") {
          setIframeReady(true);
        } else if (msg.type === "lampforge:file-saved") {
          onFileSaved?.(msg.path, msg.content);
        }
      });

      return cleanup;
    }, [status, onFileSaved]);

    // ── Imperative handle ────────────────────────────────────────
    useImperativeHandle(ref, () => ({
      applyFsDiff: async (create, destroy = []) => {
        if (status === "fallback") {
          await fallbackRef.current?.applyFsDiff(create, destroy);
          return;
        }
        // Send each file to the Code - OSS iframe
        for (const [path, content] of Object.entries(create)) {
          postToIframe(iframeRef.current, {
            type: "lampforge:write-file",
            path,
            content,
          });
        }
      },

      openFile: async (path: string) => {
        if (status === "fallback") {
          await fallbackRef.current?.openFile(path);
          return;
        }
        postToIframe(iframeRef.current, {
          type: "lampforge:open-file",
          path,
        });
      },

      reload: () => {
        if (status === "fallback") return;
        iframeRef.current?.contentWindow?.location.reload();
      },

      setView: async (view) => {
        if (status === "fallback") {
          await fallbackRef.current?.setView(view);
        }
        // Code - OSS doesn't have a view toggle via postMessage yet
      },
    }));

    // ── Render ───────────────────────────────────────────────────

    if (status === "checking") {
      return (
        <div className="flex h-full w-full items-center justify-center bg-card">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-sm font-mono text-muted-foreground">
              Detecting IDE surface…
            </span>
          </div>
        </div>
      );
    }

    if (status === "fallback") {
      return (
        <WebContainerEditor
          ref={fallbackRef}
          scaffoldLevel={scaffoldLevel}
        />
      );
    }

    // Code - OSS iframe
    return (
      <div className="relative h-full w-full">
        {!iframeReady && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-card">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="text-sm font-mono text-muted-foreground">
                Booting Code - OSS…
              </span>
            </div>
          </div>
        )}
        <iframe
          ref={iframeRef}
          src="/pde/index.html"
          title="Code - OSS Editor"
          className="h-full w-full border-0"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          allow="cross-origin-isolated"
        />
      </div>
    );
  }
);

CodeOSSFrame.displayName = "CodeOSSFrame";

export default CodeOSSFrame;
