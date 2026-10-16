import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Terminal, Shield, Sparkles, ArrowRight, Github, Smartphone, Film } from 'lucide-react';
import { DecryptedText } from './DecryptedText';
import { TechText } from './TechText';
import { CrystalizedBall } from './CrystalizedBall';
import { CallChip } from './CallChip';
import { CountUp } from './CountUp';

export const Hero: React.FC = () => {
  return (
    <section className="relative overflow-hidden pt-8 pb-16 md:pt-14 md:pb-24">
      {/* Background radial glow & cyberpunk grid */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-cyber-cyan/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-[350px] h-[350px] bg-cyber-purple/10 blur-[110px] rounded-full pointer-events-none" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Headlines & Call to Actions */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Live Status Indicator Pill */}
            <div className="inline-flex items-center gap-2.5 rounded-full border border-cyber-cyan/40 bg-cyber-cyan/10 px-3.5 py-1.5 backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyber-green opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyber-green"></span>
              </span>
              <span className="text-[11px] font-mono font-semibold tracking-wider text-cyber-cyan">
                <DecryptedText text="100% MOBILE JSON API IMMUNITY • ZERO CLOUDFLARE" speed={30} />
              </span>
            </div>

            {/* Main Headline */}
            <div className="space-y-3">
              <TechText tag="ANIME_ECOSYSTEM_v1.2" glowColor="cyan" className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight font-sans">
                Stream Anime at <br />
                <span className="bg-gradient-to-r from-cyber-cyan via-white to-cyber-purple bg-clip-text text-transparent">
                  Terminal Velocity.
                </span>
              </TechText>

              <p className="text-base sm:text-lg text-slate-300 max-w-2xl font-mono leading-relaxed">
                The death of brittle HTML scrapers. A unified 3-tier ecosystem powered by reverse-engineered mobile JSON APIs:
                <strong className="text-cyber-cyan"> Sub-5ms C Binary</strong>,
                <strong className="text-white"> Python Hub with AniSkip</strong>, and
                <strong className="text-cyber-green"> Native Android Jetpack Compose App</strong>.
              </p>
            </div>

            {/* Quick Metrics Bar with CountUp */}
            <div className="grid grid-cols-3 gap-3 pt-2 font-mono max-w-lg">
              <div className="rounded-lg border border-slate-800 bg-[#0e131b]/80 p-3 hover:border-cyber-cyan/40 transition-colors">
                <div className="text-xs text-slate-400">Cold Start</div>
                <div className="text-xl sm:text-2xl font-bold text-cyber-cyan">
                  <CountUp to={3.8} decimals={1} prefix="⚡ " suffix="ms" />
                </div>
                <div className="text-[10px] text-slate-500">Pure C99 binary</div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-[#0e131b]/80 p-3 hover:border-cyber-green/40 transition-colors">
                <div className="text-xs text-slate-400">Memory RSS</div>
                <div className="text-xl sm:text-2xl font-bold text-cyber-green">
                  <CountUp to={4.1} decimals={1} prefix="~" suffix=" MB" />
                </div>
                <div className="text-[10px] text-slate-500">Ultra-lean footprint</div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-[#0e131b]/80 p-3 hover:border-cyber-purple/40 transition-colors">
                <div className="text-xs text-slate-400">HLS Resolution</div>
                <div className="text-xl sm:text-2xl font-bold text-cyber-purple">
                  <CountUp to={480} decimals={0} prefix="⚡ " suffix="ms" />
                </div>
                <div className="text-[10px] text-slate-500">Single HTTP hop</div>
              </div>
            </div>

            {/* 1-Click Universal Install CallChip */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Terminal className="h-3.5 w-3.5 text-cyber-cyan" />
                  Universal 1-Click Install (Linux • macOS • Termux):
                </span>
                <span className="text-[11px] text-cyber-green font-semibold">Auto-detects pacman/apt/brew</span>
              </div>

              <CallChip
                command="curl -fsSL https://raw.githubusercontent.com/Hackedghost64/anime-cli/main/install.sh | bash"
                endpoint="install.sh"
                durationMs={380}
                className="cursor-target"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              <a
                href="#trinity"
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyber-cyan to-blue-600 px-5 py-3 text-sm font-semibold text-slate-950 hover:brightness-110 shadow-glow-cyan transition-all cursor-target"
                data-target-label="EXPLORE_TRINITY"
              >
                <span>Explore The Trinity</span>
                <ArrowRight className="h-4 w-4" />
              </a>

              <a
                href="#terminal"
                className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-5 py-3 text-sm font-mono font-medium text-white hover:border-cyber-cyan hover:bg-slate-900 transition-all cursor-target"
                data-target-label="LAUNCH_SIMULATOR"
              >
                <Terminal className="h-4 w-4 text-cyber-cyan" />
                <span>Terminal Simulator</span>
              </a>

              <a
                href="#downloads"
                className="flex items-center gap-2 rounded-xl border border-slate-800 bg-[#0e131b] px-4 py-3 text-sm font-mono text-slate-300 hover:text-white hover:border-cyber-green transition-all cursor-target"
                data-target-label="DOWNLOAD_APK"
              >
                <Smartphone className="h-4 w-4 text-cyber-green" />
                <span>Shinsei APK</span>
              </a>
            </div>

          </div>

          {/* Right Column: CrystalizedBall Plasma Orb & Interactive Tech Widget */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center relative">
            <div className="relative">
              {/* Decorative cyber corner brackets around orb */}
              <div className="absolute -top-6 -left-6 w-12 h-12 border-t-2 border-l-2 border-cyber-cyan/40 pointer-events-none" />
              <div className="absolute -top-6 -right-6 w-12 h-12 border-t-2 border-r-2 border-cyber-cyan/40 pointer-events-none" />
              <div className="absolute -bottom-6 -left-6 w-12 h-12 border-b-2 border-l-2 border-cyber-green/40 pointer-events-none" />
              <div className="absolute -bottom-6 -right-6 w-12 h-12 border-b-2 border-r-2 border-cyber-purple/40 pointer-events-none" />

              <CrystalizedBall
                size={340}
                preset="kyoto"
                className="cursor-target"
              />
            </div>

            {/* Orb description card */}
            <div className="mt-4 text-center font-mono text-xs text-slate-400 max-w-xs space-y-1">
              <div className="flex items-center justify-center gap-1.5 text-cyber-cyan font-semibold">
                <Sparkles className="h-3.5 w-3.5" />
                <span>KYOTO STREAM PLASMA CORE</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Direct 1080p HLS Tendril Arcs. Interactive plasma physics responding to cursor proximity.
              </p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
