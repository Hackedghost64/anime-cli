import React, { useState } from 'react';
import { Terminal, Zap, Smartphone, FileCode2, Copy, Check, ChevronRight, Play, RefreshCw, Sparkles, Shield, Cpu } from 'lucide-react';
import { TechText } from './TechText';
import { DecryptedText } from './DecryptedText';
import { CallChip } from './CallChip';

export const TrinitySection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'lite' | 'cli' | 'android' | 'config'>('lite');
  const [copiedConfig, setCopiedConfig] = useState(false);

  const configJsonString = `{
  "version": "1.2.0",
  "anilab": {
    "base_url": "https://anilab2.amdapi.click/api",
    "headers": {
      "User-Agent": "okhttp/4.12.0",
      "Accept": "application/json",
      "os-version": "14",
      "app-id": "com.shinsei.anime"
    }
  },
  "kyoto": {
    "base_url": "https://app.kyotoplayer.com/api/v4",
    "headers": {
      "User-Agent": "Mozilla/5.0 (Linux; Android 14; Pixel 8)",
      "Referer": "https://play.app/",
      "X-Requested-With": "PLAY"
    }
  }
}`;

  const handleCopyConfig = () => {
    navigator.clipboard.writeText(configJsonString);
    setCopiedConfig(true);
    setTimeout(() => setCopiedConfig(false), 2000);
  };

  return (
    <section id="trinity" className="py-20 border-t border-slate-800/80 bg-[#090b0f] relative font-mono">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl mb-12 space-y-3">
          <TechText tag="ARCHITECTURE::TRINITY" glowColor="cyan" className="text-2xl sm:text-4xl font-bold font-sans">
            The Trinity Architecture: <br />
            <span className="text-white">One Unified Engine. Three Pure Form Factors.</span>
          </TechText>
          <p className="text-slate-400 text-sm leading-relaxed">
            Whether you want an instant 3.8ms standalone C binary on an old laptop, a powerhouse Python CLI hub with Binge Roulette, or a native Android app in bed—everything shares a single configuration and direct mobile API pipeline.
          </p>
        </div>

        {/* Tab Navigation Pill Bar */}
        <div className="flex flex-wrap gap-2 mb-8 border-b border-slate-800 pb-4">
          <button
            type="button"
            onClick={() => setActiveTab('lite')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold transition-all cursor-target ${
              activeTab === 'lite'
                ? 'bg-cyber-cyan/15 border border-cyber-cyan text-cyber-cyan shadow-glow-cyan'
                : 'border border-slate-800 bg-[#0c1017] text-slate-400 hover:text-white hover:border-slate-700'
            }`}
            data-target-label="TIER_1_LITE"
          >
            <Zap className="h-4 w-4" />
            <span>1. anime-lite (C Edition ⚡)</span>
            <span className="rounded bg-cyber-cyan/20 px-1 text-[10px]">3.8ms</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cli')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold transition-all cursor-target ${
              activeTab === 'cli'
                ? 'bg-cyber-green/15 border border-cyber-green text-cyber-green shadow-glow-green'
                : 'border border-slate-800 bg-[#0c1017] text-slate-400 hover:text-white hover:border-slate-700'
            }`}
            data-target-label="TIER_2_CLI"
          >
            <Terminal className="h-4 w-4" />
            <span>2. anime-cli (Python Hub 🐍)</span>
            <span className="rounded bg-cyber-green/20 px-1 text-[10px]">Full Suite</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('android')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold transition-all cursor-target ${
              activeTab === 'android'
                ? 'bg-cyber-purple/15 border border-cyber-purple text-cyber-purple shadow-glow-purple'
                : 'border border-slate-800 bg-[#0c1017] text-slate-400 hover:text-white hover:border-slate-700'
            }`}
            data-target-label="TIER_3_ANDROID"
          >
            <Smartphone className="h-4 w-4" />
            <span>3. Shinsei Anime (Android 📱)</span>
            <span className="rounded bg-cyber-purple/20 px-1 text-[10px]">Standalone</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('config')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold transition-all cursor-target ${
              activeTab === 'config'
                ? 'bg-cyber-orange/15 border border-cyber-orange text-cyber-orange shadow-glow-orange'
                : 'border border-slate-800 bg-[#0c1017] text-slate-400 hover:text-white hover:border-slate-700'
            }`}
            data-target-label="CENTRAL_SSOT"
          >
            <FileCode2 className="h-4 w-4" />
            <span>config.json (SSOT ⚙️)</span>
            <span className="rounded bg-cyber-orange/20 px-1 text-[10px]">Zero-Break</span>
          </button>
        </div>

        {/* Tab Content Display */}
        <div className="rounded-2xl border border-slate-800 bg-[#0c1017]/90 p-6 sm:p-8 shadow-cyber-card relative overflow-hidden">
          
          {/* Tab 1: anime-lite (C Edition) */}
          {activeTab === 'lite' && (
            <div id="anime-lite" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center gap-2 text-cyber-cyan text-xs">
                  <Zap className="h-4 w-4" />
                  <span className="font-bold tracking-wider">TIER 1 • PURE C99 HIGH-SPEED BINARY</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white font-sans">
                  Sub-5ms Startup. 4MB RAM. Zero Python Dependencies.
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Hand-crafted in pure C99 with vendored <code className="text-cyber-cyan">cJSON</code> and <code className="text-cyber-cyan">libcurl</code>. 
                  Designed for power users, low-resource hardware (Raspberry Pi, Termux, old laptops), SSH sessions, or anyone who despises Python virtual environments and interpreter delays.
                </p>

                <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                  <div className="rounded border border-slate-800 bg-[#08090a] p-3">
                    <div className="text-slate-500 text-[10px]">PICKER INTERFACE</div>
                    <div className="text-white font-semibold mt-0.5">Native fzf Fuzzy Search</div>
                    <div className="text-slate-500 text-[10px] mt-1">Instant ANSI fallback if fzf missing</div>
                  </div>
                  <div className="rounded border border-slate-800 bg-[#08090a] p-3">
                    <div className="text-slate-500 text-[10px]">WATCH HISTORY</div>
                    <div className="text-cyber-cyan font-semibold mt-0.5">Instant Resume (-c)</div>
                    <div className="text-slate-500 text-[10px] mt-1">Saves progress to history.json</div>
                  </div>
                </div>

                <div className="pt-2 space-y-2">
                  <span className="text-[11px] text-slate-400">Quick C Commands:</span>
                  <div className="space-y-1.5">
                    <CallChip command="anime-lite -c" endpoint="history.json" durationMs={4} />
                    <CallChip command="anime-lite 'chainsaw man' -e 1 -d" endpoint="kyoto/hls" durationMs={480} />
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 rounded-xl border border-slate-800 bg-[#07090c] p-4 text-xs font-mono">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-slate-400 text-[11px]">
                  <span>anime-lite ASCII Banner</span>
                  <span className="text-cyber-cyan">GCC 13 / C99</span>
                </div>
                <pre className="text-[10px] sm:text-[11px] text-cyber-cyan leading-none my-3 overflow-x-auto">
{`    _          _                      _     _ _       
   / \\   _ __ (_)_ __ ___   ___      | |   (_) |_ ___ 
  / _ \\ | '_ \\| | '_ \` _ \\ / _ \\_____| |   | | __/ _ \\
 / ___ \\| | | | | | | | | |  __/_____| |___| | ||  __/
/_/   \\_\\_| |_|_|_| |_| |_|\\___|     |_____|_|\\__\\___|
       Stream Anime via Anilab & Kyoto [C Edition]`}
                </pre>
                <div className="space-y-1 text-slate-400 text-[11px] border-t border-slate-800/80 pt-3">
                  <p className="text-cyber-green">&gt; Fetching catalog for &quot;jujutsu kaisen&quot; ...</p>
                  <p className="text-slate-300">&gt; 12 results matched via fzf (0.002s)</p>
                  <p className="text-slate-400">&gt; Spawning hardware-accelerated MPV: --vo=gpu</p>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: anime-cli (Python Hub) */}
          {activeTab === 'cli' && (
            <div id="anime-cli" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center gap-2 text-cyber-green text-xs">
                  <Terminal className="h-4 w-4" />
                  <span className="font-bold tracking-wider">TIER 2 • COMPLETE PYTHON MASTER CONTROL HUB</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white font-sans">
                  AniSkip Auto-Skip, Airing Radar, Binge Roulette & Web PWA.
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  The feature-complete flagship powerhouse. Automated AniSkip intro/outro skipping via custom MPV Lua scripts, live AniList broadcast schedules, batch episode downloader, and an obsidian Crunchyroll-style web PWA player.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 text-xs">
                  <div className="rounded border border-slate-800 bg-[#08090a] p-2.5">
                    <div className="text-cyber-green font-semibold">⚡ AniSkip Auto-Skip</div>
                    <div className="text-slate-500 text-[10px] mt-0.5">MPV jumps OP & ED seamlessly</div>
                  </div>
                  <div className="rounded border border-slate-800 bg-[#08090a] p-2.5">
                    <div className="text-cyber-cyan font-semibold">🎲 Binge Roulette</div>
                    <div className="text-slate-500 text-[10px] mt-0.5">3-question vibe match (-B)</div>
                  </div>
                  <div className="rounded border border-slate-800 bg-[#08090a] p-2.5">
                    <div className="text-cyber-purple font-semibold">📅 Airing Radar</div>
                    <div className="text-slate-500 text-[10px] mt-0.5">Live 24h schedule (--today)</div>
                  </div>
                </div>

                <div className="pt-2 space-y-2">
                  <span className="text-[11px] text-slate-400">Hub Command Flags:</span>
                  <div className="space-y-1.5">
                    <CallChip command="anime-cli -B" endpoint="vibe_matcher" durationMs={120} />
                    <CallChip command="anime-cli --today" endpoint="anilist/airing" durationMs={280} />
                    <CallChip command="anime-cli -o 'Solo Leveling' 1-12" endpoint="ffmpeg/1080p" durationMs={950} />
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 rounded-xl border border-slate-800 bg-[#07090c] p-4 text-xs font-mono">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-slate-400 text-[11px]">
                  <span>Interactive Terminal Hub</span>
                  <span className="text-cyber-green">Python 3.10+</span>
                </div>
                <div className="my-3 space-y-1.5 text-slate-300 text-[11px]">
                  <div className="text-cyber-cyan font-bold">&gt; Choose an action:</div>
                  <div className="text-white bg-slate-800/60 px-2 py-1 rounded">▶ 🔍 Search & Watch Anime</div>
                  <div className="text-slate-400 px-2 py-0.5">  🎲 Binge Roulette (Quick 3-Question Match)</div>
                  <div className="text-slate-400 px-2 py-0.5">  📅 Today&#39;s Airing Radar (Live Releases)</div>
                  <div className="text-slate-400 px-2 py-0.5">  ▶ Continue Watching (Resume last ep)</div>
                  <div className="text-slate-400 px-2 py-0.5">  📥 Batch Downloader (1080p MP4 via FFmpeg)</div>
                  <div className="text-slate-400 px-2 py-0.5">  🌐 Launch Obsidian Web Player</div>
                  <div className="text-slate-400 px-2 py-0.5">  📱 QR Wi-Fi Sync for Mobile</div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Shinsei Anime (Android App) */}
          {activeTab === 'android' && (
            <div id="shinsei-android" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center gap-2 text-cyber-purple text-xs">
                  <Smartphone className="h-4 w-4" />
                  <span className="font-bold tracking-wider">TIER 3 • 100% STANDALONE JETPACK COMPOSE APP</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white font-sans">
                  Native Android. Touch Gestures. Zero PC Requirement.
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Unlike remote streaming clients, <strong>Shinsei Anime</strong> is completely independent. It connects directly to the mobile Kyoto CDN over Wi-Fi or 5G with no PC or tunnel needed.
                </p>

                <ul className="space-y-2 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyber-purple" />
                    <span><strong>Crunchyroll-Style UI:</strong> Dual-axis swipe gestures (left brightness, right volume), double-tap seek.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyber-purple" />
                    <span><strong>18+ Content Safety:</strong> Adult/ecchi titles strictly excluded from Trending & Spotlight carousels with PIN confirmation.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyber-purple" />
                    <span><strong>Sub-50ms P2P Wi-Fi Sync:</strong> Scan the terminal QR code to sync watch progress between your PC SQLite and phone Room DB.</span>
                  </li>
                </ul>

                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <a
                    href="https://github.com/Hackedghost64/anime-cli/releases/latest/download/ShinseiAnime-Release.apk"
                    className="flex items-center gap-2 rounded-lg bg-cyber-purple/20 border border-cyber-purple/50 px-4 py-2 text-xs font-semibold text-cyber-purple hover:bg-cyber-purple hover:text-black transition-all cursor-target"
                    data-target-label="GET_APK"
                  >
                    <Smartphone className="h-4 w-4" />
                    <span>Download ShinseiAnime-Release.apk (~12.8MB)</span>
                  </a>
                  <CallChip command="anime-cli --build-apk --release --install" endpoint="adb_deploy" durationMs={1200} />
                </div>
              </div>

              <div className="lg:col-span-5 rounded-xl border border-slate-800 bg-[#07090c] p-4 text-xs font-mono text-center">
                <div className="inline-block rounded-2xl border-4 border-slate-800 bg-slate-950 p-2 shadow-2xl max-w-[260px]">
                  <div className="rounded-xl overflow-hidden bg-[#0c1017] p-3 text-left space-y-2.5">
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>9:41 AM</span>
                      <span>5G 100%</span>
                    </div>
                    <div className="h-28 rounded-lg bg-gradient-to-tr from-cyber-purple/30 via-slate-900 to-cyber-cyan/30 flex items-center justify-center p-3 relative">
                      <div className="text-center">
                        <div className="text-[11px] font-bold text-white">Kyoto Player 1080p</div>
                        <div className="text-[9px] text-cyber-cyan">Gestures: Brightness / Vol / PiP</div>
                      </div>
                    </div>
                    <div className="text-[11px] font-bold text-white">Spotlight: Solo Leveling</div>
                    <div className="text-[10px] text-slate-400">Episode 12 • Sub & Dub Available</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: config.json (SSOT) */}
          {activeTab === 'config' && (
            <div id="config-json" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-6 space-y-4">
                <div className="flex items-center gap-2 text-cyber-orange text-xs">
                  <FileCode2 className="h-4 w-4" />
                  <span className="font-bold tracking-wider">SINGLE SOURCE OF TRUTH (SSOT)</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white font-sans">
                  The Zero-Break Architecture of `config.json`.
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  How does the project ensure that when upstream mobile APIs rotate endpoints or headers, nothing breaks?
                  All 3 tiers—C binary, Python hub, and Android app—consume the exact same JSON contract:
                </p>

                <div className="space-y-2 text-xs">
                  <div className="rounded border border-slate-800 bg-[#08090a] p-3">
                    <div className="text-cyber-cyan font-bold">1. anime-lite (C99):</div>
                    <div className="text-slate-400 text-[11px]">Evaluated dynamically at launch via <code>src/config.c</code> with compile-time fallbacks.</div>
                  </div>
                  <div className="rounded border border-slate-800 bg-[#08090a] p-3">
                    <div className="text-cyber-green font-bold">2. anime-cli (Python):</div>
                    <div className="text-slate-400 text-[11px]">Loaded on demand via <code>config.py</code> without restarting services.</div>
                  </div>
                  <div className="rounded border border-slate-800 bg-[#08090a] p-3">
                    <div className="text-cyber-purple font-bold">3. Shinsei Anime (Android):</div>
                    <div className="text-slate-400 text-[11px]">Copied to <code>assets/config.json</code> automatically during the Gradle release build.</div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-cyber-orange/10 border border-cyber-orange/30 text-cyber-orange text-xs font-semibold">
                  Update `config.json` once, and all three streaming clients update instantaneously!
                </div>
              </div>

              <div className="lg:col-span-6 rounded-xl border border-slate-800 bg-[#07090c] p-4 text-xs font-mono">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2 text-slate-400 text-[11px]">
                  <span>config.json (Single Source of Truth)</span>
                  <button
                    type="button"
                    onClick={handleCopyConfig}
                    className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
                  >
                    {copiedConfig ? (
                      <Check className="h-3.5 w-3.5 text-cyber-green" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    <span>{copiedConfig ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="text-[11px] text-cyber-orange leading-relaxed overflow-x-auto p-2 bg-[#050608] rounded">
                  {configJsonString}
                </pre>
              </div>
            </div>
          )}

        </div>

      </div>
    </section>
  );
};
