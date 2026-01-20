"use client";

import { useRef, useCallback, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Plus, Layers, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";
import { TerminalWindow } from "./TerminalWindow";
import type {
  TerminalWindow as TerminalWindowType,
  TerminalSession,
  WindowPosition,
  WorkspaceLayout,
} from "@/lib/terminal/types";
import { generateId } from "@/lib/utils";

interface WindowManagerProps {
  workspaceId: string;
  authToken?: string;
  className?: string;
}

const DEFAULT_WINDOW_SIZE = { width: 800, height: 500 };
const WINDOW_OFFSET = 30;

export function WindowManager({ workspaceId, authToken, className }: WindowManagerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<WorkspaceLayout>({
    windows: [],
    activeWindowId: null,
  });
  const [sessions, setSessions] = useState<Map<string, TerminalSession>>(new Map());
  const [nextZIndex, setNextZIndex] = useState(1);

  // Create a new terminal window
  const createWindow = useCallback(() => {
    const sessionId = generateId("session");
    const windowId = generateId("window");

    // Calculate position for new window
    const windowCount = layout.windows.length;
    const offset = (windowCount % 5) * WINDOW_OFFSET;

    const newSession: TerminalSession = {
      id: sessionId,
      workspaceId,
      name: `Terminal ${windowCount + 1}`,
      status: "connected",
      cols: 120,
      rows: 40,
    };

    const newWindow: TerminalWindowType = {
      id: windowId,
      sessionId,
      title: newSession.name,
      position: {
        x: 50 + offset,
        y: 50 + offset,
        width: DEFAULT_WINDOW_SIZE.width,
        height: DEFAULT_WINDOW_SIZE.height,
        zIndex: nextZIndex,
        isMinimized: false,
        isMaximized: false,
      },
    };

    setSessions((prev) => new Map(prev).set(sessionId, newSession));
    setLayout((prev) => ({
      windows: [...prev.windows, newWindow],
      activeWindowId: windowId,
    }));
    setNextZIndex((z) => z + 1);
  }, [layout.windows.length, nextZIndex, workspaceId]);

  // Close a window
  const closeWindow = useCallback((windowId: string) => {
    setLayout((prev) => {
      const window = prev.windows.find((w) => w.id === windowId);
      if (window) {
        setSessions((sessions) => {
          const newSessions = new Map(sessions);
          newSessions.delete(window.sessionId);
          return newSessions;
        });
      }

      const newWindows = prev.windows.filter((w) => w.id !== windowId);
      return {
        windows: newWindows,
        activeWindowId:
          prev.activeWindowId === windowId
            ? newWindows[newWindows.length - 1]?.id ?? null
            : prev.activeWindowId,
      };
    });
  }, []);

  // Focus a window (bring to front)
  const focusWindow = useCallback((windowId: string) => {
    setLayout((prev) => ({
      ...prev,
      activeWindowId: windowId,
      windows: prev.windows.map((w) =>
        w.id === windowId
          ? { ...w, position: { ...w.position, zIndex: nextZIndex } }
          : w
      ),
    }));
    setNextZIndex((z) => z + 1);
  }, [nextZIndex]);

  // Minimize a window
  const minimizeWindow = useCallback((windowId: string) => {
    setLayout((prev) => ({
      ...prev,
      windows: prev.windows.map((w) =>
        w.id === windowId
          ? { ...w, position: { ...w.position, isMinimized: true, isMaximized: false } }
          : w
      ),
    }));
  }, []);

  // Maximize/restore a window
  const toggleMaximize = useCallback((windowId: string) => {
    setLayout((prev) => ({
      ...prev,
      windows: prev.windows.map((w) =>
        w.id === windowId
          ? { ...w, position: { ...w.position, isMaximized: !w.position.isMaximized } }
          : w
      ),
    }));
  }, []);

  // Update window position
  const updateWindowPosition = useCallback(
    (windowId: string, position: Partial<WindowPosition>) => {
      setLayout((prev) => ({
        ...prev,
        windows: prev.windows.map((w) =>
          w.id === windowId
            ? { ...w, position: { ...w.position, ...position } }
            : w
        ),
      }));
    },
    []
  );

  // Restore minimized window
  const restoreWindow = useCallback((windowId: string) => {
    setLayout((prev) => ({
      ...prev,
      activeWindowId: windowId,
      windows: prev.windows.map((w) =>
        w.id === windowId
          ? { ...w, position: { ...w.position, isMinimized: false, zIndex: nextZIndex } }
          : w
      ),
    }));
    setNextZIndex((z) => z + 1);
  }, [nextZIndex]);

  const minimizedWindows = layout.windows.filter((w) => w.position.isMinimized);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full h-full min-h-screen overflow-hidden",
        "bg-gradient-to-br from-[#0a0a0f] via-[#0d0d14] to-[#0a0a0f]",
        className
      )}
    >
      {/* Background grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)
          `,
          backgroundSize: "50px 50px",
        }}
      />

      {/* Floating windows */}
      <AnimatePresence>
        {layout.windows.map((window) => {
          const session = sessions.get(window.sessionId);
          if (!session) return null;

          return (
            <TerminalWindow
              key={window.id}
              window={window}
              session={session}
              workspaceId={workspaceId}
              authToken={authToken}
              isActive={layout.activeWindowId === window.id}
              onClose={() => closeWindow(window.id)}
              onFocus={() => focusWindow(window.id)}
              onMinimize={() => minimizeWindow(window.id)}
              onMaximize={() => toggleMaximize(window.id)}
              onPositionChange={(pos) => updateWindowPosition(window.id, pos)}
              containerRef={containerRef}
            />
          );
        })}
      </AnimatePresence>

      {/* Empty state */}
      {layout.windows.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <Terminal className="w-10 h-10 text-[#22d3ee]" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">No terminals open</h3>
              <p className="text-white/50 max-w-sm">
                Click the button below to open a new terminal window
              </p>
            </div>
            <button
              onClick={createWindow}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#22d3ee] text-zinc-900 font-medium rounded-xl hover:bg-[#22d3ee]/90 transition-all active:scale-[0.98]"
            >
              <Plus className="w-5 h-5" />
              New Terminal
            </button>
          </div>
        </div>
      )}

      {/* Bottom dock for minimized windows */}
      {minimizedWindows.length > 0 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl">
          {minimizedWindows.map((window) => (
            <button
              key={window.id}
              onClick={() => restoreWindow(window.id)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
            >
              <Terminal className="w-4 h-4 text-[#22d3ee]" />
              <span className="text-sm text-white/80">{window.title}</span>
            </button>
          ))}
        </div>
      )}

      {/* Floating action button */}
      {layout.windows.length > 0 && (
        <button
          onClick={createWindow}
          className={cn(
            "absolute bottom-6 right-6 p-4",
            "bg-[#22d3ee] text-zinc-900 rounded-2xl",
            "shadow-lg shadow-[#22d3ee]/20",
            "hover:shadow-xl hover:shadow-[#22d3ee]/30",
            "hover:scale-105 active:scale-95",
            "transition-all duration-200"
          )}
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* Window count indicator */}
      {layout.windows.length > 0 && (
        <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl">
          <Layers className="w-4 h-4 text-white/60" />
          <span className="text-sm text-white/80">{layout.windows.length} windows</span>
        </div>
      )}
    </div>
  );
}
