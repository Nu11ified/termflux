"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Terminal,
  ArrowLeft,
  Cpu,
  Activity,
  HardDrive,
  Box,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const templates = [
  {
    id: "default",
    name: "Default Workspace",
    description: "A clean slate with essential dev tools",
    icon: Terminal,
    specs: { cpu: 2, memory: 2048, disk: 10240 },
  },
  {
    id: "node",
    name: "Node.js Development",
    description: "Node.js 20, npm, yarn, pnpm pre-installed",
    icon: Box,
    specs: { cpu: 2, memory: 2048, disk: 10240 },
  },
  {
    id: "python",
    name: "Python Development",
    description: "Python 3.11 with pip, virtualenv, poetry",
    icon: Box,
    specs: { cpu: 2, memory: 2048, disk: 10240 },
  },
  {
    id: "ml",
    name: "ML / Data Science",
    description: "PyTorch, TensorFlow, Jupyter ready",
    icon: Sparkles,
    specs: { cpu: 4, memory: 8192, disk: 20480 },
  },
];

export default function NewWorkspacePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("default");
  const [cpuLimit, setCpuLimit] = useState(2);
  const [memoryLimit, setMemoryLimit] = useState(2048);
  const [diskLimit, setDiskLimit] = useState(10240);
  const [isCreating, setIsCreating] = useState(false);

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setCpuLimit(template.specs.cpu);
      setMemoryLimit(template.specs.memory);
      setDiskLimit(template.specs.disk);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) return;

    setIsCreating(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // In real implementation, this would call the API
    // const response = await fetch("/api/workspaces", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ name, image: selectedTemplate, cpuLimit, memoryLimit, diskLimit }),
    // });

    router.push("/dashboard/workspaces");
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/dashboard/workspaces"
          className="p-2 rounded-xl hover:bg-white/10 text-white/60 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-white">Create Workspace</h1>
          <p className="text-white/50 mt-1">Set up a new cloud development environment</p>
        </div>
      </div>

      <div className="space-y-8">
        {/* Name */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <label className="text-sm font-medium text-white/80">Workspace Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="my-project"
            className={cn(
              "w-full px-4 py-3 rounded-xl",
              "bg-white/5 border border-white/10",
              "text-white placeholder-white/30",
              "focus:border-[#22d3ee]/50 focus:outline-none focus:ring-1 focus:ring-[#22d3ee]/50",
              "transition-all"
            )}
          />
        </motion.div>

        {/* Templates */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-3"
        >
          <label className="text-sm font-medium text-white/80">Template</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => handleTemplateSelect(template.id)}
                className={cn(
                  "flex items-start gap-4 p-4 rounded-xl text-left",
                  "border transition-all",
                  selectedTemplate === template.id
                    ? "bg-[#22d3ee]/10 border-[#22d3ee]/30"
                    : "bg-white/5 border-white/10 hover:border-white/20"
                )}
              >
                <div
                  className={cn(
                    "p-2.5 rounded-xl",
                    selectedTemplate === template.id ? "bg-[#22d3ee]/20" : "bg-white/5"
                  )}
                >
                  <template.icon
                    className={cn(
                      "w-5 h-5",
                      selectedTemplate === template.id ? "text-[#22d3ee]" : "text-white/60"
                    )}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "font-medium",
                      selectedTemplate === template.id ? "text-[#22d3ee]" : "text-white"
                    )}
                  >
                    {template.name}
                  </p>
                  <p className="text-sm text-white/50 mt-0.5">{template.description}</p>
                </div>
                <ChevronRight
                  className={cn(
                    "w-5 h-5 mt-1",
                    selectedTemplate === template.id ? "text-[#22d3ee]" : "text-white/20"
                  )}
                />
              </button>
            ))}
          </div>
        </motion.div>

        {/* Resources */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <label className="text-sm font-medium text-white/80">Resources</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* CPU */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-3 mb-3">
                <Cpu className="w-5 h-5 text-[#22d3ee]" />
                <span className="text-sm font-medium text-white">CPU Cores</span>
              </div>
              <select
                value={cpuLimit}
                onChange={(e) => setCpuLimit(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none"
              >
                <option value={1}>1 core</option>
                <option value={2}>2 cores</option>
                <option value={4}>4 cores</option>
                <option value={8}>8 cores</option>
              </select>
            </div>

            {/* Memory */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-3 mb-3">
                <Activity className="w-5 h-5 text-[#3b82f6]" />
                <span className="text-sm font-medium text-white">Memory</span>
              </div>
              <select
                value={memoryLimit}
                onChange={(e) => setMemoryLimit(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none"
              >
                <option value={1024}>1 GB</option>
                <option value={2048}>2 GB</option>
                <option value={4096}>4 GB</option>
                <option value={8192}>8 GB</option>
                <option value={16384}>16 GB</option>
              </select>
            </div>

            {/* Disk */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-3 mb-3">
                <HardDrive className="w-5 h-5 text-[#a855f7]" />
                <span className="text-sm font-medium text-white">Storage</span>
              </div>
              <select
                value={diskLimit}
                onChange={(e) => setDiskLimit(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none"
              >
                <option value={5120}>5 GB</option>
                <option value={10240}>10 GB</option>
                <option value={20480}>20 GB</option>
                <option value={51200}>50 GB</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Create Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-center justify-end gap-4 pt-4"
        >
          <Link
            href="/dashboard/workspaces"
            className="px-6 py-3 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-colors font-medium"
          >
            Cancel
          </Link>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || isCreating}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-xl",
              "bg-[#22d3ee] text-zinc-900 font-medium",
              "hover:bg-[#22d3ee]/90 transition-all",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {isCreating ? (
              <>
                <div className="w-5 h-5 border-2 border-zinc-900/30 border-t-zinc-900 rounded-full animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Terminal className="w-5 h-5" />
                Create Workspace
              </>
            )}
          </button>
        </motion.div>
      </div>
    </div>
  );
}
