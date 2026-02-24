// ── VS Code Bridge: PostMessage Protocol ───────────────────────
// Defines the communication protocol between the PDE parent and
// the Code - OSS iframe at /pde/index.html.

// ── Parent → iframe messages ───────────────────────────────────

export interface OpenFileMessage {
  type: "lampforge:open-file";
  path: string;
}

export interface WriteFileMessage {
  type: "lampforge:write-file";
  path: string;
  content: string;
}

export interface SetThemeMessage {
  type: "lampforge:set-theme";
  theme: "vs-dark" | "vs-light";
}

export type ParentToIframeMessage =
  | OpenFileMessage
  | WriteFileMessage
  | SetThemeMessage;

// ── iframe → Parent messages ───────────────────────────────────

export interface ReadyMessage {
  type: "lampforge:ready";
}

export interface FileSavedMessage {
  type: "lampforge:file-saved";
  path: string;
  content: string;
}

export type IframeToParentMessage = ReadyMessage | FileSavedMessage;

// ── All messages ───────────────────────────────────────────────

export type VSCodeBridgeMessage = ParentToIframeMessage | IframeToParentMessage;

// ── Helpers ────────────────────────────────────────────────────

const LAMPFORGE_PREFIX = "lampforge:";

export function isLampforgeMessage(data: unknown): data is VSCodeBridgeMessage {
  return (
    typeof data === "object" &&
    data !== null &&
    "type" in data &&
    typeof (data as { type: string }).type === "string" &&
    (data as { type: string }).type.startsWith(LAMPFORGE_PREFIX)
  );
}

export function postToIframe(
  iframe: HTMLIFrameElement | null,
  message: ParentToIframeMessage
): void {
  if (iframe?.contentWindow) {
    iframe.contentWindow.postMessage(message, "*");
  }
}

export function onIframeMessage(
  handler: (msg: IframeToParentMessage) => void
): () => void {
  const listener = (event: MessageEvent) => {
    if (isLampforgeMessage(event.data)) {
      const msg = event.data;
      if (msg.type === "lampforge:ready" || msg.type === "lampforge:file-saved") {
        handler(msg as IframeToParentMessage);
      }
    }
  };
  window.addEventListener("message", listener);
  return () => window.removeEventListener("message", listener);
}
