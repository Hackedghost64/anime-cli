import React, { useState } from 'react';
import { Terminal, Zap, Smartphone, FileCode2, Copy, Check } from 'lucide-react';

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
    <section id="trinity" className="py-24 border-t border-white/10 bg-black text-white font-mono">
      <div className="mx-auto max-w-6xl px-6">
        
        {/* Section Header */}
        <div className="max-w-3xl mb-14 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-zinc-950 text-xs text-zinc-400 uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff640a]" />
            <span>Chapter 03 // The Trinity Architecture</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black font-sans tracking-tight text-white leading-tight">
            One Unified Engine. <br />
            <span className="text-[#ff640a]">Three Distinct Form Factors.</span>
          </h2>

          <p className="text-zinc-400 text-sm sm:text-base font-light font-sans leading-relaxed">
            Whether you want an instant 3.8ms standalone C binary on an old laptop, a powerhouse Python CLI hub with Binge Roulette, or a native Android app in bed—everything shares a single configuration and direct mobile API pipeline.
          </p>
        </div>

        {/* Minimal Tab Bar */}
        <div className="flex flex-wrap gap-2 mb-8 border-b border-white/10 pb-4">
          <button
            type="button"
            onClick={() => setActiveTab('lite')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold transition-all ${
              activeTab === 'lite'
                ? 'border border-[#ff640a] bg-zinc-950 text-white'
                : 'border border-white/10 bg-black text-zinc-400 hover:text-white hover:border-white/20'
            }`}
          >
            <Zap className="h-3.5 w-3.5 text-[#ff640a]" />
            <span>1. anime-lite (C Edition)</span>
            <span className="rounded bg-[#ff640a]/15 text-[#ff640a] px-1.5 py-0.2 text-[10px]">3.8ms</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cli')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold transition-all ${
              activeTab === 'cli'
                ? 'border border-[#ff640a] bg-zinc-950 text-white'
                : 'border border-white/10 bg-black text-zinc-400 hover:text-white hover:border-white/20'
            }`}
          >
            <Terminal className="h-3.5 w-3.5 text-[#ff640a]" />
            <span>2. anime-cli (Python Hub)</span>
            <span className="rounded bg-white/10 text-zinc-300 px-1.5 py-0.2 text-[10px]">Full Suite</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('android')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold transition-all ${
              activeTab === 'android'
                ? 'border border-[#ff640a] bg-zinc-950 text-white'
                : 'border border-white/10 bg-black text-zinc-400 hover:text-white hover:border-white/20'
            }`}
          >
            <Smartphone className="h-3.5 w-3.5 text-[#ff640a]" />
            <span>3. Shinsei Anime (Android)</span>
            <span className="rounded bg-white/10 text-zinc-300 px-1.5 py-0.2 text-[10px]">Standalone</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('config')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold transition-all ${
              activeTab === 'config'
                ? 'border border-[#ff640a] bg-zinc-950 text-white'
                : 'border border-white/10 bg-black text-zinc-400 hover:text-white hover:border-white/20'
            }`}
          >
            <FileCode2 className="h-3.5 w-3.5 text-[#ff640a]" />
            <span>config.json (SSOT)</span>
            <span className="rounded bg-white/10 text-zinc-300 px-1.5 py-0.2 text-[10px]">Zero-Break</span>
          </button>
        </div>

        {/* Tab Content Display */}
        <div className="rounded-2xl border border-white/10 bg-zinc-950 p-6 sm:p-8">
          
          {/* Tab 1: anime-lite (C Edition) */}
          {activeTab === 'lite' && (
            <div id="anime-lite" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-7 space-y-5">
                <div className="flex items-center gap-2 text-xs text-[#ff640a]">
                  <Zap className="h-4 w-4" />
                  <span className="font-bold tracking-wider uppercase">Tier 1 • Pure C99 High-Speed Binary</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white font-sans">
                  Sub-5ms Startup. 4.1MB RAM. Zero Python Overhead.
                </h3>
                <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                  Hand-crafted in pure C99 with vendored <code className="text-white">cJSON</code> and <code className="text-white">libcurl</code>.
                  Designed for power users, low-resource hardware (Raspberry Pi, Termux, old laptops), SSH sessions, or anyone who wants instantaneous execution.
                </p>

                <div className="grid grid-cols-2 gap-3 pt-2 text-xs font-sans">
                  <div className="rounded-xl border border-white/10 bg-black p-3.5">
                    <div className="text-zinc-500 text-[10px] uppercase font-mono">Picker Interface</div>
                    <div className="text-white font-semibold mt-0.5">Native fzf Fuzzy Search</div>
                    <div className="text-zinc-500 text-[10px] mt-1 font-mono">Instant ANSI fallback if fzf missing</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black p-3.5">
                    <div className="text-zinc-500 text-[10px] uppercase font-mono">Watch History</div>
                    <div className="text-[#ff640a] font-semibold mt-0.5">Instant Resume (-c)</div>
                    <div className="text-zinc-500 text-[10px] mt-1 font-mono">Saves position to history.json</div>
                  </div>
                </div>

                <div className="pt-2 space-y-2">
                  <span className="text-[11px] text-zinc-500 uppercase tracking-wider">Example Invocations:</span>
                  <div className="space-y-1.5 font-mono text-xs text-zinc-300">
                    <div className="p-2.5 rounded-lg bg-black border border-white/5 flex items-center justify-between">
                      <code>anime-lite -c</code>
                      <span className="text-[10px] text-zinc-500">Resumes in 4ms</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-black border border-white/5 flex items-center justify-between">
                      <code>anime-lite "chainsaw man" -e 1 -d</code>
                      <span className="text-[10px] text-[#ff640a]">Dub Stream in 480ms</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 rounded-xl border border-white/10 bg-black p-5 text-xs font-mono">
                <div className="flex items-center justify-between border-b border-white/5 pb-2 text-zinc-400 text-[11px]">
                  <span>anime-lite runtime output</span>
                  <span className="text-[#ff640a]">GCC 13 / C99</span>
                </div>
                <pre className="text-[10px] sm:text-[11px] text-[#ff640a] leading-none my-3 overflow-x-auto">
{`    _          _                      _     _ _       
   / \\   _ __ (_)_ __ ___   ___      | |   (_) |_ ___ 
  / _ \\ | '_ \\| | '_ \` _ \\ / _ \\_____| |   | | __/ _ \\
 / ___ \\| | | | | | | | | |  __/_____| |___| | ||  __/
/_/   \\_\\_| |_|_|_| |_| |_|\\___|     |_____|_|\\__\\___|
       Stream Anime via Anilab & Kyoto [C Edition]`}
                </pre>
                <div className="space-y-1 text-zinc-400 text-[11px] border-t border-white/5 pt-3">
                  <p className="text-white">&gt; Fetching catalog for &quot;jujutsu kaisen&quot; ...</p>
                  <p className="text-zinc-500">&gt; 12 results matched via fzf (0.002s)</p>
                  <p className="text-[#ff640a]">&gt; Spawning hardware MPV: --vo=gpu --hwdec=auto</p>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: anime-cli (Python Hub) */}
          {activeTab === 'cli' && (
            <div id="anime-cli" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-7 space-y-5">
                <div className="flex items-center gap-2 text-xs text-[#ff640a]">
                  <Terminal className="h-4 w-4" />
                  <span className="font-bold tracking-wider uppercase">Tier 2 • Complete Python Control Hub</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white font-sans">
                  AniSkip Auto-Skip, Airing Radar, Binge Roulette & Web PWA.
                </h3>
                <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                  The feature-complete flagship powerhouse. Automated AniSkip intro/outro skipping via custom MPV Lua scripts, live AniList broadcast schedules, batch episode downloader, and an obsidian Crunchyroll-style web PWA player.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 text-xs font-sans">
                  <div className="rounded-xl border border-white/10 bg-black p-3">
                    <div className="text-white font-semibold">⚡ AniSkip Auto-Skip</div>
                    <div className="text-zinc-500 text-[10px] mt-0.5">MPV jumps OP & ED cleanly</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black p-3">
                    <div className="text-[#ff640a] font-semibold">🎲 Binge Roulette</div>
                    <div className="text-zinc-500 text-[10px] mt-0.5">3-question vibe match (-B)</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black p-3">
                    <div className="text-white font-semibold">📅 Airing Radar</div>
                    <div className="text-zinc-500 text-[10px] mt-0.5">Live 24h schedule (--today)</div>
                  </div>
                </div>

                <div className="pt-2 space-y-2">
                  <span className="text-[11px] text-zinc-500 uppercase tracking-wider">Hub Commands:</span>
                  <div className="space-y-1.5 font-mono text-xs text-zinc-300">
                    <div className="p-2.5 rounded-lg bg-black border border-white/5 flex items-center justify-between">
                      <code>anime-cli -B</code>
                      <span className="text-[10px] text-[#ff640a]">Binge Recommendation</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-black border border-white/5 flex items-center justify-between">
                      <code>anime-cli --today</code>
                      <span className="text-[10px] text-zinc-400">Live Airing Schedule</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-black border border-white/5 flex items-center justify-between">
                      <code>anime-cli -o 'Solo Leveling' 1-12</code>
                      <span className="text-[10px] text-zinc-400">Batch 1080p Downloader</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 rounded-xl border border-white/10 bg-black p-5 text-xs font-mono">
                <div className="flex items-center justify-between border-b border-white/5 pb-2 text-zinc-400 text-[11px]">
                  <span>Interactive Terminal Menu</span>
                  <span className="text-zinc-500">Python 3.10+</span>
                </div>
                <div className="my-3 space-y-1.5 text-zinc-300 text-[11px]">
                  <div className="text-[#ff640a] font-bold">&gt; Choose an action:</div>
                  <div className="text-white bg-zinc-900 px-2 py-1 rounded">▶ 🔍 Search & Watch Anime</div>
                  <div className="text-zinc-400 px-2 py-0.5">  🎲 Binge Roulette (Quick 3-Question Match)</div>
                  <div className="text-zinc-400 px-2 py-0.5">  📅 Today&#39;s Airing Radar (Live Releases)</div>
                  <div className="text-zinc-400 px-2 py-0.5">  ▶ Continue Watching (Resume last ep)</div>
                  <div className="text-zinc-400 px-2 py-0.5">  📥 Batch Downloader (1080p MP4 via FFmpeg)</div>
                  <div className="text-zinc-400 px-2 py-0.5">  🌐 Launch Obsidian Web Player</div>
                  <div className="text-zinc-400 px-2 py-0.5">  📱 QR Wi-Fi Sync for Mobile</div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Shinsei Anime (Android App) */}
          {activeTab === 'android' && (
            <div id="shinsei-android" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-7 space-y-5">
                <div className="flex items-center gap-2 text-xs text-[#ff640a]">
                  <Smartphone className="h-4 w-4" />
                  <span className="font-bold tracking-wider uppercase">Tier 3 • 100% Standalone Jetpack Compose App</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white font-sans">
                  Native Android. Touch Gestures. Zero PC Requirement.
                </h3>
                <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                  Unlike remote streaming clients, <strong>Shinsei Anime</strong> is completely independent. It connects directly to the mobile Kyoto CDN over Wi-Fi or 5G with no PC or tunnel needed.
                </p>

                <ul className="space-y-2.5 text-xs text-zinc-300 font-sans">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ff640a] shrink-0 mt-1.5" />
                    <span><strong className="text-white">Gesture-Driven UI:</strong> Dual-axis swipe gestures (left brightness, right volume), double-tap seek.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ff640a] shrink-0 mt-1.5" />
                    <span><strong className="text-white">18+ Content Safety:</strong> Adult/ecchi titles strictly excluded from Trending & Spotlight carousels with explicit search warning.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ff640a] shrink-0 mt-1.5" />
                    <span><strong className="text-white">Sub-50ms P2P Wi-Fi Sync:</strong> Scan the terminal QR code to sync watch progress between your PC SQLite and phone Room DB.</span>
                  </li>
                </ul>

                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <a
                    href="https://github.com/Hackedghost64/anime-cli/releases/latest/download/ShinseiAnime-Release.apk"
                    className="flex items-center gap-2 rounded-xl bg-[#ff640a] px-4 py-2.5 text-xs font-semibold text-black hover:bg-[#ff7a29] transition-all"
                  >
                    <Smartphone className="h-4 w-4" />
                    <span>Download ShinseiAnime-Release.apk (~12.8MB)</span>
                  </a>
                </div>
              </div>

              <div className="lg:col-span-5 rounded-xl border border-white/10 bg-black p-5 text-xs font-mono text-center">
                <div className="inline-block rounded-2xl border border-white/15 bg-zinc-950 p-3 max-w-[260px] shadow-2xl">
                  <div className="rounded-xl overflow-hidden bg-black p-3 text-left space-y-2.5 border border-white/5">
                    <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                      <span>9:41 AM</span>
                      <span>5G 100%</span>
                    </div>
                    <div className="h-28 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center p-3 relative">
                      <div className="text-center">
                        <div className="text-[11px] font-bold text-white font-sans">Kyoto Player 1080p</div>
                        <div className="text-[9px] text-[#ff640a] font-mono mt-0.5">Gestures: Brightness / Vol / PiP</div>
                      </div>
                    </div>
                    <div className="text-[11px] font-bold text-white font-sans">Spotlight: Solo Leveling</div>
                    <div className="text-[10px] text-zinc-500 font-sans">Episode 12 • Sub & Dub Available</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: config.json (SSOT) */}
          {activeTab === 'config' && (
            <div id="config-json" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-6 space-y-5">
                <div className="flex items-center gap-2 text-xs text-[#ff640a]">
                  <FileCode2 className="h-4 w-4" />
                  <span className="font-bold tracking-wider uppercase">Single Source of Truth (SSOT)</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white font-sans">
                  The Zero-Break Architecture of `config.json`.
                </h3>
                <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                  How does the project ensure that when upstream mobile APIs rotate endpoints or headers, nothing breaks?
                  All 3 tiers—C binary, Python hub, and Android app—consume the exact same JSON contract:
                </p>

                <div className="space-y-2 text-xs font-sans">
                  <div className="rounded-xl border border-white/10 bg-black p-3">
                    <div className="text-white font-bold font-mono">1. anime-lite (C99):</div>
                    <div className="text-zinc-400 text-[11px] mt-0.5">Evaluated dynamically at launch via <code>src/config.c</code> with compile-time fallbacks.</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black p-3">
                    <div className="text-white font-bold font-mono">2. anime-cli (Python):</div>
                    <div className="text-zinc-400 text-[11px] mt-0.5">Loaded on demand via <code>config.py</code> without restarting services.</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black p-3">
                    <div className="text-white font-bold font-mono">3. Shinsei Anime (Android):</div>
                    <div className="text-zinc-400 text-[11px] mt-0.5">Copied to <code>assets/config.json</code> automatically during the Gradle release build.</div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-900 border border-white/10 text-zinc-200 text-xs font-sans">
                  Update <code className="text-[#ff640a]">config.json</code> once, and all three streaming clients adapt instantaneously without recompiling.
                </div>
              </div>

              <div className="lg:col-span-6 rounded-xl border border-white/10 bg-black p-4 text-xs font-mono">
                <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-2 text-zinc-400 text-[11px]">
                  <span>config.json</span>
                  <button
                    type="button"
                    onClick={handleCopyConfig}
                    className="flex items-center gap-1 text-zinc-400 hover:text-white transition-colors"
                  >
                    {copiedConfig ? (
                      <Check className="h-3.5 w-3.5 text-[#ff640a]" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    <span>{copiedConfig ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="text-[11px] text-[#ff640a] leading-relaxed overflow-x-auto p-3 bg-zinc-950 rounded-lg border border-white/5">
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
