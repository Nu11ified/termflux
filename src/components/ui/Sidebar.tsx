"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Terminal,
  LayoutGrid,
  Package,
  GitBranch,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Plus,
  Folder,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  className?: string;
}

const navItems = [
  { href: "/dashboard", icon: LayoutGrid, label: "Dashboard" },
  { href: "/dashboard/workspaces", icon: Terminal, label: "Workspaces" },
  { href: "/dashboard/apps", icon: Package, label: "Apps" },
  { href: "/dashboard/workflows", icon: GitBranch, label: "Workflows" },
  { href: "/dashboard/team", icon: Users, label: "Team" },
];

const bottomNavItems = [
  { href: "/dashboard/settings", icon: Settings, label: "Settings" },
];

export function Sidebar({ className }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 72 : 240 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className={cn(
        "fixed left-0 top-0 h-screen z-40",
        "flex flex-col",
        "bg-[#0a0a0f]/80 backdrop-blur-xl",
        "border-r border-white/5",
        className
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 p-4 border-b border-white/5">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#22d3ee] to-[#3b82f6] flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        {!isCollapsed && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-lg font-semibold text-white tracking-tight"
          >
            Termflux
          </motion.span>
        )}
      </div>

      {/* New Workspace Button */}
      <div className="p-3">
        <Link
          href="/dashboard/workspaces/new"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl",
            "bg-[#22d3ee] text-zinc-900",
            "hover:bg-[#22d3ee]/90 transition-all",
            "font-medium",
            isCollapsed && "justify-center"
          )}
        >
          <Plus className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span>New Workspace</span>}
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl",
                "transition-all duration-200",
                isActive
                  ? "bg-white/10 text-white"
                  : "text-white/60 hover:text-white hover:bg-white/5",
                isCollapsed && "justify-center"
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && <span className="font-medium">{item.label}</span>}
              {isActive && !isCollapsed && (
                <motion.div
                  layoutId="activeIndicator"
                  className="ml-auto w-1.5 h-1.5 rounded-full bg-[#22d3ee]"
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Navigation */}
      <div className="p-3 border-t border-white/5 space-y-1">
        {bottomNavItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl",
                "transition-all duration-200",
                isActive
                  ? "bg-white/10 text-white"
                  : "text-white/60 hover:text-white hover:bg-white/5",
                isCollapsed && "justify-center"
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && <span className="font-medium">{item.label}</span>}
            </Link>
          );
        })}

        <button
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl w-full",
            "text-white/60 hover:text-red-400 hover:bg-red-500/10",
            "transition-all duration-200",
            isCollapsed && "justify-center"
          )}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span className="font-medium">Logout</span>}
        </button>
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={cn(
          "absolute -right-3 top-1/2 -translate-y-1/2",
          "w-6 h-6 rounded-full",
          "bg-[#1a1a24] border border-white/10",
          "flex items-center justify-center",
          "text-white/60 hover:text-white hover:border-white/20",
          "transition-all duration-200",
          "z-50"
        )}
      >
        {isCollapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </button>
    </motion.aside>
  );
}
