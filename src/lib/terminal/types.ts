export interface TerminalMessage {
  type: "input" | "output" | "resize" | "ping" | "pong" | "error" | "connected" | "disconnected";
  sessionId: string;
  data?: string;
  cols?: number;
  rows?: number;
  error?: string;
}

export interface TerminalSession {
  id: string;
  workspaceId: string;
  name: string;
  status: "connecting" | "connected" | "disconnected" | "error";
  cols: number;
  rows: number;
}

export interface WindowPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  isMinimized: boolean;
  isMaximized: boolean;
}

export interface TerminalWindow {
  id: string;
  sessionId: string;
  title: string;
  position: WindowPosition;
}

export interface WorkspaceLayout {
  windows: TerminalWindow[];
  activeWindowId: string | null;
}
