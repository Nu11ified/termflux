"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Plus,
  Mail,
  Shield,
  MoreVertical,
  Crown,
  User,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "member";
  status: "active" | "pending";
  avatarUrl?: string;
  joinedAt: string;
}

const mockMembers: TeamMember[] = [
  {
    id: "1",
    name: "Dev User",
    email: "dev@termflux.io",
    role: "owner",
    status: "active",
    joinedAt: "Jan 1, 2024",
  },
  {
    id: "2",
    name: "Alice Engineer",
    email: "alice@company.com",
    role: "admin",
    status: "active",
    joinedAt: "Jan 5, 2024",
  },
  {
    id: "3",
    name: "Bob Developer",
    email: "bob@company.com",
    role: "member",
    status: "active",
    joinedAt: "Jan 10, 2024",
  },
  {
    id: "4",
    name: "",
    email: "charlie@company.com",
    role: "member",
    status: "pending",
    joinedAt: "Jan 15, 2024",
  },
];

const roleColors = {
  owner: "bg-yellow-500/20 text-yellow-400",
  admin: "bg-purple-500/20 text-purple-400",
  member: "bg-white/10 text-white/60",
};

const roleIcons = {
  owner: Crown,
  admin: Shield,
  member: User,
};

export default function TeamPage() {
  const [members] = useState<TeamMember[]>(mockMembers);
  const [inviteEmail, setInviteEmail] = useState("");

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    // Would call API here
    setInviteEmail("");
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">Team</h1>
          <p className="text-white/50 mt-1">Manage your organization members</p>
        </div>
      </div>

      {/* Invite Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-2xl bg-white/5 border border-white/5 mb-6"
      >
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-[#22d3ee]" />
          Invite Team Member
        </h2>
        <form onSubmit={handleInvite} className="flex gap-3">
          <div className="flex-1 relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@company.com"
              className={cn(
                "w-full pl-12 pr-4 py-3 rounded-xl",
                "bg-white/5 border border-white/10",
                "text-white placeholder-white/30",
                "focus:border-[#22d3ee]/50 focus:outline-none",
                "transition-all"
              )}
            />
          </div>
          <button
            type="submit"
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-xl",
              "bg-[#22d3ee] text-zinc-900 font-medium",
              "hover:bg-[#22d3ee]/90 transition-all"
            )}
          >
            <Plus className="w-5 h-5" />
            Invite
          </button>
        </form>
      </motion.div>

      {/* Members List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl bg-white/5 border border-white/5 overflow-hidden"
      >
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-[#22d3ee]" />
            Members ({members.length})
          </h2>
        </div>

        <div className="divide-y divide-white/5">
          {members.map((member, index) => {
            const RoleIcon = roleIcons[member.role];
            return (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 flex items-center gap-4 hover:bg-white/5 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#22d3ee] to-[#3b82f6] flex items-center justify-center flex-shrink-0">
                  {member.name ? (
                    <span className="text-white font-medium">
                      {member.name.charAt(0).toUpperCase()}
                    </span>
                  ) : (
                    <Mail className="w-4 h-4 text-white" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-white truncate">
                      {member.name || member.email}
                    </p>
                    {member.status === "pending" && (
                      <span className="text-xs text-yellow-400 bg-yellow-500/20 px-2 py-0.5 rounded">
                        Pending
                      </span>
                    )}
                  </div>
                  {member.name && (
                    <p className="text-sm text-white/40 truncate">{member.email}</p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium capitalize",
                      roleColors[member.role]
                    )}
                  >
                    <RoleIcon className="w-3.5 h-3.5" />
                    {member.role}
                  </span>
                  <span className="text-sm text-white/30 hidden sm:block">{member.joinedAt}</span>
                  {member.role !== "owner" && (
                    <button className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Roles Explanation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-6 p-6 rounded-2xl bg-white/5 border border-white/5"
      >
        <h3 className="font-semibold text-white mb-4">Role Permissions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-white/5">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-4 h-4 text-yellow-400" />
              <span className="font-medium text-white">Owner</span>
            </div>
            <p className="text-sm text-white/40">Full access including billing and team management</p>
          </div>
          <div className="p-4 rounded-xl bg-white/5">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-purple-400" />
              <span className="font-medium text-white">Admin</span>
            </div>
            <p className="text-sm text-white/40">Manage workspaces, apps, and invite members</p>
          </div>
          <div className="p-4 rounded-xl bg-white/5">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-4 h-4 text-white/60" />
              <span className="font-medium text-white">Member</span>
            </div>
            <p className="text-sm text-white/40">Access assigned workspaces and apps</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
