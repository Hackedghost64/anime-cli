import React from 'react';
import { Clock, Zap, Cpu } from 'lucide-react';
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
    anicli: '⚠️ Mixed / Unverified',
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
    lite: '❌ Terminal stream only',
    cli: '✅ 1080p MP4 Batch (-o)',
    anicli: '⚠️ Single episode only',
    winner: 'cli',
    note: 'Parallel multi-episode download via FFmpeg',
  },
];

export const BenchmarksSection: React.FC = () => {
  return (
    <section id="benchmarks" className="py-24 border-t border-white/10 bg-black text-white font-mono">
      <div className="mx-auto max-w-6xl px-6">
        
        {/* Header */}
        <div className="max-w-3xl mb-14 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-zinc-950 text-xs text-zinc-400 uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff640a]" />
            <span>Chapter 04 // Empirical Benchmarks</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black font-sans tracking-tight text-white leading-tight">
            Hard Data Under <br />
            <span className="text-[#ff640a]">Real-World Loads.</span>
          </h2>

          <p className="text-zinc-400 text-sm sm:text-base font-light font-sans leading-relaxed">
            All benchmarks measured under identical Linux Kernel 6.8 gigabit network conditions.
            See how the compiled C binary and Python Hub outclass legacy shell scrapers.
          </p>
        </div>

        {/* 3 Metric Spotlight Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          
          {/* Card 1: Cold Start */}
          <div className="rounded-2xl border border-white/10 bg-zinc-950 p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-3">
                <span className="flex items-center gap-1.5 text-white font-bold">
                  <Clock className="h-4 w-4 text-[#ff640a]" />
                  STARTUP LATENCY
                </span>
                <span className="text-[#ff640a] text-[10px] font-bold">10x FASTER</span>
              </div>
              <div className="text-3xl sm:text-4xl font-extrabold text-white mb-2 font-sans">
                <CountUp to={3.8} decimals={1} suffix=" ms" />
              </div>
              <p className="text-xs text-zinc-400 font-sans leading-relaxed mb-6">
                <code>anime-lite</code> executes instantly with zero Python runtime initialization or dynamic import penalties.
              </p>
            </div>

            <div className="space-y-2 text-[11px] pt-4 border-t border-white/5">
              <div>
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-white">anime-lite (C99)</span>
                  <span className="text-[#ff640a] font-bold">3.8 ms</span>
                </div>
                <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
                  <div className="h-full bg-[#ff640a] rounded-full w-[4%]" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] mb-1 text-zinc-500">
                  <span>ani-cli (Bash forks)</span>
                  <span>145 ms</span>
                </div>
                <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
                  <div className="h-full bg-zinc-600 rounded-full w-[38%]" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] mb-1 text-zinc-500">
                  <span>anime-cli (Python)</span>
                  <span>380 ms</span>
                </div>
                <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
                  <div className="h-full bg-zinc-700 rounded-full w-[95%]" />
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Resolution Speed */}
          <div className="rounded-2xl border border-white/10 bg-zinc-950 p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-3">
                <span className="flex items-center gap-1.5 text-white font-bold">
                  <Zap className="h-4 w-4 text-[#ff640a]" />
                  STREAM HOP SPEED
                </span>
                <span className="text-[#ff640a] text-[10px] font-bold">8x FASTER</span>
              </div>
              <div className="text-3xl sm:text-4xl font-extrabold text-white mb-2 font-sans">
                <CountUp to={480} decimals={0} suffix=" ms" />
              </div>
              <p className="text-xs text-zinc-400 font-sans leading-relaxed mb-6">
                Single-hop direct JSON query vs. ani-cli making 5-8 sequential HTML downloads and iframe decryptions.
              </p>
            </div>

            <div className="space-y-2 text-[11px] pt-4 border-t border-white/5">
              <div>
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-white">anime-lite (Direct Mobile)</span>
                  <span className="text-[#ff640a] font-bold">480 ms</span>
                </div>
                <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
                  <div className="h-full bg-[#ff640a] rounded-full w-[12%]" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] mb-1 text-zinc-500">
                  <span>anime-cli (Python Async)</span>
                  <span>720 ms</span>
                </div>
                <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
                  <div className="h-full bg-zinc-600 rounded-full w-[18%]" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] mb-1 text-zinc-500">
                  <span>ani-cli (HTML Scraping)</span>
                  <span>3,800 ms</span>
                </div>
                <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
                  <div className="h-full bg-zinc-700 rounded-full w-[98%]" />
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: RAM Footprint */}
          <div className="rounded-2xl border border-white/10 bg-zinc-950 p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-3">
                <span className="flex items-center gap-1.5 text-white font-bold">
                  <Cpu className="h-4 w-4 text-[#ff640a]" />
                  RAM FOOTPRINT (RSS)
                </span>
                <span className="text-[#ff640a] text-[10px] font-bold">ULTRA LEAN</span>
              </div>
              <div className="text-3xl sm:text-4xl font-extrabold text-white mb-2 font-sans">
                <CountUp to={4.1} decimals={1} prefix="~" suffix=" MB" />
              </div>
              <p className="text-xs text-zinc-400 font-sans leading-relaxed mb-6">
                Pure C99 with vendored cJSON and zero third-party dynamic bloat. Runs effortlessly even on a 512MB Raspberry Pi Zero.
              </p>
            </div>

            <div className="space-y-2 text-[11px] pt-4 border-t border-white/5">
              <div>
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-white">anime-lite (C99)</span>
                  <span className="text-[#ff640a] font-bold">4.1 MB</span>
                </div>
                <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
                  <div className="h-full bg-[#ff640a] rounded-full w-[11%]" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] mb-1 text-zinc-500">
                  <span>ani-cli (Bash forks)</span>
                  <span>18.4 MB</span>
                </div>
                <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
                  <div className="h-full bg-zinc-600 rounded-full w-[48%]" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] mb-1 text-zinc-500">
                  <span>anime-cli (Python suite)</span>
                  <span>38.2 MB</span>
                </div>
                <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
                  <div className="h-full bg-zinc-700 rounded-full w-[95%]" />
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Detailed Comparison Matrix Table */}
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-zinc-950">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/10 bg-black text-zinc-400 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-5 py-4 font-bold">Capability / Metric</th>
                <th className="px-5 py-4 font-bold text-[#ff640a]">anime-lite (C Edition)</th>
                <th className="px-5 py-4 font-bold text-white">anime-cli (Python Hub)</th>
                <th className="px-5 py-4 font-bold text-zinc-500">ani-cli (Legacy Scraper)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {BENCHMARK_DATA.map((row, i) => (
                <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3.5 font-semibold text-white">
                    <div>{row.metric}</div>
                    {row.note && <div className="text-[10px] text-zinc-500 font-normal font-sans">{row.note}</div>}
                  </td>
                  <td className={`px-5 py-3.5 ${row.winner === 'lite' || row.winner === 'both' ? 'text-[#ff640a] font-semibold' : 'text-zinc-300'}`}>
                    {row.lite}
                  </td>
                  <td className={`px-5 py-3.5 ${row.winner === 'cli' || row.winner === 'both' ? 'text-white font-semibold' : 'text-zinc-300'}`}>
                    {row.cli}
                  </td>
                  <td className="px-5 py-3.5 text-zinc-500">
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
