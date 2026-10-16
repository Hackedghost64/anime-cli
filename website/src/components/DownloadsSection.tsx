import React, { useState } from 'react';
import { Download, Smartphone, Cpu, Package, Check, Copy, Terminal } from 'lucide-react';

interface ReleaseCard {
  title: string;
  category: 'android' | 'linux' | 'python' | 'universal';
  version: string;
  size: string;
  filename: string;
  downloadUrl: string;
  command?: string;
  features: string[];
  recommended?: boolean;
}

const RELEASES: ReleaseCard[] = [
  {
    title: 'Shinsei Anime Android App',
    category: 'android',
    version: 'v1.2.0',
    size: '12.8 MB',
    filename: 'ShinseiAnime-Release.apk',
    downloadUrl: 'https://github.com/Hackedghost64/anime-cli/releases/latest/download/ShinseiAnime-Release.apk',
    command: 'adb install -r ShinseiAnime-Release.apk',
    features: ['100% Standalone (No PC required)', 'Jetpack Compose Touch Gestures', '18+ Safe Filtering', 'Kyoto 1080p Mobile HLS'],
    recommended: true,
  },
  {
    title: 'anime-lite C Binary (x86_64)',
    category: 'linux',
    version: 'v1.2.0',
    size: '480 KB',
    filename: 'anime-lite-linux-x86_64',
    downloadUrl: 'https://github.com/Hackedghost64/anime-cli/releases/latest/download/anime-lite-linux-x86_64',
    command: 'chmod +x anime-lite-linux-x86_64 && mv anime-lite-linux-x86_64 ~/.local/bin/anime-lite',
    features: ['Sub-5ms Cold Startup', 'Pure C99 + libcurl', 'Native fzf Picker', 'Instant -c Resume'],
    recommended: true,
  },
  {
    title: 'anime-lite C Binary (ARM64 / Pi)',
    category: 'linux',
    version: 'v1.2.0',
    size: '460 KB',
    filename: 'anime-lite-linux-aarch64',
    downloadUrl: 'https://github.com/Hackedghost64/anime-cli/releases/latest/download/anime-lite-linux-aarch64',
    command: 'chmod +x anime-lite-linux-aarch64 && mv anime-lite-linux-aarch64 ~/.local/bin/anime-lite',
    features: ['Raspberry Pi & ARM Laptops', 'Termux on Android Support', 'Ultra-Lean 4.1MB RAM', 'Direct Kyoto Streams'],
  },
  {
    title: 'anime-cli Python Hub Package',
    category: 'python',
    version: 'v1.2.0',
    size: '1.4 MB',
    filename: 'anime-cli-sdist.tar.gz',
    downloadUrl: 'https://github.com/Hackedghost64/anime-cli/releases',
    command: 'pip install --user anime-cli',
    features: ['AniSkip Automated MPV Lua', 'Binge Roulette (-B)', 'Live Airing Radar (--today)', 'Batch Downloader (-o)'],
  },
];

