import React from 'react';
import { ShieldAlert, ShieldCheck, Bug, Zap, Globe, Lock, RefreshCw, Terminal, CheckCircle2, XCircle } from 'lucide-react';
import { TechText } from './TechText';
import { DecryptedText } from './DecryptedText';
import { PixelTransition } from './PixelTransition';

export const StorySection: React.FC = () => {
  return (
    <section id="story" className="py-20 border-t border-slate-800/80 bg-[#08090a] relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl mb-14 space-y-3">
          <TechText tag="ORIGIN_STORY" glowColor="purple" className="text-2xl sm:text-4xl font-bold font-sans">
            Why We Built This: <br />
            <span className="text-white">The Death of Fragile HTML Web Scrapers.</span>
          </TechText>
          <p className="text-slate-400 font-mono text-sm leading-relaxed">
            Tools like <code className="text-cyber-orange">ani-cli</code> popularized anime in the terminal, but their architecture was fundamentally doomed. 
            Scraping browser web pages with <code className="text-slate-300">curl</code>, <code className="text-slate-300">grep</code>, and <code className="text-slate-300">sed</code> breaks continuously whenever pirate sites rotate DOM classes, shuffle iframes, or enable Cloudflare Turnstile captchas.
          </p>
        </div>

        {/* Comparison Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          
          {/* Old Scrapers Card */}
          <div className="rounded-xl border border-red-900/40 bg-[#0f1115]/90 p-6 space-y-5 relative overflow-hidden font-mono">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-red-500/60" />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-red-400">
                <ShieldAlert className="h-5 w-5" />
                <span className="text-sm font-bold tracking-wider">THE OLD WAY: HTML SCRAPING</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-red-950/60 text-red-400 border border-red-800/60">
                FRAGILE & SLOW
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Traditional tools spawn dozens of subshells to parse heavy HTML pages designed for browsers. When anti-bot protections trigger, users get empty lists, 403 Forbidden, or broken English Dub tracks.
            </p>

            <ul className="space-y-2.5 text-xs">
              <li className="flex items-start gap-2 text-slate-300">
                <XCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                <span><strong>Cloudflare Turnstile Blocks:</strong> Captchas render headless bash scrapers instantly dead.</span>
              </li>
              <li className="flex items-start gap-2 text-slate-300">
                <XCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                <span><strong>Broken English Dubs:</strong> Audio selector regex breaks whenever stream providers swap mirror keys.</span>
              </li>
              <li className="flex items-start gap-2 text-slate-300">
                <XCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                <span><strong>Multi-Second Hop Overhead:</strong> Requires 4 to 8 sequential web page downloads before MPV can even spawn.</span>
              </li>
              <li className="flex items-start gap-2 text-slate-300">
                <XCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                <span><strong>Tedious Manual Scrubbing:</strong> Zero automated intro/outro detection forces constant keyboard tapping.</span>
              </li>
            </ul>

            <div className="rounded bg-black/60 p-3 text-[11px] text-red-400 border border-red-900/40">
              <code>$ ani-cli "naruto"<br />&gt; Error: Cloudflare challenge page detected (HTTP 403)<br />&gt; Failed to parse iframe stream url from mirror #2</code>
            </div>
          </div>

          {/* New Reverse-Engineered Mobile Card */}
          <div className="rounded-xl border border-cyber-green/40 bg-[#0e141a]/90 p-6 space-y-5 relative overflow-hidden font-mono shadow-glow-green">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-cyber-green" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-cyber-green">
                <ShieldCheck className="h-5 w-5" />
                <span className="text-sm font-bold tracking-wider">THE SHINSEI WAY: MOBILE JSON APIS</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-cyber-green/10 text-cyber-green border border-cyber-green/30">
                IMMUNE TO BOT BLOCKS
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              We intercepted the native traffic of high-volume Android streaming apps (Anilab & Kyoto Player). Instead of parsing messy web pages, we communicate directly with high-speed JSON microservices using modern mobile TLS headers.
            </p>

            <ul className="space-y-2.5 text-xs">
              <li className="flex items-start gap-2 text-slate-200">
                <CheckCircle2 className="h-4 w-4 text-cyber-green shrink-0 mt-0.5" />
                <span><strong>100% Cloudflare Immunity:</strong> Mobile app backends do not serve Turnstile or JavaScript browser challenges.</span>
              </li>
              <li className="flex items-start gap-2 text-slate-200">
                <CheckCircle2 className="h-4 w-4 text-cyber-green shrink-0 mt-0.5" />
                <span><strong>Guaranteed 1080p Master HLS:</strong> Pristine adaptive bitrate Kyoto CDN feeds with Japanese Sub and English Dub.</span>
              </li>
              <li className="flex items-start gap-2 text-slate-200">
                <CheckCircle2 className="h-4 w-4 text-cyber-green shrink-0 mt-0.5" />
                <span><strong>Sub-500ms Single-Hop Resolution:</strong> Direct REST query returns ready-to-play `.m3u8` manifests instantly.</span>
              </li>
              <li className="flex items-start gap-2 text-slate-200">
                <CheckCircle2 className="h-4 w-4 text-cyber-green shrink-0 mt-0.5" />
                <span><strong>Native AniSkip Integration:</strong> Automatic chapter bounds jump OP/ED cleanly without lifting a finger.</span>
              </li>
            </ul>

            <div className="rounded bg-black/60 p-3 text-[11px] text-cyber-green border border-cyber-green/30">
              <code>$ anime-lite "chainsaw man" -e 1 -d<br />&gt; [Kyoto] Stream resolved: 1080p Master HLS (480ms)<br />&gt; [AniSkip] Intro: 01:28 - 02:58 [AUTO-SKIPPED] ▶ MPV Spawned</code>
            </div>
          </div>

        </div>

        {/* Interactive PixelTransition Demonstration */}
        <div className="rounded-2xl border border-slate-800 bg-[#0a0d13] p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <div>
              <h4 className="text-sm font-bold font-mono text-white flex items-center gap-2">
                <Zap className="h-4 w-4 text-cyber-cyan" />
                INTERACTIVE ARCHITECTURE DISSOLVE
              </h4>
              <p className="text-xs font-mono text-slate-400">
                Hover or click over the terminal box below to trigger the pixel matrix transition between Raw Network JSON & Final Player Delivery.
              </p>
            </div>
          </div>

          <PixelTransition
            gridSize={10}
            className="h-64 sm:h-56"
            firstContent={
              <div className="font-mono text-xs text-slate-300 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-[11px] text-slate-500">
                  <span>PAYLOAD: Kyoto Mobile REST v4 (Anilab Reverse-Engineered)</span>
                  <span className="text-cyber-green">STATUS: 200 OK</span>
                </div>
                <pre className="text-[11px] text-cyber-cyan leading-relaxed overflow-x-auto">
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
              <div className="font-mono text-xs text-white space-y-3 text-center sm:text-left">
                <div className="inline-flex items-center gap-2 rounded bg-cyber-green/10 border border-cyber-green/40 px-2.5 py-1 text-cyber-green text-xs font-bold">
                  <span>⚡ ZERO-LATENCY PLAYBACK GRABBED</span>
                </div>
                <h5 className="text-base sm:text-lg font-bold text-white">
                  Direct Player Execution (Hardware-Accelerated MPV)
                </h5>
                <p className="text-xs text-slate-400 max-w-lg">
                  Streams feed directly into MPV with custom referrers, custom mobile User-Agent, and hardware-accelerated shaders.
                  No browser needed. 4MB RAM footprint. Zero ads.
                </p>
              </div>
            }
          />
        </div>

      </div>
    </section>
  );
};
