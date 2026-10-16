import React from 'react';
import { Zap, ArrowUp } from 'lucide-react';

export const Footer: React.FC = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="border-t border-white/10 bg-black py-16 font-mono text-xs text-zinc-400">
      <div className="mx-auto max-w-6xl px-6 space-y-10">
        
        {/* Top Status Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#ff640a]/10 border border-[#ff640a]/40 text-[#ff640a]">
              <Zap className="h-4 w-4 fill-[#ff640a]" />
            </div>
            <div>
              <span className="font-bold text-white tracking-wider block">
                anime-cli // ECOSYSTEM
              </span>
              <span className="text-[10px] text-zinc-500 block">Open-Source Anime Terminal Platform</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px]">
            <div className="flex items-center gap-1.5 rounded-full bg-zinc-950 px-3 py-1 border border-white/10">
              <span className="h-1.5 w-1.5 rounded-full bg-[#ff640a]" />
              <span>Kyoto Stream: ONLINE</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-zinc-950 px-3 py-1 border border-white/10">
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
              <span>Cloudflare Bypass: 100%</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-zinc-950 px-3 py-1 border border-white/10">
              <span className="h-1.5 w-1.5 rounded-full bg-[#ff640a]" />
              <span>AniSkip API: ACTIVE</span>
            </div>
          </div>
        </div>

        {/* Links & Disclaimer */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <h5 className="font-bold text-white text-xs uppercase tracking-wider">The Ecosystem</h5>
            <ul className="space-y-2 text-zinc-400 text-xs">
              <li><a href="#anime-lite" className="hover:text-[#ff640a] transition-colors">anime-lite (C Edition)</a></li>
              <li><a href="#anime-cli" className="hover:text-white transition-colors">anime-cli (Python Hub)</a></li>
              <li><a href="#shinsei-android" className="hover:text-white transition-colors">Shinsei Anime (Android App)</a></li>
              <li><a href="#config-json" className="hover:text-[#ff640a] transition-colors">Unified config.json (SSOT)</a></li>
            </ul>
          </div>

          <div className="space-y-3">
            <h5 className="font-bold text-white text-xs uppercase tracking-wider">Resources</h5>
            <ul className="space-y-2 text-zinc-400 text-xs">
              <li><a href="#benchmarks" className="hover:text-white transition-colors">Performance Benchmarks</a></li>
              <li><a href="#terminal" className="hover:text-white transition-colors">Terminal Simulator</a></li>
              <li><a href="#downloads" className="hover:text-white transition-colors">Releases & APK Downloads</a></li>
              <li><a href="#shortcuts" className="hover:text-white transition-colors">MPV & Web Shortcuts</a></li>
            </ul>
          </div>

          <div className="space-y-3">
            <h5 className="font-bold text-white text-xs uppercase tracking-wider">GitHub Community</h5>
            <ul className="space-y-2 text-zinc-400 text-xs">
              <li><a href="https://github.com/Hackedghost64/anime-cli" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Source Code Repository</a></li>
              <li><a href="https://github.com/Hackedghost64/anime-cli/issues" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Report Bugs / Issues</a></li>
              <li><a href="https://github.com/Hackedghost64/anime-cli/pulls" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Submit Pull Requests</a></li>
              <li><a href="https://github.com/Hackedghost64/anime-cli/blob/main/LICENSE" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">MIT License</a></li>
            </ul>
          </div>

          <div className="space-y-3">
            <h5 className="font-bold text-white text-xs uppercase tracking-wider">Legal & Disclaimer</h5>
            <p className="text-[11px] text-zinc-500 font-sans leading-relaxed">
              Open-source educational project exploring network protocols and reverse-engineered mobile HLS streaming. All anime media, trademarks, and logos belong to their respective copyright holders.
            </p>
          </div>
        </div>

        {/* Bottom Credits & Back to Top */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-white/10 text-xs text-zinc-500">
          <div>
            <span>Built for anime fans who live in the terminal.</span>
          </div>

          <button
            type="button"
            onClick={scrollToTop}
            className="flex items-center gap-2 text-zinc-400 hover:text-[#ff640a] transition-colors"
          >
            <span>BACK TO TOP</span>
            <ArrowUp className="h-3.5 w-3.5 text-[#ff640a]" />
          </button>
        </div>

      </div>
    </footer>
  );
};
