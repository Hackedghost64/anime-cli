import React from 'react';
import { Github, Zap, Heart, Terminal, Shield, ArrowUp } from 'lucide-react';
import { DecryptedText } from './DecryptedText';

export const Footer: React.FC = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="border-t border-slate-800/80 bg-[#060709] py-12 font-mono text-xs text-slate-400">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Top Status Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-900 pb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <span className="font-bold text-white tracking-wider">
                <DecryptedText text="anime-cli // ECOSYSTEM" speed={25} />
              </span>
              <span className="text-[10px] text-slate-500 block">Open-Source Anime Terminal Platform</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px]">
            <div className="flex items-center gap-1.5 rounded-full bg-slate-900/80 px-2.5 py-1 border border-slate-800">
              <span className="h-1.5 w-1.5 rounded-full bg-cyber-green animate-pulse" />
              <span>Kyoto Stream: ONLINE</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-slate-900/80 px-2.5 py-1 border border-slate-800">
              <span className="h-1.5 w-1.5 rounded-full bg-cyber-cyan" />
              <span>Cloudflare Bypass: 100%</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-slate-900/80 px-2.5 py-1 border border-slate-800">
              <span className="h-1.5 w-1.5 rounded-full bg-cyber-purple" />
              <span>AniSkip API: ACTIVE</span>
            </div>
          </div>
        </div>

        {/* Links & Disclaimer */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-2">
            <h5 className="font-bold text-white text-xs uppercase tracking-wider">The Ecosystem</h5>
            <ul className="space-y-1.5 text-slate-400 text-[11px]">
              <li><a href="#anime-lite" className="hover:text-cyber-cyan transition-colors">anime-lite (C Edition ⚡)</a></li>
              <li><a href="#anime-cli" className="hover:text-cyber-green transition-colors">anime-cli (Python Hub 🐍)</a></li>
              <li><a href="#shinsei-android" className="hover:text-cyber-purple transition-colors">Shinsei Anime (Android App 📱)</a></li>
              <li><a href="#config-json" className="hover:text-cyber-orange transition-colors">Unified config.json (SSOT)</a></li>
            </ul>
          </div>

          <div className="space-y-2">
            <h5 className="font-bold text-white text-xs uppercase tracking-wider">Resources</h5>
            <ul className="space-y-1.5 text-slate-400 text-[11px]">
              <li><a href="#benchmarks" className="hover:text-white transition-colors">Performance Benchmarks</a></li>
              <li><a href="#terminal" className="hover:text-white transition-colors">Terminal Sandbox Simulator</a></li>
              <li><a href="#downloads" className="hover:text-white transition-colors">Releases & APK Downloads</a></li>
              <li><a href="#shortcuts" className="hover:text-white transition-colors">MPV & Web Shortcuts</a></li>
            </ul>
          </div>

          <div className="space-y-2">
            <h5 className="font-bold text-white text-xs uppercase tracking-wider">GitHub Community</h5>
            <ul className="space-y-1.5 text-slate-400 text-[11px]">
              <li><a href="https://github.com/Hackedghost64/anime-cli" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Source Code Repository</a></li>
              <li><a href="https://github.com/Hackedghost64/anime-cli/issues" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Report Bugs / Issues</a></li>
              <li><a href="https://github.com/Hackedghost64/anime-cli/pulls" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Submit Pull Requests</a></li>
              <li><a href="https://github.com/Hackedghost64/anime-cli/blob/main/LICENSE" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">MIT License</a></li>
            </ul>
          </div>

          <div className="space-y-2">
            <h5 className="font-bold text-white text-xs uppercase tracking-wider">Legal & Disclaimer</h5>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Open-source educational project exploring network protocols and reverse-engineered mobile HLS streaming. All anime media, trademarks, and logos belong to their respective copyright holders.
            </p>
          </div>
        </div>

        {/* Bottom Credits & Back to Top */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-900 text-[11px] text-slate-500">
          <div>
            <span>Built with ❤️ for anime fans who live in the terminal.</span>
          </div>

          <button
            type="button"
            onClick={scrollToTop}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors"
          >
            <span>BACK TO TOP</span>
            <ArrowUp className="h-3.5 w-3.5 text-cyber-cyan" />
          </button>
        </div>

      </div>
    </footer>
  );
};
