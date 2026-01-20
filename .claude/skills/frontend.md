This is a reference implementation of a glassmorphism style

~~~/README.md
# Superdesign Landing Page

A premium, production-grade landing page component inspired by high-end real estate aesthetics but adapted for a SaaS AI product.

## Features

- **Sophisticated UI**: Deep stone/zinc color palette with crisp whites and glassmorphism.
- **Card-Based Layout**: Clean, modular content presentation.
- **Smooth Animations**: Framer Motion entrance effects and hover interactions.
- **Responsive Design**: Fully adaptive layout for mobile, tablet, and desktop.
- **Interactive Elements**: Hover states, form inputs, and navigation.

## Usage

```tsx
import { SuperdesignLanding } from '@/sd-components/ceb4321c-fcaf-4da2-9b77-648c2d1273b3';

function Page() {
  return <SuperdesignLanding />;
}
```

## Props

This component is currently built as a standalone page and does not accept props in its initial version. Customization can be done by modifying the `Component.tsx` file directly.

## Dependencies

- `framer-motion`: For animations
- `lucide-react`: For icons
- `clsx` & `tailwind-merge`: For class handling
- `tailwindcss`: For styling
~~~

~~~/src/App.tsx
import React from 'react';
import { SuperdesignLanding } from './Component';

export default function App() {
  return (
    <div className="w-full min-h-screen">
      <SuperdesignLanding />
    </div>
  );
}
~~~

~~~/package.json
{
  "name": "superdesign-landing",
  "description": "A premium AI product designer landing page component",
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "lucide-react": "^0.300.0",
    "framer-motion": "^10.16.4",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0"
  }
}
~~~

~~~/src/Component.tsx
import React, { useState, useEffect } from 'react';
import { 
  Menu, 
  X, 
  ArrowRight, 
  ArrowUpRight, 
  Play, 
  Sparkles, 
  Layers, 
  Zap, 
  Palette, 
  MousePointer2,
  Box,
  CheckCircle2,
  Download,
  Terminal,
  Cpu
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for merging tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

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
  delay = 0
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
  image, 
  features,
  isPopular = false 
}: { 
  title: string; 
  price: string; 
  description: string; 
  image: string; 
  features: string[];
  isPopular?: boolean;
}) => (
  <div className="group relative bg-white p-2 rounded-3xl shadow-sm hover:shadow-xl transition-all duration-500 border border-zinc-100 hover:border-zinc-200">
    <div className="h-64 rounded-2xl overflow-hidden mb-4 relative">
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-10" />
      <img 
        src={image} 
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
        alt={title} 
      />
      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold z-20 text-zinc-900 shadow-lg">
        {price}
      </div>
      {isPopular && (
        <div className="absolute top-4 left-4 bg-zinc-900 px-3 py-1 rounded-full text-xs font-semibold z-20 text-white shadow-lg">
          Popular
        </div>
      )}
      <div className="absolute bottom-4 left-4 z-20">
        <h3 className="text-xl font-semibold text-white mb-1">{title}</h3>
      </div>
    </div>
    <div className="px-4 pb-6">
      <p className="text-zinc-500 text-sm mb-6 leading-relaxed min-h-[40px]">{description}</p>
      
      <div className="space-y-2 mb-6">
        {features.slice(0, 3).map((feature, idx) => (
          <div key={idx} className="flex items-center gap-2 text-xs text-zinc-600">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            <span>{feature}</span>
          </div>
        ))}
      </div>

      <button className="w-full py-3 rounded-xl border border-zinc-200 text-zinc-900 font-medium hover:bg-zinc-900 hover:text-white transition-colors flex items-center justify-center gap-2 group/btn">
        Start Creating <ArrowUpRight className="w-4 h-4 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
      </button>
    </div>
  </div>
);

