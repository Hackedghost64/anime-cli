import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Cpu, Terminal, Smartphone, Database, Zap, BookOpen, Layers } from 'lucide-react';

export interface BranchNode {
  id: string;
  label: string;
  badge?: string;
  icon?: React.ReactNode;
  children?: {
    id: string;
    label: string;
    href: string;
    tag?: string;
  }[];
}

interface BranchedMenuProps {
  drawDuration?: number;
  foldDuration?: number;
  className?: string;
  onSelect?: (id: string, href: string) => void;
}

export const BranchedMenu: React.FC<BranchedMenuProps> = ({
  drawDuration = 0.5,
  foldDuration = 0.3,
  className = '',
  onSelect,
}) => {
  const [expandedBranches, setExpandedBranches] = useState<Record<string, boolean>>({
    trinity: true,
    benchmarks: true,
    docs: false,
  });

  const branches: BranchNode[] = [
    {
      id: 'trinity',
      label: 'The Trinity Ecosystem',
      badge: '3-TIER',
      icon: <Layers className="w-4 h-4 text-cyber-cyan" />,
      children: [
        { id: 'anime-lite', label: 'anime-lite (C Edition ⚡)', href: '#anime-lite', tag: '<5ms' },
        { id: 'anime-cli', label: 'anime-cli (Python Hub 🐍)', href: '#anime-cli', tag: 'Full' },
        { id: 'shinsei-android', label: 'Shinsei Anime (Android 📱)', href: '#shinsei-android', tag: 'APK' },
        { id: 'config-json', label: 'Central config.json (SSOT ⚙️)', href: '#config-json', tag: 'Unified' },
      ],
    },
    {
      id: 'benchmarks',
      label: 'Speed & Metrics Matrix',
      badge: 'VS ANI-CLI',
      icon: <Zap className="w-4 h-4 text-cyber-green" />,
      children: [
        { id: 'startup', label: '3.8ms Cold Startup', href: '#benchmarks', tag: '3.8ms' },
        { id: 'resolution', label: '480ms Stream Hops', href: '#benchmarks', tag: '480ms' },
        { id: 'memory', label: '4MB RSS RAM Footprint', href: '#benchmarks', tag: '4MB' },
      ],
    },
    {
      id: 'cli-simulator',
      label: 'Live Terminal Simulator',
      badge: 'INTERACTIVE',
      icon: <Terminal className="w-4 h-4 text-cyber-orange" />,
      children: [
        { id: 'cmd-lite', label: 'anime-lite "naruto" -s', href: '#terminal', tag: 'fzf' },
        { id: 'cmd-binge', label: 'anime-cli -B (Roulette)', href: '#terminal', tag: 'Vibe' },
        { id: 'cmd-radar', label: 'anime-cli --today (Radar)', href: '#terminal', tag: 'Live' },
      ],
    },
    {
      id: 'docs',
      label: 'Documentation & Guide',
      badge: 'MANUAL',
      icon: <BookOpen className="w-4 h-4 text-cyber-purple" />,
      children: [
        { id: 'install', label: 'Universal 1-Click Install', href: '#install', tag: 'CLI' },
        { id: 'shortcuts', label: 'MPV & Web Player Shortcuts', href: '#shortcuts', tag: 'Keys' },
        { id: 'releases', label: 'Download Binaries & APK', href: '#downloads', tag: 'Releases' },
      ],
    },
  ];

  const toggleBranch = (branchId: string) => {
    setExpandedBranches((prev) => ({
      ...prev,
      [branchId]: !prev[branchId],
    }));
  };

  const handleItemClick = (id: string, href: string) => {
    if (onSelect) {
      onSelect(id, href);
    } else {
      const el = document.querySelector(href);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <div className={`relative font-mono select-none ${className}`}>
      {/* Root Node Header */}
      <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-800 bg-[#0c1017] shadow-cyber-card">
        <div className="flex h-7 w-7 items-center justify-center rounded bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan">
          <Cpu className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white tracking-wider">PROJECT_TREE</span>
            <span className="text-[10px] text-cyber-cyan font-semibold">ROOT://SHINSEI</span>
          </div>
          <p className="text-[10px] text-slate-400">Navigation & Architecture Schema</p>
        </div>
      </div>

      {/* Main Branches Container with SVG Connector Trunk */}
      <div className="relative pl-6 pt-3 space-y-4">
        {/* Main Vertical SVG Trunk Line */}
        <div className="absolute left-3 top-3 bottom-6 w-[2px] bg-gradient-to-b from-cyber-cyan/40 via-cyber-green/30 to-cyber-purple/20" />

        {branches.map((branch, index) => {
          const isExpanded = !!expandedBranches[branch.id];

          return (
            <div key={branch.id} className="relative">
              {/* Horizontal SVG Branch Connector */}
              <div className="absolute -left-3 top-4 w-3 h-[2px] bg-slate-700/80" />

              {/* Branch Header Button */}
              <button
                type="button"
                onClick={() => toggleBranch(branch.id)}
                className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-md border text-left transition-all duration-200 ${
                  isExpanded
                    ? 'border-cyber-cyan/40 bg-[#0f141d] text-white shadow-sm'
                    : 'border-slate-800/80 bg-[#090c10] text-slate-300 hover:border-slate-700 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={{ rotate: isExpanded ? 90 : 0 }}
                    transition={{ duration: foldDuration }}
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </motion.div>
                  {branch.icon}
                  <span className="text-xs font-semibold">{branch.label}</span>
                </div>

                {branch.badge && (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-slate-700 bg-slate-800/80 text-slate-400">
                    {branch.badge}
                  </span>
                )}
              </button>

              {/* Sub-Branch Children with Animated SVG Tree Lines */}
              <AnimatePresence initial={false}>
                {isExpanded && branch.children && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: foldDuration }}
                    className="relative pl-6 pt-2 space-y-1.5 overflow-hidden"
                  >
                    {/* Sub-branch vertical connector */}
                    <div className="absolute left-3 top-0 bottom-3 w-[1px] bg-slate-800" />

                    {branch.children.map((child) => (
                      <div key={child.id} className="relative flex items-center group">
                        {/* Sub-branch horizontal tick */}
                        <div className="absolute -left-3 top-1/2 w-3 h-[1px] bg-slate-800 group-hover:bg-cyber-cyan/60" />

                        <button
                          type="button"
                          onClick={() => handleItemClick(child.id, child.href)}
                          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs text-slate-400 hover:text-cyber-cyan hover:bg-cyber-cyan/5 transition-colors text-left"
                        >
                          <span className="group-hover:translate-x-1 transition-transform">
                            {child.label}
                          </span>
                          {child.tag && (
                            <span className="text-[9px] font-mono text-slate-500 group-hover:text-cyber-cyan/80">
                              {child.tag}
                            </span>
                          )}
                        </button>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
};
