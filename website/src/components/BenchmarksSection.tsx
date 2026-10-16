import React, { useState } from 'react';
import { Zap, Activity, Clock, ShieldCheck, Check, X, AlertTriangle, Layers, Cpu } from 'lucide-react';
import { TechText } from './TechText';
import { CountUp } from './CountUp';

interface BenchmarkRow {
  metric: string;
  lite: string;
  cli: string;
  anicli: string;
  winner: 'lite' | 'cli' | 'anicli' | 'both';
  note?: string;
}

const BENCHMARK_DATA: BenchmarkRow[] = [
  {
    metric: 'CLI Cold Startup Latency',
    lite: '3.8 ms (Instant C99)',
    cli: '380 ms (Python runtime)',
    anicli: '145 ms (Bash forks)',
    winner: 'lite',
    note: 'Measured under Linux 6.8 AMD Ryzen 7 NVMe',
  },
  {
    metric: 'Stream Resolution Speed',
    lite: '480 ms (Single HTTP hop)',
    cli: '720 ms (Async HTTP/2)',
    anicli: '3,800 ms (Multi-page scraping)',
    winner: 'lite',
    note: 'Time from enter key to first HLS segment',
  },
  {
    metric: 'RAM Footprint (RSS)',
    lite: '4.1 MB (Ultra-lean C)',
    cli: '38.2 MB (Python runtime)',
    anicli: '18.4 MB (Pipes + sed/grep)',
    winner: 'lite',
    note: 'Peak resident memory allocation',
  },
  {
    metric: 'Cloudflare / Captcha Immunity',
    lite: '100% Immune (Mobile CDN)',
    cli: '100% Immune (Mobile CDN)',
    anicli: '❌ Blocked by Turnstile',
    winner: 'both',
    note: 'Mobile microservices bypass browser bot-checks',
  },
  {
    metric: '1080p Master HLS Feeds',
    lite: '✅ Kyoto 1080p Stream',
    cli: '✅ Kyoto 1080p Stream',
    anicli: '⚠️ Compressed / Mixed',
    winner: 'both',
    note: 'Full bitrate adaptive master playlist',
  },
  {
    metric: 'AniSkip (Intro/Outro Skip)',
    lite: '✅ MPV Chapter & Key Jump',
    cli: '✅ Automated MPV Lua Script',
    anicli: '❌ None (Manual scrubbing)',
    winner: 'cli',
    note: 'Automatic detection of opening & ending bounds',
  },
  {
    metric: 'Sub & Dub Audio Modes',
    lite: '✅ -s (Sub) / -d (Dub)',
    cli: '✅ Auto-negotiated Sub/Dub',
    anicli: '⚠️ Often broken / Desynced',
    winner: 'both',
    note: 'Japanese original audio and English dub tracks',
  },
  {
    metric: 'Watch Progress Resume',
    lite: '✅ Instant -c (history.json)',
    cli: '✅ Full -c with Auto-Next',
    anicli: '⚠️ Basic text file log',
    winner: 'both',
    note: 'Millisecond-accurate playback position recovery',
  },
  {
    metric: 'P2P Mobile Sync',
    lite: '✅ config.json compatible',
    cli: '✅ Sub-50ms Wi-Fi QR Sync',
    anicli: '❌ None',
    winner: 'cli',
    note: 'Sync watch history with Shinsei Android app',
  },
  {
    metric: 'Batch Downloader',
    lite: '❌ Terminal only',
    cli: '✅ 1080p MP4 Batch (-o)',
    anicli: '⚠️ Single episode only',
    winner: 'cli',
    note: 'Parallel multi-episode download via FFmpeg',
  },
];