export const DownloadsSection: React.FC = () => {
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const handleCopy = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(cmd);
    setTimeout(() => setCopiedCmd(null), 1800);
  };

  const unixInstall = 'curl -fsSL https://raw.githubusercontent.com/Hackedghost64/anime-cli/main/install.sh | bash';
  const winInstall = 'irm https://raw.githubusercontent.com/Hackedghost64/anime-cli/main/install-windows.ps1 | iex';

  return (
    <section id="downloads" className="py-24 border-t border-white/10 bg-black text-white font-mono">
      <div className="mx-auto max-w-6xl px-6">
        
        {/* Header */}
        <div className="max-w-3xl mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-zinc-950 text-xs text-zinc-400 uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff640a]" />
            <span>Chapter 06 // Install & Precompiled Releases</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black font-sans tracking-tight text-white leading-tight">
            Downloads & Binaries.
          </h2>

          <p className="text-zinc-400 text-sm sm:text-base font-light font-sans leading-relaxed">
            Grab official precompiled artifacts directly from GitHub Releases or run the 1-click shell installer.
          </p>
        </div>

        {/* 1-Click Install Command Strip */}
        <div className="rounded-2xl border border-white/10 bg-zinc-950 p-6 sm:p-8 mb-12 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
            <div>
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Terminal className="h-4 w-4 text-[#ff640a]" />
                Universal 1-Click Shell Install (Recommended)
              </span>
              <p className="text-xs text-zinc-500 font-sans mt-0.5">
                Automatically resolves dependencies, builds the C engine, creates symlinks, and sets up MPV.
              </p>
            </div>
            <span className="text-[10px] rounded border border-white/15 bg-black text-zinc-400 px-2 py-0.5">
              CROSS-PLATFORM
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-black border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Linux, macOS & Termux:</span>
                <button
                  type="button"
                  onClick={() => handleCopy(unixInstall)}
                  className="flex items-center gap-1 text-[11px] text-[#ff640a] hover:underline"
                >
                  {copiedCmd === unixInstall ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCmd === unixInstall ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <div className="text-[11px] text-zinc-300 font-mono break-all select-all">
                {unixInstall}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-black border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Windows (PowerShell):</span>
                <button
                  type="button"
                  onClick={() => handleCopy(winInstall)}
                  className="flex items-center gap-1 text-[11px] text-[#ff640a] hover:underline"
                >
                  {copiedCmd === winInstall ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCmd === winInstall ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <div className="text-[11px] text-zinc-300 font-mono break-all select-all">
                {winInstall}
              </div>
            </div>
          </div>
        </div>

        {/* Release Artifact Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {RELEASES.map((card) => (
            <div
              key={card.filename}
              className={`rounded-2xl border bg-zinc-950 p-6 sm:p-7 space-y-5 transition-all relative overflow-hidden ${
                card.recommended
                  ? 'border-[#ff640a]/50'
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              {card.recommended && (
                <div className="absolute top-0 right-0 bg-[#ff640a] text-black font-bold text-[9px] px-3 py-0.5 rounded-bl tracking-wider">
                  OFFICIAL BUILD
                </div>
              )}

              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-base font-bold text-white font-sans flex items-center gap-2">
                    {card.category === 'android' && <Smartphone className="h-4 w-4 text-[#ff640a]" />}
                    {card.category === 'linux' && <Cpu className="h-4 w-4 text-[#ff640a]" />}
                    {card.category === 'python' && <Package className="h-4 w-4 text-[#ff640a]" />}
                    {card.title}
                  </h4>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-400">
                    <span className="font-semibold text-white">{card.version}</span>
                    <span>•</span>
                    <span>{card.size}</span>
                    <span>•</span>
                    <span className="text-zinc-500">{card.filename}</span>
                  </div>
                </div>
              </div>

              {/* Feature Pills */}
              <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-300 font-sans">
                {card.features.map((feat, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <Check className="h-3 w-3 text-[#ff640a] shrink-0" />
                    <span className="truncate">{feat}</span>
                  </div>
                ))}
              </div>

              {/* CLI Command */}
              {card.command && (
                <div className="rounded-xl bg-black p-3 text-[11px] text-zinc-400 border border-white/5 flex items-center justify-between gap-2">
                  <code className="text-zinc-300 truncate">{card.command}</code>
                  <button
                    type="button"
                    onClick={() => handleCopy(card.command!)}
                    className="p-1 text-zinc-500 hover:text-white shrink-0"
                    title="Copy command"
                  >
                    {copiedCmd === card.command ? (
                      <Check className="h-3.5 w-3.5 text-[#ff640a]" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              )}

              {/* Download Button */}
              <a
                href={card.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-black border border-white/15 px-4 py-3 text-xs font-semibold text-white hover:border-[#ff640a] hover:text-[#ff640a] transition-all"
              >
                <Download className="h-4 w-4 text-[#ff640a]" />
                <span>Download {card.filename}</span>
              </a>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
