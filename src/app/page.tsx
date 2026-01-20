"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Terminal,
  Sparkles,
  ArrowRight,
  ArrowUpRight,
  Play,
  Zap,
  Box,
  Layers,
  GitBranch,
  Shield,
  Globe,
  CheckCircle2,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NavLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a
    href={href}
    className="px-5 py-2 text-sm text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-all duration-300 backdrop-blur-sm"
  >
    {children}
  </a>
);

const StatsCard = ({
  value,
  label,
  icon: Icon,
  delay = 0,
}: {
  value: string;
  label: string;
  icon: React.ElementType;
  delay?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, delay }}
    className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-2xl w-full md:w-72 hover:bg-white/10 transition-colors group cursor-default"
  >
    <div className="flex justify-between items-start mb-2">
      <span className="text-3xl font-semibold text-white tracking-tight">{value}</span>
      <Icon className="text-white/60 w-5 h-5 group-hover:text-white transition-colors" />
    </div>
    <p className="text-sm text-white/60 group-hover:text-white/80 transition-colors">{label}</p>
  </motion.div>
);

const FeatureItem = ({ icon: Icon, label }: { icon: React.ElementType; label: string }) => (
  <div className="flex items-center gap-3 group p-2 rounded-xl hover:bg-zinc-100 transition-colors">
    <span className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center group-hover:bg-zinc-900 group-hover:text-white transition-all duration-300">
      <Icon className="w-5 h-5" />
    </span>
    <span className="text-sm font-medium text-zinc-800">{label}</span>
  </div>
);

