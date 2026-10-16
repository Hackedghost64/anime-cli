import React from 'react';
import { ShieldAlert, ShieldCheck, Zap, XCircle, CheckCircle2 } from 'lucide-react';
import { PixelTransition } from './PixelTransition';

export const StorySection: React.FC = () => {
  return (
    <section id="story" className="py-24 border-t border-white/10 bg-black relative text-white font-mono">
      <div className="mx-auto max-w-6xl px-6">
        
        {/* Section Header */}
        <div className="max-w-3xl mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-zinc-950 text-xs text-zinc-400 uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff640a]" />
            <span>Chapter 01 // The Problem</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black font-sans tracking-tight text-white leading-tight">
            The Web Scraper Graveyard. <br />
            <span className="text-[#ff640a]">Why We Rebuilt the Stack.</span>
          </h2>

          <p className="text-zinc-400 text-sm sm:text-base font-light font-sans leading-relaxed">
            Tools like <code className="text-[#ff640a] font-mono">ani-cli</code> introduced streaming anime in the terminal.
            However, relying on parsing HTML web pages with <code className="text-zinc-300 font-mono">curl</code>, <code className="text-zinc-300 font-mono">grep</code>, and <code className="text-zinc-300 font-mono">sed</code> is inherently brittle.
            When pirate websites shuffle DOM classes, rotate iframe keys, or deploy Cloudflare Turnstile, scraping scripts break without warning.
          </p>
        </div>

        {/* Side-by-Side Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          
          {/* Old Way */}
          <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-2 text-zinc-400">
                <ShieldAlert className="h-4 w-4 text-zinc-500" />
                <span className="text-xs font-bold tracking-wider uppercase text-zinc-300">The Old Way: HTML Scraping</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded border border-zinc-800 bg-zinc-900 text-zinc-400">
                Fragile & Slow
              </span>
            </div>

            <p className="text-xs text-zinc-400 font-sans leading-relaxed">
              Traditional tools spawn cascading subshells to fetch 150KB web pages meant for desktop browsers. Anti-bot checks immediately halt execution.
            </p>

            <ul className="space-y-3 text-xs font-sans">
              <li className="flex items-start gap-2.5 text-zinc-400">
                <XCircle className="h-4 w-4 text-zinc-600 shrink-0 mt-0.5" />
                <span><strong className="text-zinc-200">Cloudflare Turnstile Blocks:</strong> Captchas render headless bash scripts dead on arrival.</span>
              </li>
              <li className="flex items-start gap-2.5 text-zinc-400">
                <XCircle className="h-4 w-4 text-zinc-600 shrink-0 mt-0.5" />
                <span><strong className="text-zinc-200">Broken Audio Tracks:</strong> Regex audio extraction fails when mirrors change keys.</span>
              </li>
              <li className="flex items-start gap-2.5 text-zinc-400">
                <XCircle className="h-4 w-4 text-zinc-600 shrink-0 mt-0.5" />
                <span><strong className="text-zinc-200">Multi-Second Overhead:</strong> 4 to 8 sequential page hops before video playback starts.</span>
              </li>
              <li className="flex items-start gap-2.5 text-zinc-400">
                <XCircle className="h-4 w-4 text-zinc-600 shrink-0 mt-0.5" />
                <span><strong className="text-zinc-200">Manual Scrubbing:</strong> Zero automated intro/outro detection forces manual seeking.</span>
              </li>
            </ul>

            <div className="rounded-xl bg-black p-4 text-[11px] font-mono text-zinc-500 border border-white/5">
              <span className="text-zinc-400">$ ani-cli "chainsaw man"</span><br />
              <span className="text-zinc-600">&gt; Error: Cloudflare challenge page detected (HTTP 403)</span><br />
              <span className="text-zinc-600">&gt; Failed to parse iframe stream url from mirror #2</span>
            </div>
          </div>

          {/* Shinsei Mobile API Way */}
          <div className="rounded-2xl border border-[#ff640a]/30 bg-zinc-950/80 p-8 space-y-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#ff640a]" />

            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-2 text-white">
                <ShieldCheck className="h-4 w-4 text-[#ff640a]" />
                <span className="text-xs font-bold tracking-wider uppercase text-white">The Shinsei Way: Mobile JSON APIs</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded border border-[#ff640a]/40 bg-[#ff640a]/10 text-[#ff640a]">
                Immune to Bot Checks
              </span>
            </div>

            <p className="text-xs text-zinc-300 font-sans leading-relaxed">
              We reverse-engineered high-volume native Android clients (Anilab & Kyoto Player). We communicate directly with private JSON microservices over HTTP/2 using authentic mobile headers.
            </p>

            <ul className="space-y-3 text-xs font-sans">
              <li className="flex items-start gap-2.5 text-zinc-300">
                <CheckCircle2 className="h-4 w-4 text-[#ff640a] shrink-0 mt-0.5" />
                <span><strong className="text-white">100% Cloudflare Immunity:</strong> Mobile backend endpoints do not serve browser Turnstile challenges.</span>
              </li>
              <li className="flex items-start gap-2.5 text-zinc-300">
                <CheckCircle2 className="h-4 w-4 text-[#ff640a] shrink-0 mt-0.5" />
                <span><strong className="text-white">Guaranteed 1080p Master HLS:</strong> Pristine adaptive bitrate Kyoto CDN feeds with dual audio.</span>
              </li>
              <li className="flex items-start gap-2.5 text-zinc-300">
                <CheckCircle2 className="h-4 w-4 text-[#ff640a] shrink-0 mt-0.5" />
                <span><strong className="text-white">Sub-500ms Single-Hop Resolution:</strong> Direct REST query returns ready-to-play manifests in one shot.</span>
              </li>
              <li className="flex items-start gap-2.5 text-zinc-300">
                <CheckCircle2 className="h-4 w-4 text-[#ff640a] shrink-0 mt-0.5" />
                <span><strong className="text-white">Native AniSkip Integration:</strong> Automatic chapter bounds jump OP/ED cleanly without touching keys.</span>
              </li>
            </ul>

            <div className="rounded-xl bg-black p-4 text-[11px] font-mono text-zinc-300 border border-[#ff640a]/20">
              <span className="text-white">$ anime-lite "chainsaw man" -e 1 -d</span><br />
              <span className="text-[#ff640a]">&gt; [Kyoto] Stream resolved: 1080p Master HLS (480ms)</span><br />
              <span className="text-zinc-400">&gt; [AniSkip] Intro: 01:28 - 02:58 [AUTO-SKIPPED] ▶ MPV Spawned</span>
            </div>
          </div>

        </div>

        {/* Minimalist Interactive Dissolve */}
        <div className="rounded-2xl border border-white/10 bg-zinc-950 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/5">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-[#ff640a]" />
                Architecture Transition: Payload to Player
              </h4>
              <p className="text-xs text-zinc-500 mt-1 font-sans">
                Hover over the viewport to dissolve from the raw reverse-engineered JSON response to zero-overhead hardware playback.
              </p>
            </div>
          </div>

          <PixelTransition
            gridSize={12}
            pixelColor="#ff640a"
            className="h-64 sm:h-56 rounded-xl border border-white/5 bg-black"
            firstContent={
              <div className="font-mono text-xs text-zinc-300 space-y-2 p-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2 text-[11px] text-zinc-500">
                  <span>PAYLOAD: Kyoto Mobile REST v4 (Reverse-Engineered Anilab)</span>
                  <span className="text-[#ff640a]">STATUS: 200 OK</span>
                </div>
                <pre className="text-[11px] text-zinc-300 leading-relaxed overflow-x-auto">
{`{
  "status": 200,
  "sources": [
    { "file": "https://kyotocdn.net/hls/master.m3u8", "type": "hls", "label": "1080p Full HD" },
    { "file": "https://kyotocdn.net/hls/720p.m3u8", "type": "hls", "label": "720p HD" }
  ],
  "tracks": [{ "kind": "captions", "file": "https://kyotocdn.net/sub/en.vtt", "label": "English" }],
  "intro": { "start": 88, "end": 178 }
}`}
                </pre>
              </div>
            }
            secondContent={
              <div className="font-mono text-xs text-white space-y-3 p-4 flex flex-col justify-center h-full">
                <div className="inline-flex items-center gap-2 rounded border border-[#ff640a]/40 bg-[#ff640a]/10 px-2.5 py-1 text-[#ff640a] text-xs font-bold w-fit">
                  <span>⚡ ZERO-COPY GPU PLAYBACK</span>
                </div>
                <h5 className="text-base sm:text-lg font-bold text-white">
                  Direct Dispatch to MPV Hardware Pipeline
                </h5>
                <p className="text-xs text-zinc-400 font-sans max-w-xl leading-relaxed">
                  Streams feed straight into MPV with custom mobile headers, hardware decoding (<code className="text-zinc-200">--hwdec=auto</code>), and instant seek. No browser overhead. 4.1MB RAM footprint. Zero ads.
                </p>
              </div>
            }
          />
        </div>

      </div>
    </section>
  );
};