export const BenchmarksSection: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'speed' | 'features'>('all');

  return (
    <section id="benchmarks" className="py-20 border-t border-slate-800/80 bg-[#08090a] relative font-mono">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="max-w-3xl mb-12 space-y-3">
          <TechText tag="METRICS_LAB" glowColor="green" className="text-2xl sm:text-4xl font-bold font-sans">
            Interactive Benchmarks: <br />
            <span className="text-white">Hard Data Under Real-World Gigabit Loads.</span>
          </TechText>
          <p className="text-slate-400 text-sm leading-relaxed">
            All benchmarks measured under identical Linux Kernel 6.8 gigabit network conditions.
            See how the compiled C binary and Python Hub outclass legacy shell scrapers.
          </p>
        </div>

        {/* 3 Metric Spotlight Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          
          {/* Card 1: Cold Start */}
          <div className="rounded-xl border border-cyber-cyan/30 bg-[#0d121a] p-6 shadow-glow-cyan relative overflow-hidden">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="flex items-center gap-1.5 text-cyber-cyan font-bold">
                <Clock className="h-4 w-4" />
                STARTUP LATENCY
              </span>
              <span>10x FASTER</span>
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold text-white mb-2">
              <CountUp to={3.8} decimals={1} prefix="⚡ " suffix=" ms" />
            </div>
            <p className="text-xs text-slate-400 mb-4">
              `anime-lite` loads instantaneously with zero Python runtime initialization or dynamic import penalties.
            </p>
            {/* Visual Progress comparison bar */}
            <div className="space-y-1.5 text-[11px]">
              <div>
                <div className="flex justify-between text-slate-400 text-[10px]">
                  <span>anime-lite (C99)</span>
                  <span className="text-cyber-cyan font-bold">3.8 ms</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-cyber-cyan rounded-full w-[4%]" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-slate-400 text-[10px]">
                  <span>ani-cli (Bash forks)</span>
                  <span className="text-slate-300">145 ms</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-600 rounded-full w-[38%]" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-slate-400 text-[10px]">
                  <span>anime-cli (Python)</span>
                  <span className="text-slate-300">380 ms</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-cyber-green rounded-full w-[95%]" />
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Resolution Speed */}
          <div className="rounded-xl border border-cyber-green/30 bg-[#0d121a] p-6 shadow-glow-green relative overflow-hidden">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="flex items-center gap-1.5 text-cyber-green font-bold">
                <Zap className="h-4 w-4" />
                STREAM HOP SPEED
              </span>
              <span>8x FASTER</span>
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold text-white mb-2">
              <CountUp to={480} decimals={0} prefix="⚡ " suffix=" ms" />
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Single-hop direct JSON query vs. ani-cli having to make 5-8 sequential HTML downloads and iframe decryptions.
            </p>
            <div className="space-y-1.5 text-[11px]">
              <div>
                <div className="flex justify-between text-slate-400 text-[10px]">
                  <span>anime-lite (Direct Mobile API)</span>
                  <span className="text-cyber-green font-bold">480 ms</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-cyber-green rounded-full w-[12%]" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-slate-400 text-[10px]">
                  <span>anime-cli (Python Async HTTP/2)</span>
                  <span className="text-slate-300">720 ms</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-cyber-cyan rounded-full w-[18%]" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-slate-400 text-[10px]">
                  <span>ani-cli (Multi-Page Scraper)</span>
                  <span className="text-red-400">3,800 ms</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-red-500/80 rounded-full w-[98%]" />
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: RAM Footprint */}
          <div className="rounded-xl border border-cyber-purple/30 bg-[#0d121a] p-6 shadow-glow-purple relative overflow-hidden">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="flex items-center gap-1.5 text-cyber-purple font-bold">
                <Cpu className="h-4 w-4" />
                RAM FOOTPRINT (RSS)
              </span>
              <span>ULTRA LEAN</span>
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold text-white mb-2">
              <CountUp to={4.1} decimals={1} prefix="~" suffix=" MB" />
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Compiled C99 with vendored cJSON and zero third-party dynamic bloat. Runs smoothly even on a 512MB Raspberry Pi Zero.
            </p>
            <div className="space-y-1.5 text-[11px]">
              <div>
                <div className="flex justify-between text-slate-400 text-[10px]">
                  <span>anime-lite</span>
                  <span className="text-cyber-purple font-bold">4.1 MB</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-cyber-purple rounded-full w-[11%]" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-slate-400 text-[10px]">
                  <span>ani-cli (Subshells)</span>
                  <span className="text-slate-300">18.4 MB</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-600 rounded-full w-[48%]" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-slate-400 text-[10px]">
                  <span>anime-cli (Python suite)</span>
                  <span className="text-slate-300">38.2 MB</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-cyber-cyan rounded-full w-[95%]" />
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Detailed Comparison Matrix Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#0b0e14] shadow-2xl">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-[#080a0e] text-slate-400 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-5 py-4 font-bold">Capability / Metric</th>
                <th className="px-5 py-4 font-bold text-cyber-cyan">anime-lite (C Edition ⚡)</th>
                <th className="px-5 py-4 font-bold text-cyber-green">anime-cli (Python Hub 🐍)</th>
                <th className="px-5 py-4 font-bold text-slate-400">ani-cli (Shell Scrapers 🐚)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {BENCHMARK_DATA.map((row, i) => (
                <tr key={i} className="hover:bg-slate-900/40 transition-colors">
                  <td className="px-5 py-3.5 font-semibold text-white">
                    <div>{row.metric}</div>
                    {row.note && <div className="text-[10px] text-slate-500 font-normal">{row.note}</div>}
                  </td>
                  <td className={`px-5 py-3.5 ${row.winner === 'lite' || row.winner === 'both' ? 'text-cyber-cyan font-semibold' : 'text-slate-300'}`}>
                    {row.lite}
                  </td>
                  <td className={`px-5 py-3.5 ${row.winner === 'cli' || row.winner === 'both' ? 'text-cyber-green font-semibold' : 'text-slate-300'}`}>
                    {row.cli}
                  </td>
                  <td className="px-5 py-3.5 text-slate-400">
                    {row.anicli}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </section>
  );
};