export function SuperdesignLanding() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#F4F4F5] text-zinc-900 font-sans selection:bg-zinc-900 selection:text-white pb-20">
      
      {/* Main Container */}
      <div className="max-w-[1600px] mx-auto p-2 sm:p-4 lg:p-6">
        
        {/* HERO SECTION */}
        <header className="relative w-full h-[92vh] min-h-[700px] rounded-[2.5rem] overflow-hidden bg-zinc-900 shadow-2xl ring-1 ring-zinc-900/5">
          
          {/* Abstract Background */}
          <div className="absolute inset-0 z-0">
             <img 
              src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop" 
              alt="Abstract Fluid Art" 
              className="w-full h-full object-cover opacity-60 mix-blend-color-dodge transition-transform duration-[30s] hover:scale-110 ease-linear"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/40 via-zinc-950/20 to-zinc-950/90" />
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
          </div>

          {/* Navigation */}
          <nav className="relative z-20 flex items-center justify-between px-6 py-6 sm:px-10">
            {/* Logo */}
            <div className="flex items-center gap-3 group cursor-pointer">
              <div className="bg-white/10 backdrop-blur-md p-2.5 rounded-xl border border-white/10 group-hover:bg-white/20 transition-all duration-300">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-white text-lg font-medium tracking-tight">Superdesign.</span>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-1 bg-zinc-900/30 backdrop-blur-xl border border-white/10 rounded-full p-1.5 px-2 shadow-lg shadow-black/5">
              <NavLink href="#features">Capabilities</NavLink>
              <NavLink href="#solutions">Solutions</NavLink>
              <NavLink href="#showcase">Showcase</NavLink>
              <NavLink href="#pricing">Pricing</NavLink>
            </div>

            {/* Mobile Menu Toggle */}
            <button className="md:hidden p-3 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-colors">
              <Menu className="w-6 h-6" />
            </button>

            {/* Actions */}
            <div className="hidden md:flex items-center gap-3">
              <button className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 backdrop-blur-md border border-white/10 text-white hover:bg-white/20 transition-all">
                <Terminal className="w-4 h-4" />
              </button>
              <a href="#demo" className="group flex items-center gap-3 bg-white pl-5 pr-1.5 py-1.5 rounded-full transition-all hover:scale-105 hover:shadow-xl hover:shadow-white/10">
                <span className="text-sm font-medium text-zinc-900">Start Free Trial</span>
                <span className="w-8 h-8 bg-zinc-900 rounded-full flex items-center justify-center group-hover:bg-zinc-800 transition-colors">
                  <ArrowUpRight className="w-4 h-4 text-white" />
                </span>
              </a>
            </div>
          </nav>

          {/* Large Background Text */}
          <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none opacity-[0.03] select-none overflow-hidden">
            <h1 className="text-[20vw] font-bold text-white tracking-tighter leading-none whitespace-nowrap blur-sm">CREATE</h1>
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
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                v2.0 Now Available
              </motion.div>
              
              <motion.h1 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-5xl sm:text-6xl lg:text-7xl text-white font-medium tracking-tight leading-[1.05] mb-8"
              >
                Design at the speed of <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/50">thought.</span>
              </motion.h1>
              
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-lg text-white/70 max-w-xl font-light leading-relaxed mb-10"
              >
                The world's most advanced AI product designer. Generate production-ready UI, design systems, and prototypes in minutes, not weeks.
              </motion.p>
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="flex flex-wrap gap-4"
              >
                <button className="group inline-flex items-center gap-4 bg-white text-zinc-900 pl-6 pr-2 py-2 rounded-full hover:shadow-lg hover:shadow-white/20 transition-all duration-300">
                  <span className="text-base font-medium">See it in action</span>
                  <span className="w-10 h-10 bg-zinc-900 rounded-full flex items-center justify-center group-hover:bg-zinc-700 transition-colors">
                    <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                  </span>
                </button>
                
                <button className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-white/20 text-white hover:bg-white/10 transition-colors backdrop-blur-md font-medium">
                  View Components
                </button>
              </motion.div>
            </div>

            {/* Stats Cards */}
            <div className="flex flex-col gap-4 w-full lg:w-auto">
              <StatsCard 
                value="10x" 
                label="Faster design iterations with AI-assisted layout generation."
                icon={Zap}
                delay={0.4}
              />
              <StatsCard 
                value="100+" 
                label="Export-ready components across React, Vue, and Swift."
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
                  Intelligent Design System
                </h2>
                <p className="text-zinc-500 text-lg leading-relaxed mb-8 font-light">
                  Superdesign isn't just a tool; it's a creative partner that understands your brand language. It maintains consistency across thousands of screens while suggesting meaningful UX improvements.
                </p>
                <p className="text-zinc-500 text-base leading-relaxed mb-10">
                  From typography scales to accessible color palettes, our engine ensures every pixel serves a purpose. Stop fighting with Figma auto-layout and start shipping.
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-4">
                  <FeatureItem icon={Palette} label="Adaptive Color Palettes" />
                  <FeatureItem icon={Layers} label="Smart Layer Management" />
                  <FeatureItem icon={MousePointer2} label="Interaction Prototyping" />
                  <FeatureItem icon={Cpu} label="AI Content Generation" />
                  <FeatureItem icon={Terminal} label="React Code Export" />
                  <FeatureItem icon={CheckCircle2} label="WCAG 2.1 Compliance" />
                </div>
              </div>
            </div>

            {/* Visual Side */}
            <div className="lg:col-span-7 relative">
              <div className="relative h-[600px] w-full rounded-[2.5rem] overflow-hidden group shadow-2xl">
                <img 
                  src="https://images.unsplash.com/photo-1600607686527-6fb886090705?q=80&w=2700&auto=format&fit=crop" 
                  alt="App Interface Design" 
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 hidden"
                />
                <img 
                   src="https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=2574&auto=format&fit=crop"
                   alt="Design Interface"
                   className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                
                {/* Floating UI Elements Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                
                <div className="absolute bottom-8 left-8 right-8">
                  <div className="bg-white/10 backdrop-blur-xl p-6 rounded-2xl border border-white/20 inline-block w-full">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">System Analysis</span>
                      <div className="flex gap-1">
                        <div className="w-2 h-2 rounded-full bg-red-400"></div>
                        <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                        <div className="w-2 h-2 rounded-full bg-green-400"></div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="h-2 bg-white/20 rounded-full w-3/4"></div>
                      <div className="h-2 bg-white/20 rounded-full w-1/2"></div>
                      <div className="h-2 bg-white/10 rounded-full w-full"></div>
                    </div>
                    <div className="mt-6 flex items-center gap-3">
                      <div className="flex -space-x-2">
                         <div className="w-8 h-8 rounded-full bg-blue-500 border-2 border-zinc-900 flex items-center justify-center text-xs text-white font-bold">AI</div>
                         <div className="w-8 h-8 rounded-full bg-purple-500 border-2 border-zinc-900 flex items-center justify-center text-xs text-white font-bold">UX</div>
                      </div>
                      <p className="text-white text-sm font-medium">Generating 12 variants...</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* MARKET INSIGHT / DARK SECTION */}
        <section className="mt-32 bg-zinc-900 text-white rounded-[2.5rem] overflow-hidden relative">
          <div className="absolute inset-0 opacity-30">
            <img 
              src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2670&auto=format&fit=crop" 
              alt="Cyberpunk City" 
              className="w-full h-full object-cover grayscale mix-blend-overlay"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-zinc-900/40"></div>
          
          <div className="relative z-10 p-8 sm:p-16 lg:p-24 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-zinc-400 font-medium tracking-wide uppercase text-sm mb-4 block">Productivity Engine</span>
              <h2 className="text-4xl sm:text-5xl font-medium tracking-tight mb-8">Built for the future of product development.</h2>
              <p className="text-zinc-300 text-lg font-light leading-relaxed mb-10">
                Superdesign integrates seamlessly into your existing workflow, acting as a force multiplier for your design team. What used to take days now happens in real-time during your standup.
              </p>
              
              <div className="space-y-6 mb-10">
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-2xl border border-white/10 flex items-center justify-center bg-white/5 text-xl font-bold">
                    01
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Import from Figma</h4>
                    <p className="text-zinc-400 text-sm">Two-way sync keeps everything updated.</p>
                  </div>
                </div>
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-2xl border border-white/10 flex items-center justify-center bg-white/5 text-xl font-bold">
                    02
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Generate Variations</h4>
                    <p className="text-zinc-400 text-sm">Explore divergent ideas instantly.</p>
                  </div>
                </div>
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-2xl border border-white/10 flex items-center justify-center bg-white/5 text-xl font-bold">
                    03
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Export Code</h4>
                    <p className="text-zinc-400 text-sm">Clean, semantic, accessible code.</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 max-w-md">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-emerald-400 text-sm font-medium">Efficiency Gain</span>
                </div>
                <p className="text-sm text-zinc-300">
                  Teams using Superdesign report a 60% reduction in "pixel-pushing" time, allowing designers to focus on strategic user experience problems.
                </p>
              </div>
            </div>
            
            {/* Abstract Graphic Right */}
            <div className="relative h-full min-h-[400px] flex items-center justify-center">
               <div className="relative w-full max-w-md aspect-square">
                 <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-purple-500/20 rounded-full blur-[100px]"></div>
                 <div className="relative bg-zinc-800/50 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-500">
                    <div className="flex justify-between items-center mb-8">
                       <div className="w-12 h-12 rounded-full bg-white/10"></div>
                       <div className="w-24 h-4 bg-white/10 rounded-full"></div>
                    </div>
                    <div className="space-y-4">
                       <div className="h-32 w-full bg-white/5 rounded-xl border border-white/5"></div>
                       <div className="grid grid-cols-2 gap-4">
                          <div className="h-24 w-full bg-white/5 rounded-xl border border-white/5"></div>
                          <div className="h-24 w-full bg-white/5 rounded-xl border border-white/5"></div>
                       </div>
                    </div>
                 </div>
                 
                 <div className="absolute -bottom-6 -right-6 bg-white text-zinc-900 p-4 rounded-xl shadow-xl flex items-center gap-3 animate-bounce duration-[3000ms]">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span className="font-semibold">Code Exported</span>
                 </div>
               </div>
            </div>
          </div>
        </section>

        {/* SOLUTIONS / USE CASES */}
        <section id="solutions" className="mt-32 px-4 sm:px-6">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12">
            <div className="max-w-xl">
              <h2 className="text-3xl sm:text-4xl font-medium tracking-tight text-zinc-900 mb-4">Tailored Solutions</h2>
              <p className="text-zinc-500 font-light text-lg">Whether you're a solo founder or a Fortune 500 design team, Superdesign scales to meet your complexity.</p>
            </div>
            <a href="#demo" className="hidden md:flex items-center gap-2 text-zinc-900 font-medium hover:opacity-70 transition-opacity mt-4 md:mt-0 group">
              View all capabilities <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <PricingCard 
              title="Startup MVP" 
              price="Speed"
              description="Rapidly prototype and validate ideas. Go from concept to clickable demo in one afternoon."
              image="https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=2670&auto=format&fit=crop"
              features={["Wireframe to UI", "Clickable Prototypes", "Basic Design System"]}
            />
            
            <PricingCard 
              title="Enterprise System" 
              price="Scale"
              description="Maintain consistency across hundreds of products. Centralized governance for global teams."
              image="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2670&auto=format&fit=crop"
              features={["Token Management", "Permission Controls", "Version History"]}
              isPopular={true}
            />
            
            <PricingCard 
              title="Freelance Pro" 
              price="Quality"
              description="Deliver agency-quality work without the agency headcount. Impress clients with speed."
              image="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=2670&auto=format&fit=crop"
              features={["Client Presentation Mode", "Asset Export", "White-labeling"]}
            />
          </div>
        </section>

        {/* LEAD MAGNET / CTA */}
        <section className="mt-32">
          <div className="bg-zinc-100 rounded-[2.5rem] p-8 sm:p-12 lg:p-24 flex flex-col items-center text-center relative overflow-hidden border border-zinc-200">
            {/* Decorative blurred circles */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-[100px] opacity-20 -translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-[100px] opacity-20 translate-x-1/2 translate-y-1/2"></div>

            <div className="relative z-10 max-w-3xl">
              <span className="text-zinc-500 font-medium uppercase text-xs tracking-wider mb-6 block">Limited Access</span>
              <h2 className="text-4xl sm:text-6xl font-medium tracking-tight text-zinc-900 mb-8">Ready to design the impossible?</h2>
              <p className="text-zinc-600 text-xl mb-10 font-light leading-relaxed">
                Join 10,000+ designers who have already accelerated their workflow. Get early access to Superdesign 2.0 and start creating today.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <a href="#demo" className="inline-flex items-center gap-3 bg-zinc-900 text-white px-10 py-5 rounded-full hover:bg-zinc-800 transition-all hover:scale-105 shadow-xl shadow-zinc-900/10 text-lg font-medium">
                  <span>Start Free Trial</span>
                  <ArrowRight className="w-5 h-5" />
                </a>
                <button className="inline-flex items-center gap-2 px-8 py-5 rounded-full text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/50 transition-colors font-medium">
                  <Download className="w-5 h-5" /> Download Mac App
                </button>
              </div>
              <p className="mt-8 text-sm text-zinc-400">No credit card required. 14-day free trial.</p>
            </div>
          </div>
        </section>

        {/* VIDEO SHOWCASE */}
        <section id="showcase" className="mt-32 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center px-4 sm:px-6">
          {/* Video Column */}
          <div className="relative w-full aspect-video rounded-[2rem] overflow-hidden shadow-2xl group cursor-pointer bg-black ring-1 ring-black/5">
            <img 
              src="https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=2574&auto=format&fit=crop" 
              className="w-full h-full object-cover opacity-80 group-hover:opacity-60 transition-opacity duration-500 scale-105 group-hover:scale-100" 
              alt="Dashboard Interface"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 group-hover:scale-110 transition-transform duration-300 shadow-2xl">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center pl-1 shadow-inner">
                  <Play className="w-6 h-6 text-zinc-900 fill-zinc-900" />
                </div>
              </div>
            </div>
          </div>

          {/* Text Content */}
          <div>
            <h2 className="text-3xl sm:text-4xl font-medium tracking-tight text-zinc-900 mb-8">Why top teams switch to Superdesign</h2>
            <div className="prose prose-zinc mb-10">
              <p className="text-zinc-500 text-lg leading-relaxed font-light">
                We're not trying to replace designers. We're removing the mundane parts of the job so you can focus on the human aspects—empathy, strategy, and delight.
              </p>
            </div>

            <div className="space-y-6">
              {[
                "Zero-config setup for React & Tailwind projects",
                "Automated accessibility auditing built-in",
                "Seamless handoff with generated storybooks",
                "Real-time collaboration with multiplayer cursor"
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="mt-1 bg-zinc-100 p-1 rounded-full">
                    <CheckCircle2 className="w-4 h-4 text-zinc-900" />
                  </div>
                  <span className="text-zinc-700 font-medium">{item}</span>
                </div>
              ))}
            </div>

            <div className="mt-10 pt-10 border-t border-zinc-200">
              <div className="flex items-center gap-4">
                 <div className="flex -space-x-4">
                    <img className="w-12 h-12 rounded-full border-2 border-white" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop" alt="User" />
                    <img className="w-12 h-12 rounded-full border-2 border-white" src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=200&auto=format&fit=crop" alt="User" />
                    <img className="w-12 h-12 rounded-full border-2 border-white" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop" alt="User" />
                 </div>
                 <div>
                    <p className="text-zinc-900 font-semibold">Loved by 10,000+ Designers</p>
                    <div className="flex text-yellow-400 text-xs">★★★★★</div>
                 </div>
              </div>
            </div>
          </div>
        </section>

        {/* CONTACT / FOOTER SECTION */}
        <section id="contact" className="mt-32 mb-12">
          <div className="bg-white rounded-[2.5rem] p-8 sm:p-12 lg:p-16 shadow-xl border border-zinc-100 flex flex-col lg:flex-row gap-12 lg:gap-24 overflow-hidden relative">
            
            <div className="lg:w-1/2 relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 text-xs font-semibold tracking-wider text-zinc-500 uppercase bg-zinc-100 rounded-full">
                Contact Sales
              </div>
              <h2 className="text-4xl sm:text-5xl font-medium tracking-tight text-zinc-900 mb-6">Get in touch</h2>
              <p className="text-zinc-500 text-lg font-light mb-10 max-w-md">
                Have questions about enterprise plans or custom integrations? Our team is ready to help you scale your design operations.
              </p>
              
              <div className="space-y-8">
                <div className="flex items-center gap-5 group">
                  <div className="w-14 h-14 rounded-2xl bg-zinc-50 flex items-center justify-center group-hover:bg-zinc-900 group-hover:text-white transition-all duration-300 shadow-sm border border-zinc-100">
                    <Terminal className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="block text-sm text-zinc-400 font-medium mb-1">Email Support</span>
                    <a href="mailto:hello@superdesign.ai" className="text-xl font-medium text-zinc-900 hover:text-emerald-600 transition-colors">hello@superdesign.ai</a>
                  </div>
                </div>
                <div className="flex items-center gap-5 group">
                  <div className="w-14 h-14 rounded-2xl bg-zinc-50 flex items-center justify-center group-hover:bg-zinc-900 group-hover:text-white transition-all duration-300 shadow-sm border border-zinc-100">
                    <Box className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="block text-sm text-zinc-400 font-medium mb-1">Schedule Demo</span>
                    <a href="#" className="text-xl font-medium text-zinc-900 hover:text-emerald-600 transition-colors">Book a 15-min call</a>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:w-1/2 bg-zinc-50/50 rounded-[2rem] p-8 border border-zinc-100 relative">
              <form className="space-y-5 relative z-10">
                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">First Name</label>
                    <input type="text" className="w-full bg-white border-0 rounded-xl px-4 py-4 text-zinc-900 placeholder-zinc-300 focus:ring-2 focus:ring-zinc-900 focus:outline-none transition-all shadow-sm" placeholder="Alice" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Last Name</label>
                    <input type="text" className="w-full bg-white border-0 rounded-xl px-4 py-4 text-zinc-900 placeholder-zinc-300 focus:ring-2 focus:ring-zinc-900 focus:outline-none transition-all shadow-sm" placeholder="Designer" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Work Email</label>
                  <input type="email" className="w-full bg-white border-0 rounded-xl px-4 py-4 text-zinc-900 placeholder-zinc-300 focus:ring-2 focus:ring-zinc-900 focus:outline-none transition-all shadow-sm" placeholder="alice@company.com" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Company Size</label>
                  <select className="w-full bg-white border-0 rounded-xl px-4 py-4 text-zinc-900 focus:ring-2 focus:ring-zinc-900 focus:outline-none transition-all shadow-sm appearance-none cursor-pointer">
                    <option>1-10 employees</option>
                    <option>11-50 employees</option>
                    <option>50-200 employees</option>
                    <option>200+ employees</option>
                  </select>
                </div>
                
                <button type="button" className="w-full bg-zinc-900 text-white font-medium py-4 rounded-xl mt-4 hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 group shadow-lg shadow-zinc-900/10">
                  Request Access
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </form>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="py-8 px-6 flex flex-col md:flex-row items-center justify-between border-t border-zinc-200 gap-6 mt-12">
          <div className="flex items-center gap-2">
            <div className="bg-zinc-900 p-2 rounded-lg border border-zinc-800">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-zinc-900 font-bold tracking-tight">Superdesign.</span>
          </div>

          <div className="flex gap-8 text-sm font-medium text-zinc-500">
            <a href="#" className="hover:text-zinc-900 transition-colors">Manifesto</a>
            <a href="#" className="hover:text-zinc-900 transition-colors">Pricing</a>
            <a href="#" className="hover:text-zinc-900 transition-colors">Changelog</a>
            <a href="#" className="hover:text-zinc-900 transition-colors">Twitter</a>
          </div>

          <div className="text-xs text-zinc-400 font-medium">
            © 2024 Superdesign Inc. All rights reserved.
          </div>
        </footer>

      </div>
    </div>
  );
}

export default SuperdesignLanding;
~~~

Please use the above as reference and build the new design