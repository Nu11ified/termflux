"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Terminal,
  Package,
  GitBranch,
  Activity,
  Clock,
  ArrowUpRight,
  Plus,
  Zap,
  Server,
} from "lucide-react";
import { cn } from "@/lib/utils";

const stats = [
  { label: "Active Workspaces", value: "3", icon: Terminal, change: "+2 this week" },
  { label: "Installed Apps", value: "12", icon: Package, change: "+4 this month" },
  { label: "Workflow Runs", value: "47", icon: GitBranch, change: "+23 today" },
  { label: "Uptime", value: "99.9%", icon: Activity, change: "Last 30 days" },
];

const recentWorkspaces = [
  { id: "1", name: "termflux-api", status: "running", lastAccess: "2 min ago" },
  { id: "2", name: "frontend-v2", status: "stopped", lastAccess: "1 hour ago" },
  { id: "3", name: "data-pipeline", status: "running", lastAccess: "5 min ago" },
];

const quickActions = [
  { label: "New Workspace", href: "/dashboard/workspaces/new", icon: Plus },
  { label: "Browse Apps", href: "/dashboard/apps", icon: Package },
  { label: "View Workflows", href: "/dashboard/workflows", icon: GitBranch },
];

export default function DashboardPage() {
  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
          <p className="text-white/50 mt-1">Welcome back! Here's what's happening.</p>
        </div>
        <Link
          href="/dashboard/workspaces/new"
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl",
            "bg-[#22d3ee] text-zinc-900 font-medium",
            "hover:bg-[#22d3ee]/90 transition-all",
            "active:scale-[0.98]"
          )}
        >
          <Plus className="w-5 h-5" />
          New Workspace
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={cn(
              "p-5 rounded-2xl",
              "bg-white/5 border border-white/5",
              "hover:border-white/10 transition-all"
            )}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-white/5">
                <stat.icon className="w-5 h-5 text-[#22d3ee]" />
              </div>
              <span className="text-xs text-white/40">{stat.change}</span>
            </div>
            <p className="text-3xl font-semibold text-white mb-1">{stat.value}</p>
            <p className="text-sm text-white/50">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Workspaces */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white/5 border border-white/5">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">Recent Workspaces</h2>
            <Link
              href="/dashboard/workspaces"
              className="text-sm text-[#22d3ee] hover:text-[#22d3ee]/80 flex items-center gap-1"
            >
              View all <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="space-y-3">
            {recentWorkspaces.map((workspace, index) => (
              <motion.div
                key={workspace.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + index * 0.1 }}
              >
                <Link
                  href={`/dashboard/workspaces/${workspace.id}`}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-xl",
                    "bg-white/5 border border-white/5",
                    "hover:border-white/10 hover:bg-white/[0.07]",
                    "transition-all group"
                  )}
                >
                  <div className="p-2.5 rounded-xl bg-white/5 group-hover:bg-white/10 transition-colors">
                    <Terminal className="w-5 h-5 text-white/60" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{workspace.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={cn(
                          "w-2 h-2 rounded-full",
                          workspace.status === "running" ? "bg-green-500" : "bg-white/30"
                        )}
                      />
                      <span className="text-xs text-white/40 capitalize">{workspace.status}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-white/40">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">{workspace.lastAccess}</span>
                  </div>
                  <ArrowUpRight className="w-5 h-5 text-white/30 group-hover:text-[#22d3ee] transition-colors" />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="p-6 rounded-2xl bg-white/5 border border-white/5">
          <h2 className="text-lg font-semibold text-white mb-6">Quick Actions</h2>
          <div className="space-y-3">
            {quickActions.map((action, index) => (
              <motion.div
                key={action.label}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
              >
                <Link
                  href={action.href}
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-xl",
                    "bg-white/5 border border-white/5",
                    "hover:border-[#22d3ee]/30 hover:bg-[#22d3ee]/5",
                    "transition-all group"
                  )}
                >
                  <div className="p-2.5 rounded-xl bg-[#22d3ee]/10 group-hover:bg-[#22d3ee]/20 transition-colors">
                    <action.icon className="w-5 h-5 text-[#22d3ee]" />
                  </div>
                  <span className="font-medium text-white">{action.label}</span>
                  <ArrowUpRight className="w-4 h-4 text-white/30 group-hover:text-[#22d3ee] ml-auto transition-colors" />
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Resource Usage */}
          <div className="mt-6 pt-6 border-t border-white/5">
            <h3 className="text-sm font-medium text-white/60 mb-4">Resource Usage</h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-white/60">CPU</span>
                  <span className="text-sm text-white">45%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full w-[45%] bg-[#22d3ee] rounded-full" />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-white/60">Memory</span>
                  <span className="text-sm text-white">62%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full w-[62%] bg-[#3b82f6] rounded-full" />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-white/60">Storage</span>
                  <span className="text-sm text-white">28%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full w-[28%] bg-[#a855f7] rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-[#22d3ee]/10 to-[#3b82f6]/10 border border-[#22d3ee]/20">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-[#22d3ee]/20">
            <Zap className="w-6 h-6 text-[#22d3ee]" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-white">All systems operational</h3>
            <p className="text-sm text-white/60 mt-1">
              Your workspaces are running smoothly. No issues detected.
            </p>
          </div>
          <Link
            href="/status"
            className="px-4 py-2 rounded-xl bg-white/10 text-white/80 hover:text-white hover:bg-white/15 transition-colors text-sm font-medium"
          >
            View Status
          </Link>
        </div>
      </div>
    </div>
  );
}
