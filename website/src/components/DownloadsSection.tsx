import React, { useState } from 'react';
import { Download, Smartphone, Cpu, Terminal, Package, ExternalLink, Check, Copy, ShieldCheck } from 'lucide-react';
import { TechText } from './TechText';
import { CallChip } from './CallChip';

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
    features: ['100% Standalone (No PC needed)', 'Jetpack Compose Touch Gestures', '18+ Safe Filter', 'Kyoto 1080p Mobile HLS'],
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
    features: ['Raspberry Pi & ARM Laptops', 'Termux on Android', 'Ultra-Lean 4MB RAM', 'Direct Kyoto Streams'],
  },
  {
    title: 'anime-cli Python Hub Package',
    category: 'python',
    version: 'v1.2.0',
    size: '1.4 MB',
    filename: 'anime-cli-sdist.tar.gz',
    downloadUrl: 'https://github.com/Hackedghost64/anime-cli/releases',
    command: 'pip install --user anime-cli',
    features: ['AniSkip Automated Lua', 'Binge Roulette (-B)', 'Live Airing Radar (--today)', 'Batch Downloader (-o)'],
  },
];

export const DownloadsSection: React.FC = () => {
  const [selectedOS, setSelectedOS] = useState<'all' | 'android' | 'linux' | 'python'>('all');
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const filteredReleases = selectedOS === 'all'
    ? RELEASES
    : RELEASES.filter((r) => r.category === selectedOS);

  const handleCopy = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(cmd);
    setTimeout(() => setCopiedCmd(null), 1800);
  };

  return (
    <section id="downloads" className="py-20 border-t border-slate-800/80 bg-[#08090a] relative font-mono">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="max-w-3xl mb-12 space-y-3">
          <TechText tag="RELEASE_VAULT::v1.2" glowColor="purple" className="text-2xl sm:text-4xl font-bold font-sans">
            Downloads & Releases: <br />
            <span className="text-white">Precompiled Standalone Binaries & Install Scripts.</span>
          </TechText>
          <p className="text-slate-400 text-sm leading-relaxed">
            Grab official prebuilt artifacts directly from GitHub Releases or run the 1-click universal shell installer for your operating system.
          </p>
        </div>

        {/* 1-Click Install Command Strip */}
        <div className="rounded-xl border border-cyber-cyan/40 bg-[#0c111a] p-6 mb-12 space-y-4 shadow-glow-cyan">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-cyber-cyan tracking-wider flex items-center gap-1.5">
                <Terminal className="h-4 w-4" />
                UNIVERSAL 1-CLICK SHELL INSTALL (RECOMMENDED)
              </span>
              <p className="text-xs text-slate-400 mt-0.5">
                Automatically installs dependencies, compiles C binary, sets up symlinks, and configures MPV AniSkip.
              </p>
            </div>
            <span className="text-[10px] rounded bg-cyber-green/10 text-cyber-green border border-cyber-green/30 px-2 py-0.5 whitespace-nowrap">
              ALL PLATFORMS
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <span className="text-[11px] text-slate-400">Linux, macOS & Android (Termux):</span>
              <CallChip
                command="curl -fsSL https://raw.githubusercontent.com/Hackedghost64/anime-cli/main/install.sh | bash"
                endpoint="install.sh"
                durationMs={450}
              />
            </div>
            <div className="space-y-1">
              <span className="text-[11px] text-slate-400">Windows (PowerShell):</span>
              <CallChip
                command="irm https://raw.githubusercontent.com/Hackedghost64/anime-cli/main/install-windows.ps1 | iex"
                endpoint="install.ps1"
                durationMs={520}
              />
            </div>
          </div>
        </div>

        {/* Release Artifact Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredReleases.map((card) => (
            <div
              key={card.filename}
              className={`rounded-xl border bg-[#0a0d13] p-6 space-y-4 transition-all relative overflow-hidden ${
                card.recommended
                  ? 'border-cyber-cyan/40 shadow-cyber-card'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              {card.recommended && (
                <div className="absolute top-0 right-0 bg-cyber-cyan text-slate-950 font-bold text-[9px] px-3 py-0.5 rounded-bl tracking-wider">
                  OFFICIAL BUILD
                </div>
              )}

              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-base font-bold text-white font-sans flex items-center gap-2">
                    {card.category === 'android' && <Smartphone className="h-4 w-4 text-cyber-purple" />}
                    {card.category === 'linux' && <Cpu className="h-4 w-4 text-cyber-cyan" />}
                    {card.category === 'python' && <Package className="h-4 w-4 text-cyber-green" />}
                    {card.title}
                  </h4>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                    <span className="font-semibold text-cyber-cyan">{card.version}</span>
                    <span>•</span>
                    <span>{card.size}</span>
                    <span>•</span>
                    <span className="text-slate-500">{card.filename}</span>
                  </div>
                </div>
              </div>

              {/* Feature Pills */}
              <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-300">
                {card.features.map((feat, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <Check className="h-3 w-3 text-cyber-green shrink-0" />
                    <span className="truncate">{feat}</span>
                  </div>
                ))}
              </div>

              {/* CLI Command */}
              {card.command && (
                <div className="rounded bg-black/60 p-2.5 text-[11px] text-slate-400 border border-slate-800/80 flex items-center justify-between gap-2">
                  <code className="text-cyber-cyan truncate">{card.command}</code>
                  <button
                    type="button"
                    onClick={() => handleCopy(card.command!)}
                    className="p-1 text-slate-400 hover:text-white shrink-0"
                    title="Copy command"
                  >
                    {copiedCmd === card.command ? (
                      <Check className="h-3.5 w-3.5 text-cyber-green" />
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
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-slate-900 border border-slate-700/80 px-4 py-2.5 text-xs font-semibold text-white hover:border-cyber-cyan hover:bg-slate-800 transition-all cursor-target"
                data-target-label="DOWNLOAD_ARTIFACT"
              >
                <Download className="h-4 w-4 text-cyber-cyan" />
                <span>Download {card.filename}</span>
              </a>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
