"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Package,
  Search,
  Terminal,
  GitBranch,
  Code2,
  Database,
  Cloud,
  Bot,
  CheckCircle2,
  Plus,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface App {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: React.ElementType;
  category: string;
  isInstalled: boolean;
  version: string;
}

const mockApps: App[] = [
  {
    id: "1",
    name: "Claude Code",
    slug: "claude-code",
    description: "AI-powered coding assistant integrated into your terminal",
    icon: Bot,
    category: "AI",
    isInstalled: true,
    version: "1.0.0",
  },
  {
    id: "2",
    name: "Git Tools",
    slug: "git-tools",
    description: "Enhanced git workflows with visual diffing and merge tools",
    icon: GitBranch,
    category: "Development",
    isInstalled: true,
    version: "2.1.0",
  },
  {
    id: "3",
    name: "VSCode Server",
    slug: "vscode-server",
    description: "Full VSCode experience in your browser",
    icon: Code2,
    category: "Development",
    isInstalled: false,
    version: "1.85.0",
  },
  {
    id: "4",
    name: "PostgreSQL",
    slug: "postgresql",
    description: "PostgreSQL database with pgAdmin interface",
    icon: Database,
    category: "Database",
    isInstalled: false,
    version: "16.0",
  },
  {
    id: "5",
    name: "Docker",
    slug: "docker",
    description: "Container runtime for building and running apps",
    icon: Cloud,
    category: "Infrastructure",
    isInstalled: true,
    version: "24.0",
  },
  {
    id: "6",
    name: "tmux Manager",
    slug: "tmux-manager",
    description: "Enhanced terminal multiplexer with persistent sessions",
    icon: Terminal,
    category: "Terminal",
    isInstalled: true,
    version: "3.3",
  },
];

const categories = ["All", "AI", "Development", "Database", "Infrastructure", "Terminal"];

export default function AppsPage() {
  const [apps] = useState<App[]>(mockApps);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const filteredApps = apps.filter((app) => {
    const matchesSearch =
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || app.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const installedApps = filteredApps.filter((a) => a.isInstalled);
  const availableApps = filteredApps.filter((a) => !a.isInstalled);

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-white">Apps</h1>
        <p className="text-white/50 mt-1">Extend your workspace with powerful tools</p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              type="text"
              placeholder="Search apps..."
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

        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap",
                "transition-all",
                selectedCategory === category
                  ? "bg-[#22d3ee] text-zinc-900"
                  : "bg-white/5 text-white/60 hover:text-white hover:bg-white/10"
              )}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Installed Apps */}
      {installedApps.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            Installed ({installedApps.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {installedApps.map((app, index) => (
              <motion.div
                key={app.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "group p-5 rounded-2xl",
                  "bg-white/5 border border-white/5",
                  "hover:border-white/10 hover:bg-white/[0.07]",
                  "transition-all"
                )}
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-[#22d3ee]/10">
                    <app.icon className="w-6 h-6 text-[#22d3ee]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-white truncate">{app.name}</h3>
                      <span className="text-xs text-white/40">v{app.version}</span>
                    </div>
                    <p className="text-sm text-white/50 line-clamp-2">{app.description}</p>
                    <div className="flex items-center gap-3 mt-3">
                      <span className="text-xs text-white/40 bg-white/5 px-2 py-1 rounded">
                        {app.category}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-green-500">
                        <CheckCircle2 className="w-3 h-3" />
                        Installed
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Available Apps */}
      {availableApps.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-white/60" />
            Available ({availableApps.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableApps.map((app, index) => (
              <motion.div
                key={app.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "group p-5 rounded-2xl",
                  "bg-white/5 border border-white/5",
                  "hover:border-[#22d3ee]/30 hover:bg-[#22d3ee]/5",
                  "transition-all"
                )}
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-white/5 group-hover:bg-[#22d3ee]/10 transition-colors">
                    <app.icon className="w-6 h-6 text-white/60 group-hover:text-[#22d3ee] transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-white truncate">{app.name}</h3>
                      <span className="text-xs text-white/40">v{app.version}</span>
                    </div>
                    <p className="text-sm text-white/50 line-clamp-2">{app.description}</p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-white/40 bg-white/5 px-2 py-1 rounded">
                        {app.category}
                      </span>
                      <button className="flex items-center gap-1 text-sm text-[#22d3ee] hover:text-[#22d3ee]/80 font-medium">
                        <Plus className="w-4 h-4" />
                        Install
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {filteredApps.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-white/5 flex items-center justify-center mb-4">
            <Package className="w-8 h-8 text-white/40" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No apps found</h3>
          <p className="text-white/50">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );
}
