import Link from "next/link";
import { Terminal } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-[#0d0d14] to-[#0a0a0f] border-r border-white/5">
        <div className="absolute inset-0 bg-gradient-to-br from-[#22d3ee]/5 via-transparent to-[#3b82f6]/5" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
          }}
        />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <Link href="/" className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/10 border border-white/10">
              <Terminal className="w-5 h-5 text-[#22d3ee]" />
            </div>
            <span className="text-white text-xl font-semibold tracking-tight">Termflux</span>
          </Link>

          <div className="max-w-md">
            <h1 className="text-4xl font-semibold text-white leading-tight mb-6">
              Cloud terminals
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#22d3ee] to-[#3b82f6]">
                without limits.
              </span>
            </h1>
            <p className="text-white/50 text-lg leading-relaxed">
              Browser-native development environments with Ghostty-like UX. Code from anywhere.
            </p>
          </div>

          <div className="flex items-center gap-4 text-sm text-white/40">
            <span>© 2024 Termflux</span>
            <span>•</span>
            <a href="#" className="hover:text-white/60 transition-colors">
              Privacy
            </a>
            <span>•</span>
            <a href="#" className="hover:text-white/60 transition-colors">
              Terms
            </a>
          </div>
        </div>
      </div>

      {/* Right side - Auth form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
