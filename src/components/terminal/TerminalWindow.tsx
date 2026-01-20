"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, Minus, Maximize2, Minimize2, GripVertical, Terminal as TerminalIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Terminal } from "./Terminal";
import type { TerminalWindow as TerminalWindowType, TerminalSession, WindowPosition } from "@/lib/terminal/types";

interface TerminalWindowProps {
  window: TerminalWindowType;
  session: TerminalSession;
  workspaceId: string;
  authToken?: string;
  isActive: boolean;
  onClose: () => void;
  onFocus: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  onPositionChange: (position: Partial<WindowPosition>) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function TerminalWindow({
  window,
  session,
  workspaceId,
  authToken,
  isActive,
  onClose,
  onFocus,
  onMinimize,
  onMaximize,
  onPositionChange,
  containerRef,
}: TerminalWindowProps) {
  const windowRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, windowX: 0, windowY: 0 });
  const resizeStart = useRef({ x: 0, y: 0, width: 0, height: 0 });

  const { position } = window;

  // Handle drag
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      windowX: position.x,
      windowY: position.y,
    };
    onFocus();
  }, [position.x, position.y, onFocus]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      onPositionChange({
        x: dragStart.current.windowX + dx,
        y: dragStart.current.windowY + dy,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, onPositionChange]);

  // Handle resize
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeStart.current = {
      x: e.clientX,
      y: e.clientY,
      width: position.width,
      height: position.height,
    };
  }, [position.width, position.height]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - resizeStart.current.x;
      const dy = e.clientY - resizeStart.current.y;
      onPositionChange({
        width: Math.max(400, resizeStart.current.width + dx),
        height: Math.max(300, resizeStart.current.height + dy),
      });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, onPositionChange]);

  if (position.isMinimized) {
    return null;
  }

  const windowStyle = position.isMaximized
    ? { top: 0, left: 0, width: "100%", height: "100%", zIndex: position.zIndex }
    : {
        top: position.y,
        left: position.x,
        width: position.width,
        height: position.height,
        zIndex: position.zIndex,
      };

  return (
    <motion.div
      ref={windowRef}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      style={windowStyle}
      className={cn(
        "absolute flex flex-col",
        "bg-[#0d0d12]/95 backdrop-blur-xl",
        "border rounded-xl overflow-hidden",
        "shadow-2xl shadow-black/50",
        isActive ? "border-[#22d3ee]/30 ring-1 ring-[#22d3ee]/20" : "border-white/10",
        isDragging && "cursor-grabbing",
        !position.isMaximized && "resize"
      )}
      onMouseDown={onFocus}
    >
      {/* Title bar */}
      <div
        className={cn(
          "flex items-center justify-between px-3 py-2",
          "bg-white/5 border-b border-white/10",
          "select-none cursor-grab",
          isDragging && "cursor-grabbing"
        )}
        onMouseDown={handleDragStart}
      >
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-white/30" />
          <TerminalIcon className="w-4 h-4 text-[#22d3ee]" />
          <span className="text-sm font-medium text-white/80">{window.title}</span>
          <span className={cn(
            "w-2 h-2 rounded-full",
            session.status === "connected" ? "bg-green-500" :
            session.status === "connecting" ? "bg-yellow-500 animate-pulse" : "bg-red-500"
          )} />
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onMinimize}
            className="p-1.5 rounded-md hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onMaximize}
            className="p-1.5 rounded-md hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            {position.isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-red-500/20 text-white/60 hover:text-red-400 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Terminal content */}
      <div className="flex-1 overflow-hidden">
        <Terminal
          session={session}
          workspaceId={workspaceId}
          authToken={authToken}
          focused={isActive}
          className="w-full h-full"
        />
      </div>

      {/* Resize handle */}
      {!position.isMaximized && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
          onMouseDown={handleResizeStart}
        >
          <svg
            className="w-4 h-4 text-white/20"
            viewBox="0 0 16 16"
            fill="currentColor"
          >
            <path d="M14 14H12V12H14V14ZM14 10H12V8H14V10ZM10 14H8V12H10V14Z" />
          </svg>
        </div>
      )}
    </motion.div>
  );
}
