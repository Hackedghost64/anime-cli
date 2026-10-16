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
      icon: <Layers className="w-4 h-4 text-[#ff640a]" />,
      children: [
        { id: 'anime-lite', label: 'anime-lite (C Edition)', href: '#anime-lite', tag: '3.8ms' },
        { id: 'anime-cli', label: 'anime-cli (Python Hub)', href: '#anime-cli', tag: 'Full' },
        { id: 'shinsei-android', label: 'Shinsei Anime (Android)', href: '#shinsei-android', tag: 'APK' },
        { id: 'config-json', label: 'Central config.json (SSOT)', href: '#config-json', tag: 'Sync' },
      ],
    },
    {
      id: 'benchmarks',
      label: 'Speed & Metrics Matrix',
      badge: 'EMPIRICAL',
      icon: <Zap className="w-4 h-4 text-[#ff640a]" />,
      children: [
        { id: 'startup', label: '3.8ms Cold Startup', href: '#benchmarks', tag: '3.8ms' },
        { id: 'resolution', label: '480ms Stream Hops', href: '#benchmarks', tag: '480ms' },
        { id: 'memory', label: '4.1MB RSS RAM Footprint', href: '#benchmarks', tag: '4.1MB' },
      ],
    },
    {
      id: 'docs',
      label: 'Player Controls & Manual',
      badge: 'SHORTCUTS',
      icon: <BookOpen className="w-4 h-4 text-[#ff640a]" />,
      children: [
        { id: 'shortcuts-mpv', label: 'MPV Native Controls', href: '#shortcuts', tag: 'mpv' },
        { id: 'shortcuts-web', label: 'Obsidian Web PWA Controls', href: '#shortcuts', tag: 'web' },
        { id: 'api-spec', label: 'Kyoto HLS Protocol Spec', href: '#pipeline', tag: 'hls' },
      ],
    },
  ];

  const toggleBranch = (id: string) => {
    setExpandedBranches((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <div className={`font-mono text-xs select-none ${className}`}>
      <div className="space-y-3">
        {branches.map((branch) => {
          const isExpanded = !!expandedBranches[branch.id];

          return (
            <div key={branch.id} className="rounded-xl border border-white/5 bg-black p-3">
              {/* Branch Trunk Header */}
              <button
                type="button"
                onClick={() => toggleBranch(branch.id)}
                className="w-full flex items-center justify-between text-left group text-white hover:text-[#ff640a] transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span className="p-1.5 rounded-lg bg-zinc-900 border border-white/5 group-hover:border-[#ff640a]/30 transition-colors">
                    {branch.icon}
                  </span>
                  <span className="font-semibold text-xs text-white group-hover:text-[#ff640a] transition-colors">
                    {branch.label}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {branch.badge && (
                    <span className="rounded border border-white/10 bg-zinc-900 px-1.5 py-0.5 text-[9px] text-zinc-400">
                      {branch.badge}
                    </span>
                  )}
                  <ChevronRight
                    className={`w-3.5 h-3.5 text-zinc-500 transition-transform duration-200 ${
                      isExpanded ? 'rotate-90 text-[#ff640a]' : ''
                    }`}
                  />
                </div>
              </button>

              {/* Branch Children */}
              <AnimatePresence initial={false}>
                {isExpanded && branch.children && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden pl-6 pt-3 space-y-1 relative"
                  >
                    {/* SVG Connector Line */}
                    <div className="absolute left-3 top-3 bottom-3 w-[1px] bg-white/10" />

                    {branch.children.map((child) => (
                      <a
                        key={child.id}
                        href={child.href}
                        onClick={(e) => {
                          if (onSelect) {
                            e.preventDefault();
                            onSelect(child.id, child.href);
                          }
                        }}
                        className="group flex items-center justify-between py-1.5 px-3 rounded-lg hover:bg-zinc-900 text-zinc-400 hover:text-white transition-all text-xs"
                      >
                        <span className="truncate group-hover:text-white">
                          {child.label}
                        </span>
                        {child.tag && (
                          <span className="rounded bg-black border border-white/10 px-1.5 py-0.2 text-[10px] text-zinc-500 group-hover:text-[#ff640a] group-hover:border-[#ff640a]/30 transition-colors">
                            {child.tag}
                          </span>
                        )}
                      </a>
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
