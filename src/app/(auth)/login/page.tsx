"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Terminal, Mail, Lock, ArrowRight, Github, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      // Store token
      localStorage.setItem("token", data.token);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Mobile logo */}
      <div className="lg:hidden flex items-center gap-3 mb-8">
        <div className="p-2.5 rounded-xl bg-white/10 border border-white/10">
          <Terminal className="w-5 h-5 text-[#22d3ee]" />
        </div>
        <span className="text-white text-xl font-semibold tracking-tight">Termflux</span>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-white mb-2">Welcome back</h2>
        <p className="text-white/50">Sign in to your account to continue</p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-white/70">Email</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className={cn(
                "w-full pl-12 pr-4 py-3 rounded-xl",
                "bg-white/5 border border-white/10",
                "text-white placeholder-white/30",
                "focus:border-[#22d3ee]/50 focus:outline-none focus:ring-1 focus:ring-[#22d3ee]/50",
                "transition-all"
              )}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-white/70">Password</label>
            <Link href="/forgot-password" className="text-sm text-[#22d3ee] hover:text-[#22d3ee]/80">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className={cn(
                "w-full pl-12 pr-4 py-3 rounded-xl",
                "bg-white/5 border border-white/10",
                "text-white placeholder-white/30",
                "focus:border-[#22d3ee]/50 focus:outline-none focus:ring-1 focus:ring-[#22d3ee]/50",
                "transition-all"
              )}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-3 rounded-xl",
            "bg-[#22d3ee] text-zinc-900 font-medium",
            "hover:bg-[#22d3ee]/90 transition-all",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              Sign In
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </form>

      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/10" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-[#0a0a0f] text-white/40">Or continue with</span>
        </div>
      </div>

      <button
        className={cn(
          "w-full flex items-center justify-center gap-3 py-3 rounded-xl",
          "bg-white/5 border border-white/10",
          "text-white font-medium",
          "hover:bg-white/10 transition-all"
        )}
      >
        <Github className="w-5 h-5" />
        GitHub
      </button>

      <p className="mt-8 text-center text-white/50 text-sm">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-[#22d3ee] hover:text-[#22d3ee]/80 font-medium">
          Sign up
        </Link>
      </p>
    </motion.div>
  );
}