const PricingCard = ({
  title,
  price,
  description,
  features,
  isPopular = false,
}: {
  title: string;
  price: string;
  description: string;
  features: string[];
  isPopular?: boolean;
}) => (
  <div className="group relative bg-white p-6 rounded-3xl shadow-sm hover:shadow-xl transition-all duration-500 border border-zinc-100 hover:border-zinc-200">
    <div className="mb-6">
      {isPopular && (
        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-[#22d3ee] text-zinc-900 mb-4">
          Most Popular
        </span>
      )}
      <h3 className="text-xl font-semibold text-zinc-900">{title}</h3>
      <p className="text-zinc-500 text-sm mt-2 leading-relaxed">{description}</p>
    </div>
    <div className="mb-6">
      <span className="text-4xl font-bold text-zinc-900">{price}</span>
      {price !== "Custom" && <span className="text-zinc-500">/month</span>}
    </div>
    <div className="space-y-3 mb-6">
      {features.map((feature, idx) => (
        <div key={idx} className="flex items-center gap-2 text-sm text-zinc-600">
          <CheckCircle2 className="w-4 h-4 text-[#22d3ee]" />
          <span>{feature}</span>
        </div>
      ))}
    </div>
    <button className="w-full py-3 rounded-xl border border-zinc-200 text-zinc-900 font-medium hover:bg-zinc-900 hover:text-white transition-colors flex items-center justify-center gap-2 group/btn">
      Get Started <ArrowUpRight className="w-4 h-4 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
    </button>
  </div>
);

export default function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#F4F4F5] text-zinc-900 font-sans selection:bg-zinc-900 selection:text-white pb-20">
      {/* Main Container */}
      <div className="max-w-[1600px] mx-auto p-2 sm:p-4 lg:p-6">
        {/* HERO SECTION */}
        <header className="relative w-full h-[92vh] min-h-[700px] rounded-[2.5rem] overflow-hidden bg-zinc-900 shadow-2xl ring-1 ring-zinc-900/5">
          {/* Abstract Background */}
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-gradient-to-br from-[#22d3ee]/20 via-transparent to-[#3b82f6]/20" />
            <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/40 via-zinc-950/20 to-zinc-950/90" />
            <div
              className="absolute inset-0 opacity-[0.15]"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
                `,
                backgroundSize: "60px 60px",
              }}
            />
          </div>

          {/* Navigation */}
          <nav className="relative z-20 flex items-center justify-between px-6 py-6 sm:px-10">
            {/* Logo */}
            <div className="flex items-center gap-3 group cursor-pointer">
              <div className="bg-white/10 backdrop-blur-md p-2.5 rounded-xl border border-white/10 group-hover:bg-white/20 transition-all duration-300">
                <Terminal className="w-5 h-5 text-[#22d3ee]" />
              </div>
              <span className="text-white text-lg font-medium tracking-tight">Termflux</span>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-1 bg-zinc-900/30 backdrop-blur-xl border border-white/10 rounded-full p-1.5 px-2 shadow-lg shadow-black/5">
              <NavLink href="#features">Features</NavLink>
              <NavLink href="#pricing">Pricing</NavLink>
              <NavLink href="#docs">Docs</NavLink>
            </div>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-3 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            {/* Actions */}
            <div className="hidden md:flex items-center gap-3">
              <Link
                href="/login"
                className="px-5 py-2 text-sm text-white/80 hover:text-white transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="group flex items-center gap-3 bg-white pl-5 pr-1.5 py-1.5 rounded-full transition-all hover:scale-105 hover:shadow-xl hover:shadow-white/10"
              >
                <span className="text-sm font-medium text-zinc-900">Start Free</span>
                <span className="w-8 h-8 bg-zinc-900 rounded-full flex items-center justify-center group-hover:bg-zinc-800 transition-colors">
                  <ArrowUpRight className="w-4 h-4 text-white" />
                </span>
              </Link>
            </div>
          </nav>

          {/* Large Background Text */}
          <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none opacity-[0.02] select-none overflow-hidden">
            <h1 className="text-[20vw] font-bold text-white tracking-tighter leading-none whitespace-nowrap">
              TERMINAL
            </h1>
          </div>

          {/* Hero Content */}
          <div className="absolute bottom-0 left-0 w-full p-6 sm:p-12 z-10 flex flex-col lg:flex-row items-end justify-between gap-12 pb-16">
            <div className="max-w-3xl">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="inline-flex items-center gap-2 px-3 py-1 mb-6 text-xs font-medium tracking-wider text-white uppercase bg-white/10 backdrop-blur-md rounded-full border border-white/10"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-[#22d3ee] animate-pulse" />
                Now in Beta
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-5xl sm:text-6xl lg:text-7xl text-white font-medium tracking-tight leading-[1.05] mb-8"
              >
                Cloud terminals
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#22d3ee] to-[#3b82f6]">
                  without limits.
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-lg text-white/70 max-w-xl font-light leading-relaxed mb-10"
              >
                Browser-native development environments with Ghostty-like UX. Spawn multiple
                terminals, run workflows, and ship code from anywhere.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="flex flex-wrap gap-4"
              >
                <Link
                  href="/register"
                  className="group inline-flex items-center gap-4 bg-[#22d3ee] text-zinc-900 pl-6 pr-2 py-2 rounded-full hover:shadow-lg hover:shadow-[#22d3ee]/20 transition-all duration-300"
                >
                  <span className="text-base font-medium">Get Started Free</span>
                  <span className="w-10 h-10 bg-zinc-900 rounded-full flex items-center justify-center group-hover:bg-zinc-700 transition-colors">
                    <ArrowRight className="w-5 h-5 text-white" />
                  </span>
                </Link>

                <button className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-white/20 text-white hover:bg-white/10 transition-colors backdrop-blur-md font-medium">
                  <Play className="w-5 h-5" />
                  Watch Demo
                </button>
              </motion.div>
            </div>

            {/* Stats Cards */}
            <div className="flex flex-col gap-4 w-full lg:w-auto">
              <StatsCard
                value="< 50ms"
                label="Terminal latency with edge-optimized PTY streaming."
                icon={Zap}
                delay={0.4}
              />
              <StatsCard
                value="100+"
                label="Pre-built templates for every stack and workflow."
                icon={Box}
                delay={0.5}
              />
            </div>
          </div>
        </header>

        {/* FEATURES SECTION */}
        <section id="features" className="mt-32 px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20">
            <div className="lg:col-span-5">
              <div className="sticky top-32">
                <h2 className="text-4xl sm:text-5xl font-medium tracking-tight text-zinc-900 mb-8">
                  Development at the speed of thought
                </h2>
                <p className="text-zinc-500 text-lg leading-relaxed mb-8 font-light">
                  Termflux brings the power of native terminals to your browser. Multiple windows,
                  persistent sessions, and seamless collaboration—all without installing anything.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-4">
                  <FeatureItem icon={Terminal} label="Multi-Window Terminals" />
                  <FeatureItem icon={Layers} label="Session Persistence" />
                  <FeatureItem icon={GitBranch} label="Workflow Automation" />
                  <FeatureItem icon={Shield} label="Isolated Containers" />
                  <FeatureItem icon={Globe} label="Access from Anywhere" />
                  <FeatureItem icon={Sparkles} label="AI-Powered Tools" />
                </div>
              </div>
            </div>

            {/* Visual Side */}
            <div className="lg:col-span-7 relative">
              <div className="relative h-[600px] w-full rounded-[2.5rem] overflow-hidden group shadow-2xl bg-zinc-900">
                {/* Mock Terminal UI */}
                <div className="absolute inset-4 bg-[#0d0d12] rounded-2xl border border-white/10 overflow-hidden">
                  {/* Window Header */}
                  <div className="flex items-center gap-2 px-4 py-3 bg-white/5 border-b border-white/10">
                    <div className="flex gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500" />
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                    </div>
                    <span className="text-white/60 text-sm ml-4 font-mono">dev@termflux:~</span>
                  </div>
                  {/* Terminal Content */}
                  <div className="p-4 font-mono text-sm leading-relaxed">
                    <p className="text-white/60">
                      <span className="text-[#22d3ee]">→</span> Welcome to Termflux
                    </p>
                    <p className="text-white/40 mt-2">$ git clone repo && cd project</p>
                    <p className="text-white mt-1">Cloning into &apos;project&apos;...</p>
                    <p className="text-green-400">✓ Done in 2.3s</p>
                    <p className="text-white/40 mt-2">$ bun install</p>
                    <p className="text-white mt-1">Installing dependencies...</p>
                    <p className="text-green-400">✓ 847 packages installed</p>
                    <p className="text-white/40 mt-2">$ bun dev</p>
                    <p className="text-[#22d3ee] mt-1">
                      Server running at http://localhost:3000
                    </p>
                    <p className="text-white/40 mt-4">
                      <span className="animate-pulse">█</span>
                    </p>
                  </div>
                </div>

                {/* Floating UI Element */}
                <div className="absolute bottom-8 right-8 bg-white/10 backdrop-blur-xl p-4 rounded-xl border border-white/20">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-400" />
                    <span className="text-white text-sm font-medium">3 terminals active</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PRICING SECTION */}
        <section id="pricing" className="mt-32 px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl sm:text-5xl font-medium tracking-tight text-zinc-900 mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-zinc-500 text-lg max-w-2xl mx-auto">
              Start free, scale as you grow. No hidden fees, no surprises.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <PricingCard
              title="Starter"
              price="$0"
              description="Perfect for personal projects and learning"
              features={[
                "2 workspaces",
                "1 GB memory per workspace",
                "5 GB storage",
                "Community support",
              ]}
            />
            <PricingCard
              title="Pro"
              price="$29"
              description="For professional developers and small teams"
              features={[
                "Unlimited workspaces",
                "8 GB memory per workspace",
                "50 GB storage",
                "Workflow automation",
                "Priority support",
              ]}
              isPopular
            />
            <PricingCard
              title="Enterprise"
              price="Custom"
              description="For organizations with advanced needs"
              features={[
                "Custom resources",
                "SSO & SAML",
                "Dedicated infrastructure",
                "SLA guarantee",
                "24/7 support",
              ]}
            />
          </div>
        </section>

        {/* CTA SECTION */}
        <section className="mt-32">
          <div className="bg-zinc-900 rounded-[2.5rem] p-8 sm:p-12 lg:p-24 flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#22d3ee]/10 via-transparent to-[#3b82f6]/10" />

            <div className="relative z-10 max-w-3xl">
              <h2 className="text-4xl sm:text-6xl font-medium tracking-tight text-white mb-8">
                Ready to code in the cloud?
              </h2>
              <p className="text-white/60 text-xl mb-10 font-light leading-relaxed">
                Join thousands of developers who&apos;ve already made the switch. Start building in
                your browser today.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-3 bg-[#22d3ee] text-zinc-900 px-10 py-5 rounded-full hover:bg-[#22d3ee]/90 transition-all hover:scale-105 shadow-xl shadow-[#22d3ee]/20 text-lg font-medium"
                >
                  <span>Get Started Free</span>
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
              <p className="mt-8 text-sm text-white/40">No credit card required</p>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="py-8 px-6 flex flex-col md:flex-row items-center justify-between border-t border-zinc-200 gap-6 mt-12">
          <div className="flex items-center gap-2">
            <div className="bg-zinc-900 p-2 rounded-lg border border-zinc-800">
              <Terminal className="w-4 h-4 text-[#22d3ee]" />
            </div>
            <span className="text-zinc-900 font-bold tracking-tight">Termflux</span>
          </div>

          <div className="flex gap-8 text-sm font-medium text-zinc-500">
            <a href="#" className="hover:text-zinc-900 transition-colors">
              Documentation
            </a>
            <a href="#" className="hover:text-zinc-900 transition-colors">
              Pricing
            </a>
            <a href="#" className="hover:text-zinc-900 transition-colors">
              Changelog
            </a>
            <a href="#" className="hover:text-zinc-900 transition-colors">
              GitHub
            </a>
          </div>

          <div className="text-xs text-zinc-400 font-medium">
            © 2024 Termflux. All rights reserved.
          </div>
        </footer>
      </div>
    </div>
  );
}
