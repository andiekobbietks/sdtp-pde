import type { ForgeBlueprint } from "./forge-types";

// ── Message Types ──────────────────────────────────────────────

export type PDEMessageType =
  | "blueprint-update"
  | "terminal-output"
  | "sql-result"
  | "panel-closed"
  | "panel-undocked";

export interface PDEMessage {
  type: PDEMessageType;
  payload: unknown;
}

export interface BlueprintUpdateMessage extends PDEMessage {
  type: "blueprint-update";
  payload: { blueprint: ForgeBlueprint };
}

export interface TerminalOutputMessage extends PDEMessage {
  type: "terminal-output";
  payload: { lines: string[] };
}

export interface SqlResultMessage extends PDEMessage {
  type: "sql-result";
  payload: { columns: string[]; rows: string[][] };
}

export interface PanelClosedMessage extends PDEMessage {
  type: "panel-closed";
  payload: { panelId: string };
}

export interface PanelUndockedMessage extends PDEMessage {
  type: "panel-undocked";
  payload: { panelId: string };
}

export type PDEChannelMessage =
  | BlueprintUpdateMessage
  | TerminalOutputMessage
  | SqlResultMessage
  | PanelClosedMessage
  | PanelUndockedMessage;

const CHANNEL_NAME = "lampforge-pde";

export function createPDEChannel(): BroadcastChannel | null {
  try {
    return new BroadcastChannel(CHANNEL_NAME);
  } catch {
    console.warn("BroadcastChannel not supported");
    return null;
  }
}

export function broadcastMessage(
  channel: BroadcastChannel | null,
  message: PDEChannelMessage
): void {
  if (channel) {
    channel.postMessage(message);
  }
}

export function onMessage(
  channel: BroadcastChannel | null,
  handler: (msg: PDEChannelMessage) => void
): () => void {
  if (!channel) return () => {};

  const listener = (event: MessageEvent<PDEChannelMessage>) => {
    handler(event.data);
  };

  channel.addEventListener("message", listener);
  return () => channel.removeEventListener("message", listener);
}
