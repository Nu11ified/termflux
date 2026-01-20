"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import type { TerminalSession } from "@/lib/terminal/types";

// WebSocket message types
interface WSMessage {
  type: "input" | "output" | "resize" | "ping" | "pong" | "error" | "ready" | "reconnect";
  data?: string;
  cols?: number;
  rows?: number;
  sessionId?: string;
  error?: string;
}

interface TerminalProps {
  session: TerminalSession;
  workspaceId: string;
  authToken?: string;
  wsUrl?: string;
  onResize?: (cols: number, rows: number) => void;
  onData?: (data: string) => void;
  onReady?: (sessionId: string) => void;
  onError?: (error: string) => void;
  onDisconnect?: () => void;
  className?: string;
  focused?: boolean;
}

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

export function Terminal({
  session,
  workspaceId,
  authToken,
  wsUrl,
  onResize,
  onData,
  onReady,
  onError,
  onDisconnect,
  className,
  focused = true,
}: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<import("@xterm/xterm").Terminal | null>(null);
  const fitAddonRef = useRef<import("@xterm/addon-fit").FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("connecting");
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const maxReconnectAttempts = 5;
  const reconnectDelay = 2000;

  // Build WebSocket URL
  const getWsUrl = useCallback(() => {
    if (wsUrl) return wsUrl;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const baseUrl = `${protocol}//${host}/ws/terminal`;
    const params = new URLSearchParams({
      workspaceId,
      ...(session.id && { sessionId: session.id }),
      ...(authToken && { token: authToken }),
    });

    return `${baseUrl}?${params.toString()}`;
  }, [wsUrl, workspaceId, session.id, authToken]);

  // Connect WebSocket
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const url = getWsUrl();
    console.log("Connecting to WebSocket:", url);

    const ws = new WebSocket(url);
    wsRef.current = ws;
    setConnectionStatus("connecting");

    ws.onopen = () => {
      console.log("WebSocket connected");
      setConnectionStatus("connected");
      setReconnectAttempts(0);

      // Start ping interval for keepalive
      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping" }));
        }
      }, 25000);
    };

    ws.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data);

        switch (message.type) {
          case "output":
            if (message.data && xtermRef.current) {
              xtermRef.current.write(message.data);
            }
            break;

          case "ready":
            if (message.sessionId) {
              onReady?.(message.sessionId);
            }
            break;

          case "reconnect":
            // Received buffered output on reconnection
            if (message.data && xtermRef.current) {
              xtermRef.current.write(message.data);
            }
            break;

          case "error":
            console.error("WebSocket error message:", message.error);
            onError?.(message.error || "Unknown error");
            break;

          case "pong":
            // Keepalive acknowledged
            break;
        }
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    ws.onclose = (event) => {
      console.log("WebSocket closed:", event.code, event.reason);
      setConnectionStatus("disconnected");

      // Clear ping interval
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }

      // Attempt reconnection if not intentionally closed
      if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
        reconnectTimeoutRef.current = setTimeout(() => {
          setReconnectAttempts((prev) => prev + 1);
          connectWebSocket();
        }, reconnectDelay * Math.pow(2, reconnectAttempts));
      } else {
        onDisconnect?.();
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setConnectionStatus("error");
    };
  }, [getWsUrl, onReady, onError, onDisconnect, reconnectAttempts]);

  // Send data to WebSocket
  const sendToWebSocket = useCallback((type: WSMessage["type"], data?: string, cols?: number, rows?: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message: WSMessage = { type };
      if (data !== undefined) message.data = data;
      if (cols !== undefined) message.cols = cols;
      if (rows !== undefined) message.rows = rows;
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  // Initialize terminal
  useEffect(() => {
    if (!terminalRef.current || xtermRef.current) return;

    const initTerminal = async () => {
      const { Terminal } = await import("@xterm/xterm");
      const { FitAddon } = await import("@xterm/addon-fit");
      const { WebLinksAddon } = await import("@xterm/addon-web-links");

      // @ts-expect-error CSS import
      await import("@xterm/xterm/css/xterm.css");

      const term = new Terminal({
        cursorBlink: true,
        cursorStyle: "bar",
        fontSize: 14,
        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
        fontWeight: "400",
        letterSpacing: 0,
        lineHeight: 1.2,
        theme: {
          background: "#0d0d12",
          foreground: "#e4e4e7",
          cursor: "#22d3ee",
          cursorAccent: "#0d0d12",
          selectionBackground: "rgba(34, 211, 238, 0.3)",
          selectionForeground: "#ffffff",
          black: "#09090b",
          red: "#ef4444",
          green: "#22c55e",
          yellow: "#eab308",
          blue: "#3b82f6",
          magenta: "#a855f7",
          cyan: "#22d3ee",
          white: "#e4e4e7",
          brightBlack: "#52525b",
          brightRed: "#f87171",
          brightGreen: "#4ade80",
          brightYellow: "#facc15",
          brightBlue: "#60a5fa",
          brightMagenta: "#c084fc",
          brightCyan: "#67e8f9",
          brightWhite: "#fafafa",
        },
        allowTransparency: true,
        scrollback: 10000,
        tabStopWidth: 4,
      });

      const fitAddon = new FitAddon();
      const webLinksAddon = new WebLinksAddon();

      term.loadAddon(fitAddon);
      term.loadAddon(webLinksAddon);

      term.open(terminalRef.current!);
      fitAddon.fit();

      xtermRef.current = term;
      fitAddonRef.current = fitAddon;

      // Handle input - send to WebSocket
      term.onData((data) => {
        sendToWebSocket("input", data);
        onData?.(data);
      });

      // Report initial size
      const { cols, rows } = term;
      onResize?.(cols, rows);

      setIsLoaded(true);

      // Connect to WebSocket after terminal is ready
      connectWebSocket();
    };

    initTerminal();

    return () => {
      // Cleanup
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close(1000, "Component unmounting");
      }
      xtermRef.current?.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
      wsRef.current = null;
    };
  }, [onData, onResize, sendToWebSocket, connectWebSocket]);

  // Handle resize
  useEffect(() => {
    if (!fitAddonRef.current || !xtermRef.current) return;

    const handleResize = () => {
      if (fitAddonRef.current && xtermRef.current) {
        fitAddonRef.current.fit();
        const { cols, rows } = xtermRef.current;
        sendToWebSocket("resize", undefined, cols, rows);
        onResize?.(cols, rows);
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    if (terminalRef.current) {
      resizeObserver.observe(terminalRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [isLoaded, onResize, sendToWebSocket]);

  // Handle focus
  useEffect(() => {
    if (focused && xtermRef.current) {
      xtermRef.current.focus();
    }
  }, [focused]);

  return (
    <div className={cn("relative w-full h-full min-h-[200px]", className)}>
      {/* Connection status indicator */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
        <div
          className={cn(
            "w-2 h-2 rounded-full",
            connectionStatus === "connected" && "bg-green-500",
            connectionStatus === "connecting" && "bg-yellow-500 animate-pulse",
            connectionStatus === "disconnected" && "bg-gray-500",
            connectionStatus === "error" && "bg-red-500"
          )}
        />
        {connectionStatus !== "connected" && (
          <span className="text-xs text-zinc-400">
            {connectionStatus === "connecting" && "Connecting..."}
            {connectionStatus === "disconnected" && reconnectAttempts > 0 && `Reconnecting (${reconnectAttempts}/${maxReconnectAttempts})...`}
            {connectionStatus === "disconnected" && reconnectAttempts === 0 && "Disconnected"}
            {connectionStatus === "error" && "Connection error"}
          </span>
        )}
      </div>

      <div
        ref={terminalRef}
        className="w-full h-full bg-[#0d0d12] rounded-lg overflow-hidden"
      />
    </div>
  );
}
