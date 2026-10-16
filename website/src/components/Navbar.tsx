import React, { useState } from 'react';
import { Github, Menu, X, Zap } from 'lucide-react';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: 'The Story', href: '#story' },
    { label: 'Architecture', href: '#trinity' },
    { label: 'Pipeline', href: '#pipeline' },
    { label: 'Benchmarks', href: '#benchmarks' },
    { label: 'Terminal', href: '#terminal' },
    { label: 'Install', href: '#downloads' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-black/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 font-mono">
        {/* Brand */}
        <a href="#" className="flex items-center gap-3 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ff640a]/10 border border-[#ff640a]/40 text-[#ff640a]">
            <Zap className="h-4 w-4 fill-[#ff640a]" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold tracking-tight text-white group-hover:text-[#ff640a] transition-colors">
              anime-cli
            </span>
            <span className="rounded bg-[#ff640a]/10 px-2 py-0.5 text-[10px] font-semibold text-[#ff640a] border border-[#ff640a]/30">
              v1.2.0
            </span>
          </div>
        </a>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8 text-xs text-zinc-400">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="transition-colors hover:text-white py-1"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Right Actions */}
        <div className="hidden sm:flex items-center gap-4">
          <a
            href="https://github.com/Hackedghost64/anime-cli"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-white/15 bg-white/5 text-xs text-white hover:border-[#ff640a] hover:text-[#ff640a] transition-all"
          >
            <Github className="w-3.5 h-3.5" />
            <span>Star on GitHub</span>
          </a>
        </div>

        {/* Mobile Hamburger */}
        <div className="flex md:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-zinc-400 hover:text-white"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-white/10 bg-black px-6 py-4 space-y-3 font-mono text-sm">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="block text-zinc-400 hover:text-white py-1"
            >
              {link.label}
            </a>
          ))}
          <a
            href="https://github.com/Hackedghost64/anime-cli"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs text-[#ff640a] pt-2"
          >
            <Github className="w-4 h-4" />
            <span>GitHub Repository</span>
          </a>
        </div>
      )}
    </header>
  );
};
