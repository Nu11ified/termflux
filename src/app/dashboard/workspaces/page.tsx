"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Terminal,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Play,
  Square,
  Trash2,
  Settings,
  Clock,
  Cpu,
  HardDrive,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Workspace {
  id: string;
  name: string;
  status: "running" | "stopped" | "creating" | "error";
  image: string;
  cpuLimit: number;
  memoryLimit: number;
  diskLimit: number;
  lastAccess: string;
  createdAt: string;
}

const mockWorkspaces: Workspace[] = [
  {
    id: "1",
    name: "termflux-api",
    status: "running",
    image: "termflux-workspace:latest",
    cpuLimit: 2,
    memoryLimit: 2048,
    diskLimit: 10240,
    lastAccess: "2 minutes ago",
    createdAt: "2024-01-10",
  },
  {
    id: "2",
    name: "frontend-v2",
    status: "stopped",
    image: "node:20-alpine",
    cpuLimit: 1,
    memoryLimit: 1024,
    diskLimit: 5120,
    lastAccess: "1 hour ago",
    createdAt: "2024-01-08",
  },
  {
    id: "3",
    name: "data-pipeline",
    status: "running",
    image: "python:3.11",
    cpuLimit: 4,
    memoryLimit: 4096,
    diskLimit: 20480,
    lastAccess: "5 minutes ago",
    createdAt: "2024-01-05",
  },
  {
    id: "4",
    name: "ml-experiments",
    status: "creating",
    image: "pytorch/pytorch:latest",
    cpuLimit: 8,
    memoryLimit: 16384,
    diskLimit: 51200,
    lastAccess: "Never",
    createdAt: "2024-01-15",
  },
];

const statusColors = {
  running: "bg-green-500",
  stopped: "bg-zinc-500",
  creating: "bg-yellow-500 animate-pulse",
  error: "bg-red-500",
};

export default function WorkspacesPage() {
  const [workspaces] = useState<Workspace[]>(mockWorkspaces);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredWorkspaces = workspaces.filter((w) => {
    const matchesSearch = w.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || w.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Workspaces</h1>
          <p className="text-white/50 mt-1">Manage your cloud development environments</p>
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

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              type="text"
              placeholder="Search workspaces..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                "w-full pl-10 pr-4 py-2.5 rounded-xl",
                "bg-white/5 border border-white/10",
                "text-white placeholder-white/40",
                "focus:border-[#22d3ee]/50 focus:outline-none focus:ring-1 focus:ring-[#22d3ee]/50",
                "transition-all"
              )}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-white/40" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={cn(
              "px-4 py-2.5 rounded-xl",
              "bg-white/5 border border-white/10",
              "text-white",
              "focus:outline-none",
              "cursor-pointer"
            )}
          >
            <option value="all">All Status</option>
            <option value="running">Running</option>
            <option value="stopped">Stopped</option>
            <option value="creating">Creating</option>
            <option value="error">Error</option>
          </select>
        </div>
      </div>

      {/* Workspaces Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredWorkspaces.map((workspace, index) => (
          <motion.div
            key={workspace.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={cn(
              "group relative p-5 rounded-2xl",
              "bg-white/5 border border-white/5",
              "hover:border-white/10 hover:bg-white/[0.07]",
              "transition-all duration-300"
            )}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-white/5 group-hover:bg-white/10 transition-colors">
                  <Terminal className="w-5 h-5 text-[#22d3ee]" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{workspace.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={cn("w-2 h-2 rounded-full", statusColors[workspace.status])} />
                    <span className="text-xs text-white/50 capitalize">{workspace.status}</span>
                  </div>
                </div>
              </div>
              <button className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>

            {/* Info */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm text-white/40">
                <Clock className="w-4 h-4" />
                <span>Last accessed {workspace.lastAccess}</span>
              </div>
              <div className="flex items-center gap-4 text-sm text-white/40">
                <div className="flex items-center gap-1">
                  <Cpu className="w-4 h-4" />
                  <span>{workspace.cpuLimit} cores</span>
                </div>
                <div className="flex items-center gap-1">
                  <Activity className="w-4 h-4" />
                  <span>{workspace.memoryLimit} MB</span>
                </div>
                <div className="flex items-center gap-1">
                  <HardDrive className="w-4 h-4" />
                  <span>{(workspace.diskLimit / 1024).toFixed(0)} GB</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Link
                href={`/dashboard/workspaces/${workspace.id}`}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl",
                  "bg-[#22d3ee] text-zinc-900 font-medium",
                  "hover:bg-[#22d3ee]/90 transition-all"
                )}
              >
                <Terminal className="w-4 h-4" />
                Open
              </Link>
              {workspace.status === "stopped" ? (
                <button className="p-2.5 rounded-xl bg-white/5 hover:bg-green-500/20 text-white/60 hover:text-green-400 transition-colors">
                  <Play className="w-4 h-4" />
                </button>
              ) : workspace.status === "running" ? (
                <button className="p-2.5 rounded-xl bg-white/5 hover:bg-yellow-500/20 text-white/60 hover:text-yellow-400 transition-colors">
                  <Square className="w-4 h-4" />
                </button>
              ) : null}
              <button className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors">
                <Settings className="w-4 h-4" />
              </button>
              <button className="p-2.5 rounded-xl bg-white/5 hover:bg-red-500/20 text-white/60 hover:text-red-400 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Empty State */}
      {filteredWorkspaces.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-white/5 flex items-center justify-center mb-4">
            <Terminal className="w-8 h-8 text-white/40" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No workspaces found</h3>
          <p className="text-white/50 mb-6">
            {searchQuery ? "Try adjusting your search or filters" : "Create your first workspace to get started"}
          </p>
          <Link
            href="/dashboard/workspaces/new"
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl",
              "bg-[#22d3ee] text-zinc-900 font-medium",
              "hover:bg-[#22d3ee]/90 transition-all"
            )}
          >
            <Plus className="w-5 h-5" />
            New Workspace
          </Link>
        </div>
      )}
    </div>
  );
}
