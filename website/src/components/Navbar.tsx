import React, { useState } from 'react';
import { Terminal, Github, Star, Zap, Cpu, Menu, X, Play } from 'lucide-react';
import { DecryptedText } from './DecryptedText';

interface NavbarProps {
  onReplayBootloader: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onReplayBootloader }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: 'The Story', href: '#story' },
    { label: 'The Trinity', href: '#trinity' },
    { label: 'Benchmarks', href: '#benchmarks' },
    { label: 'Terminal Sim', href: '#terminal' },
    { label: 'Downloads', href: '#downloads' },
    { label: 'Docs', href: '#docs' },
  ];

  return (
    <header className="sticky top-0 z-30 w-full border-b border-slate-800/80 bg-[#08090a]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 font-mono">
        {/* Brand */}
        <a href="#" className="flex items-center gap-3 group cursor-target" data-target-label="SHINSEI_HOME">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#5f8bff]/10 border border-[#5f8bff]/40 text-cyber-cyan shadow-glow-cyan transition-transform group-hover:scale-105">
            <Zap className="h-5 w-5 fill-cyber-cyan/20" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-white group-hover:text-cyber-cyan transition-colors">
                <DecryptedText text="anime-cli" speed={30} />
              </span>
              <span className="rounded bg-cyber-cyan/10 px-1.5 py-0.5 text-[10px] font-semibold text-cyber-cyan border border-cyber-cyan/30">
                v1.2.0
              </span>
            </div>
            <span className="text-[10px] text-slate-400 tracking-wider">C99 • PYTHON • ANDROID</span>
          </div>
        </a>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6 text-xs text-slate-300">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="transition-colors hover:text-cyber-cyan py-1"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Right Actions */}
        <div className="hidden sm:flex items-center gap-3">
          <button
            type="button"
            onClick={onReplayBootloader}
            title="Re-run BIOS Bootloader"
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/60 px-2.5 py-1.5 text-xs text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
          >
            <Cpu className="h-3.5 w-3.5 text-cyber-cyan" />
            <span className="hidden lg:inline text-[11px]">BIOS</span>
          </button>

          <a
            href="https://github.com/Hackedghost64/anime-cli"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg border border-slate-700/80 bg-[#0e131b] px-3 py-1.5 text-xs text-white hover:border-cyber-cyan hover:shadow-glow-cyan transition-all cursor-target"
            data-target-label="GITHUB_REPO"
          >
            <Github className="h-4 w-4" />
            <span className="font-semibold">Star</span>
            <span className="flex items-center gap-1 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-amber-400">
              <Star className="h-3 w-3 fill-amber-400" />
              <span>v1.2</span>
            </span>
          </a>

          <a
            href="#install"
            className="flex items-center gap-1.5 rounded-lg bg-cyber-cyan/20 border border-cyber-cyan/50 px-3.5 py-1.5 text-xs font-semibold text-cyber-cyan hover:bg-cyber-cyan hover:text-slate-950 transition-all cursor-target"
            data-target-label="INSTALL_NOW"
          >
            <Terminal className="h-3.5 w-3.5" />
            <span>Install</span>
          </a>
        </div>

        {/* Mobile menu toggle */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-slate-400 hover:text-white"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-800 bg-[#08090a] px-4 py-4 font-mono text-sm space-y-3">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="block text-slate-300 hover:text-cyber-cyan py-1"
            >
              {link.label}
            </a>
          ))}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onReplayBootloader();
              }}
              className="flex items-center gap-1.5 text-xs text-slate-400"
            >
              <Cpu className="h-4 w-4 text-cyber-cyan" />
              Replay BIOS
            </button>
            <a
              href="https://github.com/Hackedghost64/anime-cli"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-white"
            >
              <Github className="h-4 w-4" />
              GitHub
            </a>
          </div>
        </div>
      )}
    </header>
  );
};
