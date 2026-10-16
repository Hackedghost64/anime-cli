import React, { useState } from 'react';
import { Copy, Check, ArrowDown, Github, Terminal } from 'lucide-react';
import GradientWaves from './GradientWaves';

export const Hero: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const installCmd = 'curl -fsSL https://raw.githubusercontent.com/Hackedghost64/anime-cli/main/install.sh | bash';

  const copyToClipboard = () => {
    navigator.clipboard.writeText(installCmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="relative min-h-[92vh] flex flex-col justify-between pt-24 pb-12 overflow-hidden bg-black text-white">
      {/* GradientWaves Background - Black, Charcoal & Orange Crests */}
      <div className="absolute inset-0 z-0 pointer-events-auto opacity-75">
        <GradientWaves
          horizonColor="#000000"
          waveColor="#141416"
          crestColor="#ff640a"
          backgroundColor="#000000"
          speed={0.32}
          amplitude={2.5}
          relief={0.95}
          sheen={0.25}
          brightness={1.1}
          lightAngle={125}
          mouseInteraction={true}
          swellOnClick={true}
        />
        {/* Subtle vignette fade */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/80 pointer-events-none" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center flex-1 flex flex-col justify-center items-center">
        {/* Minimal Monospace Subtitle Tag */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-black/60 backdrop-blur-md mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-[#ff640a] animate-pulse" />
          <span className="text-[12px] font-mono tracking-widest text-zinc-400 uppercase">
            Story of a Rebuilt Architecture
          </span>
        </div>

        {/* Cinematic Minimalist Headline */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[1.05] text-white">
          Anime streaming <br />
          <span className="text-[#ff640a]">was broken.</span>
        </h1>

        {/* Narrative Subtitle */}
        <p className="mt-8 text-lg sm:text-xl md:text-2xl text-zinc-400 max-w-2xl font-light leading-relaxed">
          Fragile web scrapers break every few weeks. Cloudflare stops terminal users.
          So we bypassed the browser entirely and tapped directly into mobile JSON APIs.
        </p>

        {/* Minimalist 1-Command Install Pill */}
        <div className="mt-10 w-full max-w-xl">
          <div
            onClick={copyToClipboard}
            className="group cursor-pointer flex items-center justify-between px-5 py-3.5 rounded-xl bg-black/80 border border-white/15 hover:border-[#ff640a]/60 backdrop-blur-xl transition-all duration-300 shadow-2xl"
          >
            <div className="flex items-center gap-3 overflow-hidden font-mono text-xs sm:text-sm text-zinc-300">
              <Terminal className="w-4 h-4 text-[#ff640a] shrink-0" />
              <span className="truncate">{installCmd}</span>
            </div>
            <button
              type="button"
              className="ml-3 shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-medium transition-colors bg-white/10 text-white group-hover:bg-[#ff640a] group-hover:text-black"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-black" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <p className="mt-2 text-xs font-mono text-zinc-500 text-center">
            Installs anime-cli (Python) & compiles anime-lite (C Edition) in one step
          </p>
        </div>

        {/* Key Metrics - Simple Black / White / Orange */}
        <div className="mt-14 grid grid-cols-3 gap-8 sm:gap-16 border-t border-white/10 pt-8 w-full max-w-2xl font-mono text-center">
          <div>
            <div className="text-2xl sm:text-3xl font-black text-white">3.8 ms</div>
            <div className="text-xs text-zinc-500 uppercase tracking-wider mt-1">C99 Startup</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-[#ff640a]">480 ms</div>
            <div className="text-xs text-zinc-500 uppercase tracking-wider mt-1">1080p Stream</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-white">0</div>
            <div className="text-xs text-zinc-500 uppercase tracking-wider mt-1">Captchas / Breaks</div>
          </div>
        </div>
      </div>

      {/* Scroll Down Prompt */}
      <div className="relative z-10 flex flex-col items-center justify-center pt-8 text-zinc-500">
        <a
          href="#story"
          className="flex items-center gap-2 text-xs font-mono tracking-widest uppercase hover:text-[#ff640a] transition-colors"
        >
          <span>Scroll to read the story</span>
          <ArrowDown className="w-3.5 h-3.5 animate-bounce text-[#ff640a]" />
        </a>
      </div>
    </section>
  );
};
