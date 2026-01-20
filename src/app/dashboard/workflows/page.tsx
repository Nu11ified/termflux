"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  GitBranch,
  Plus,
  Play,
  Pause,
  Clock,
  CheckCircle2,
  XCircle,
  MoreVertical,
  ArrowRight,
  Zap,
  Terminal,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Workflow {
  id: string;
  name: string;
  description: string;
  status: "active" | "paused" | "draft";
  lastRun: {
    status: "completed" | "failed" | "running" | null;
    timestamp: string | null;
    duration: string | null;
  };
  steps: number;
  runs: number;
}

const mockWorkflows: Workflow[] = [
  {
    id: "1",
    name: "Code Review Pipeline",
    description: "Automated code review with AI analysis and PR comments",
    status: "active",
    lastRun: {
      status: "completed",
      timestamp: "10 min ago",
      duration: "2m 34s",
    },
    steps: 5,
    runs: 47,
  },
  {
    id: "2",
    name: "Multi-Agent PR Factory",
    description: "7 terminals: 1 spec writer, 3 implementers, 3 reviewers",
    status: "active",
    lastRun: {
      status: "running",
      timestamp: "Now",
      duration: null,
    },
    steps: 12,
    runs: 23,
  },
  {
    id: "3",
    name: "Daily Database Backup",
    description: "Automated PostgreSQL backup to S3",
    status: "paused",
    lastRun: {
      status: "completed",
      timestamp: "1 day ago",
      duration: "5m 12s",
    },
    steps: 3,
    runs: 156,
  },
  {
    id: "4",
    name: "Test Suite Runner",
    description: "Run tests across all workspaces on commit",
    status: "draft",
    lastRun: {
      status: null,
      timestamp: null,
      duration: null,
    },
    steps: 4,
    runs: 0,
  },
];

const statusColors = {
  active: "text-green-500",
  paused: "text-yellow-500",
  draft: "text-white/40",
};

const runStatusColors = {
  completed: "text-green-500",
  failed: "text-red-500",
  running: "text-[#22d3ee]",
};

export default function WorkflowsPage() {
  const [workflows] = useState<Workflow[]>(mockWorkflows);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Workflows</h1>
          <p className="text-white/50 mt-1">Automate multi-terminal and multi-agent tasks</p>
        </div>
        <button
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl",
            "bg-[#22d3ee] text-zinc-900 font-medium",
            "hover:bg-[#22d3ee]/90 transition-all",
            "active:scale-[0.98]"
          )}
        >
          <Plus className="w-5 h-5" />
          New Workflow
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white/5 border border-white/5">
          <div className="flex items-center gap-3 mb-2">
            <GitBranch className="w-5 h-5 text-[#22d3ee]" />
            <span className="text-sm text-white/50">Total Workflows</span>
          </div>
          <p className="text-3xl font-semibold text-white">{workflows.length}</p>
        </div>
        <div className="p-5 rounded-2xl bg-white/5 border border-white/5">
          <div className="flex items-center gap-3 mb-2">
            <Play className="w-5 h-5 text-green-500" />
            <span className="text-sm text-white/50">Active</span>
          </div>
          <p className="text-3xl font-semibold text-white">
            {workflows.filter((w) => w.status === "active").length}
          </p>
        </div>
        <div className="p-5 rounded-2xl bg-white/5 border border-white/5">
          <div className="flex items-center gap-3 mb-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            <span className="text-sm text-white/50">Total Runs (Today)</span>
          </div>
          <p className="text-3xl font-semibold text-white">
            {workflows.reduce((acc, w) => acc + w.runs, 0)}
          </p>
        </div>
      </div>

      {/* Workflows List */}
      <div className="space-y-4">
        {workflows.map((workflow, index) => (
          <motion.div
            key={workflow.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={cn(
              "group p-5 rounded-2xl",
              "bg-white/5 border border-white/5",
              "hover:border-white/10 hover:bg-white/[0.07]",
              "transition-all"
            )}
          >
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-white/5 group-hover:bg-white/10 transition-colors">
                <GitBranch className="w-6 h-6 text-[#22d3ee]" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-semibold text-white">{workflow.name}</h3>
                  <span className={cn("text-xs font-medium capitalize", statusColors[workflow.status])}>
                    {workflow.status}
                  </span>
                </div>
                <p className="text-sm text-white/50 mb-3">{workflow.description}</p>

                <div className="flex items-center gap-6 text-sm text-white/40">
                  <div className="flex items-center gap-1">
                    <Terminal className="w-4 h-4" />
                    <span>{workflow.steps} steps</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Zap className="w-4 h-4" />
                    <span>{workflow.runs} runs</span>
                  </div>
                  {workflow.lastRun.status && (
                    <div className="flex items-center gap-2">
                      {workflow.lastRun.status === "completed" && (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      )}
                      {workflow.lastRun.status === "failed" && (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      {workflow.lastRun.status === "running" && (
                        <div className="w-4 h-4 border-2 border-[#22d3ee] border-t-transparent rounded-full animate-spin" />
                      )}
                      <span className={cn(runStatusColors[workflow.lastRun.status])}>
                        {workflow.lastRun.timestamp}
                      </span>
                      {workflow.lastRun.duration && (
                        <span className="text-white/30">({workflow.lastRun.duration})</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {workflow.status === "active" ? (
                  <button className="p-2.5 rounded-xl bg-white/5 hover:bg-yellow-500/20 text-white/60 hover:text-yellow-400 transition-colors">
                    <Pause className="w-4 h-4" />
                  </button>
                ) : (
                  <button className="p-2.5 rounded-xl bg-white/5 hover:bg-green-500/20 text-white/60 hover:text-green-400 transition-colors">
                    <Play className="w-4 h-4" />
                  </button>
                )}
                <button className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* CTA for Empty State */}
      {workflows.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-white/5 flex items-center justify-center mb-4">
            <GitBranch className="w-8 h-8 text-white/40" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No workflows yet</h3>
          <p className="text-white/50 mb-6">Create your first workflow to automate tasks</p>
          <button
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl",
              "bg-[#22d3ee] text-zinc-900 font-medium",
              "hover:bg-[#22d3ee]/90 transition-all"
            )}
          >
            <Plus className="w-5 h-5" />
            New Workflow
          </button>
        </div>
      )}
    </div>
  );
}
