"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  User,
  Mail,
  Lock,
  Bell,
  Moon,
  Globe,
  Shield,
  CreditCard,
  Save,
  Terminal,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const [name, setName] = useState("Dev User");
  const [email, setEmail] = useState("dev@termflux.io");
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">Settings</h1>
        <p className="text-white/50 mt-1">Manage your account and preferences</p>
      </div>

      <div className="space-y-6">
        {/* Profile Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-2xl bg-white/5 border border-white/5"
        >
          <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <User className="w-5 h-5 text-[#22d3ee]" />
            Profile
          </h2>

          <div className="space-y-4">
            <div className="flex items-start gap-6">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#22d3ee] to-[#3b82f6] flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/70">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={cn(
                      "w-full px-4 py-3 rounded-xl",
                      "bg-white/5 border border-white/10",
                      "text-white placeholder-white/30",
                      "focus:border-[#22d3ee]/50 focus:outline-none",
                      "transition-all"
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/70">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={cn(
                      "w-full px-4 py-3 rounded-xl",
                      "bg-white/5 border border-white/10",
                      "text-white placeholder-white/30",
                      "focus:border-[#22d3ee]/50 focus:outline-none",
                      "transition-all"
                    )}
                  />
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Security Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 rounded-2xl bg-white/5 border border-white/5"
        >
          <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#22d3ee]" />
            Security
          </h2>

          <div className="space-y-4">
            <button
              className={cn(
                "w-full flex items-center justify-between p-4 rounded-xl",
                "bg-white/5 border border-white/10",
                "hover:bg-white/10 transition-all"
              )}
            >
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-white/60" />
                <div className="text-left">
                  <p className="font-medium text-white">Change Password</p>
                  <p className="text-sm text-white/40">Update your account password</p>
                </div>
              </div>
            </button>

            <button
              className={cn(
                "w-full flex items-center justify-between p-4 rounded-xl",
                "bg-white/5 border border-white/10",
                "hover:bg-white/10 transition-all"
              )}
            >
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-white/60" />
                <div className="text-left">
                  <p className="font-medium text-white">Two-Factor Authentication</p>
                  <p className="text-sm text-white/40">Add an extra layer of security</p>
                </div>
              </div>
              <span className="text-sm text-white/40">Disabled</span>
            </button>
          </div>
        </motion.section>

        {/* Preferences Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-6 rounded-2xl bg-white/5 border border-white/5"
        >
          <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <Terminal className="w-5 h-5 text-[#22d3ee]" />
            Preferences
          </h2>

          <div className="space-y-4">
            <div
              className={cn(
                "flex items-center justify-between p-4 rounded-xl",
                "bg-white/5 border border-white/10"
              )}
            >
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-white/60" />
                <div>
                  <p className="font-medium text-white">Notifications</p>
                  <p className="text-sm text-white/40">Receive workflow alerts</p>
                </div>
              </div>
              <button
                onClick={() => setNotifications(!notifications)}
                className={cn(
                  "w-12 h-7 rounded-full transition-colors",
                  notifications ? "bg-[#22d3ee]" : "bg-white/10"
                )}
              >
                <div
                  className={cn(
                    "w-5 h-5 rounded-full bg-white shadow-lg transition-transform",
                    notifications ? "translate-x-6" : "translate-x-1"
                  )}
                />
              </button>
            </div>

            <div
              className={cn(
                "flex items-center justify-between p-4 rounded-xl",
                "bg-white/5 border border-white/10"
              )}
            >
              <div className="flex items-center gap-3">
                <Moon className="w-5 h-5 text-white/60" />
                <div>
                  <p className="font-medium text-white">Dark Mode</p>
                  <p className="text-sm text-white/40">Use dark theme</p>
                </div>
              </div>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={cn(
                  "w-12 h-7 rounded-full transition-colors",
                  darkMode ? "bg-[#22d3ee]" : "bg-white/10"
                )}
              >
                <div
                  className={cn(
                    "w-5 h-5 rounded-full bg-white shadow-lg transition-transform",
                    darkMode ? "translate-x-6" : "translate-x-1"
                  )}
                />
              </button>
            </div>
          </div>
        </motion.section>

        {/* Billing Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-6 rounded-2xl bg-white/5 border border-white/5"
        >
          <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#22d3ee]" />
            Billing
          </h2>

          <div className="p-4 rounded-xl bg-[#22d3ee]/10 border border-[#22d3ee]/20 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-white">Free Plan</p>
                <p className="text-sm text-white/50">2 workspaces • 1GB memory each</p>
              </div>
              <button
                className={cn(
                  "px-4 py-2 rounded-xl",
                  "bg-[#22d3ee] text-zinc-900 font-medium",
                  "hover:bg-[#22d3ee]/90 transition-all"
                )}
              >
                Upgrade
              </button>
            </div>
          </div>

          <p className="text-sm text-white/40">
            Upgrade to Pro for unlimited workspaces and more resources.
          </p>
        </motion.section>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-xl",
              "bg-[#22d3ee] text-zinc-900 font-medium",
              "hover:bg-[#22d3ee]/90 transition-all"
            )}
          >
            <Save className="w-5 h-5" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
