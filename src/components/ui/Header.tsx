"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Search,
  User,
  Settings,
  LogOut,
  ChevronDown,
  Command,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface HeaderProps {
  user?: {
    name: string;
    email: string;
    avatarUrl?: string;
  };
  className?: string;
}

export function Header({ user, className }: HeaderProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <header
      className={cn(
        "h-16 px-6",
        "flex items-center justify-between",
        "bg-[#0a0a0f]/50 backdrop-blur-xl",
        "border-b border-white/5",
        className
      )}
    >
      {/* Search */}
      <div className="flex-1 max-w-xl">
        <button
          onClick={() => setIsSearchOpen(true)}
          className={cn(
            "flex items-center gap-3 w-full px-4 py-2.5 rounded-xl",
            "bg-white/5 border border-white/5",
            "text-white/40 hover:text-white/60 hover:border-white/10",
            "transition-all duration-200"
          )}
        >
          <Search className="w-4 h-4" />
          <span className="text-sm">Search workspaces, apps...</span>
          <div className="ml-auto flex items-center gap-1 text-xs">
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/60">
              <Command className="w-3 h-3 inline" />
            </kbd>
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/60">K</kbd>
          </div>
        </button>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <button
          className={cn(
            "relative p-2.5 rounded-xl",
            "text-white/60 hover:text-white",
            "hover:bg-white/5",
            "transition-all duration-200"
          )}
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#22d3ee]" />
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-xl",
              "hover:bg-white/5",
              "transition-all duration-200"
            )}
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#22d3ee] to-[#3b82f6] flex items-center justify-center">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="w-full h-full rounded-lg object-cover" />
              ) : (
                <User className="w-4 h-4 text-white" />
              )}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-white">{user?.name || "User"}</p>
              <p className="text-xs text-white/50">{user?.email || "user@example.com"}</p>
            </div>
            <ChevronDown className={cn(
              "w-4 h-4 text-white/60 transition-transform",
              isUserMenuOpen && "rotate-180"
            )} />
          </button>

          <AnimatePresence>
            {isUserMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsUserMenuOpen(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className={cn(
                    "absolute right-0 top-full mt-2 z-50",
                    "w-56 p-2 rounded-xl",
                    "bg-[#1a1a24] border border-white/10",
                    "shadow-xl shadow-black/50"
                  )}
                >
                  <Link
                    href="/dashboard/settings"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    <span className="text-sm">Settings</span>
                  </Link>
                  <button
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/70 hover:text-red-400 hover:bg-red-500/10 transition-colors w-full"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm">Logout</span>
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Search Modal */}
      <AnimatePresence>
        {isSearchOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => setIsSearchOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className={cn(
                "fixed top-[20%] left-1/2 -translate-x-1/2 z-50",
                "w-full max-w-2xl p-4",
                "bg-[#1a1a24] border border-white/10 rounded-2xl",
                "shadow-2xl shadow-black/50"
              )}
            >
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
                <Search className="w-5 h-5 text-white/40" />
                <input
                  type="text"
                  placeholder="Search workspaces, apps, commands..."
                  className="flex-1 bg-transparent text-white placeholder-white/40 outline-none text-lg"
                  autoFocus
                />
                <kbd className="px-2 py-1 rounded bg-white/10 text-white/40 text-xs">ESC</kbd>
              </div>
              <div className="p-4 text-center text-white/40">
                <p>Start typing to search...</p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
