import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ShieldCheck, Zap, FastForward, PlayCircle, Terminal, Cpu } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

interface PipelineStep {
  badge: string;
  title: string;
  subtitle: string;
  latency: string;
  icon: React.ReactNode;
  color: string;
  glowColor: string;
  snippet: string;
}

const steps: PipelineStep[] = [
  {
    badge: 'STAGE 01 // HANDSHAKE',
    title: 'TLS Fingerprint Spoofing & Bypass',
    subtitle: 'Direct Mobile Client Impersonation (No Scrapers / No 403s)',
    latency: '3.8 ms',
    icon: <ShieldCheck className="w-6 h-6 text-emerald-400" />,
    color: '#2bb673',
    glowColor: 'rgba(43, 182, 115, 0.4)',
    snippet: `GET /api/search?query=naruto HTTP/2
Host: anilab2.amdapi.click
User-Agent: okhttp/4.12.0
os-version: 35 | app-id: com.xo.anilab
[STATUS: 200 OK] -> TLS JA3 Fingerprint Verified`
  },
  {
    badge: 'STAGE 02 // RESOLUTION',
    title: 'Kyoto 1080p HLS Stream Derivation',
    subtitle: 'Direct Private Master Playlist HLS Handoff',
    latency: '480 ms',
    icon: <Zap className="w-6 h-6 text-cyber-cyan" />,
    color: '#5f8bff',
    glowColor: 'rgba(95, 139, 255, 0.4)',
    snippet: `POST /api/v4/post?id=1000003686 HTTP/2
Host: app.kyotoplayer.com
Referer: https://play.app/ | X-Requested-With: PLAY
[STREAM READY] -> master.m3u8 (1080p 6000kbps 60fps)`
  },
  {
    badge: 'STAGE 03 // INTELLIGENCE',
    title: 'AniSkip Auto-Skip Timing Alignment',
    subtitle: 'AniList GraphQL MAL Mapping + Opening/Ending Chapter Injection',
    latency: '42 ms',
    icon: <FastForward className="w-6 h-6 text-crunchy-orange" />,
    color: '#ff6b00',
    glowColor: 'rgba(255, 107, 0, 0.4)',
    snippet: `GET /v2/skip-times/1000003686/1?types=op&types=ed
Host: api.aniskip.com
[OP FOUND]: 01:28.400 -> 02:58.200 (Action: Auto-Skip)
[ED FOUND]: 21:40.000 -> 23:10.000 (Action: Auto-Skip)`
  },
  {
    badge: 'STAGE 04 // DISPATCH',
    title: 'Hardware-Accelerated Zero-Copy Player',
    subtitle: 'MPV GPU Pipeline / Jetpack Compose Native View',
    latency: '< 1 ms',
    icon: <PlayCircle className="w-6 h-6 text-purple-400" />,
    color: '#F25BD0',
    glowColor: 'rgba(242, 91, 208, 0.4)',
    snippet: `mpv --hwdec=auto --referrer=https://play.app/ \\
    --user-agent="okhttp/4.12.0" \\
    --script=~/.local/share/anime-cli/aniskip.lua \\
    "https://b1.xlsbox.com/.../master.m3u8"`
  }
];

export const GsapStreamPipeline: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pinWrapRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const packetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion || !containerRef.current || !pinWrapRef.current) return;

    const ctx = gsap.context(() => {
      const cardEls = cardsRef.current.filter(Boolean) as HTMLDivElement[];

      // Initial state
      gsap.set(cardEls, { opacity: 0.25, scale: 0.95, y: 30 });
      if (cardEls[0]) {
        gsap.set(cardEls[0], { opacity: 1, scale: 1, y: 0 });
      }

      // Master ScrollTrigger timeline pinned for 2500px of scroll
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top top',
          end: '+=2400',
          pin: true,
          scrub: 0.8,
          anticipatePin: 1,
        }
      });

      // Progress bar fill across the timeline
      if (progressBarRef.current) {
        tl.to(progressBarRef.current, { scaleY: 1, ease: 'none' }, 0);
      }

      // Move packet along the line
      if (packetRef.current) {
        tl.to(packetRef.current, { top: '100%', ease: 'none' }, 0);
      }

      // Sequenced transitions between the 4 pipeline stages
      cardEls.forEach((card, index) => {
        if (index === 0) return;
        const prevCard = cardEls[index - 1];

        const stepTime = index * 0.33;

        // Dim previous card
        tl.to(
          prevCard,
          {
            opacity: 0.3,
            scale: 0.94,
            filter: 'grayscale(0.6)',
            duration: 0.2,
            ease: 'power2.inOut'
          },
          stepTime - 0.05
        );

        // Highlight active card
        tl.to(
          card,
          {
            opacity: 1,
            scale: 1,
            y: 0,
            filter: 'none',
            duration: 0.25,
            ease: 'power2.out'
          },
          stepTime
        );
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={containerRef}
      id="pipeline"
      className="relative w-full min-h-screen bg-[#060708] border-y border-white/5 flex flex-col justify-center overflow-hidden py-16"
    >
      {/* Background Matrix Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-cyber-cyan/5 blur-[160px] pointer-events-none rounded-full" />
      <div className="absolute top-1/4 right-10 w-[400px] h-[400px] bg-purple-500/5 blur-[140px] pointer-events-none rounded-full" />

      <div ref={pinWrapRef} className="container mx-auto px-6 max-w-7xl relative z-10">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 pb-6 border-b border-white/10 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan text-xs font-mono mb-3">
              <Cpu className="w-3.5 h-3.5 animate-spin-slow" />
              GSAP SCROLLTRIGGER ENGINE
            </div>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white flex items-center gap-3">
              Live Stream Derivation Pipeline
            </h2>
            <p className="text-slate-400 text-sm md:text-base mt-2 max-w-2xl font-mono">
              Scrub or scroll down to trace how a 1080p anime stream is negotiated, verified, and dispatched to your GPU in under 500ms.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Zero HTML Scraping
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyber-cyan animate-pulse" />
              Direct Mobile HLS
            </span>
          </div>
        </div>

        {/* Pipeline Layout Grid */}
        <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Timeline Track with Optical Packet */}
          <div className="hidden lg:flex lg:col-span-1 justify-center relative self-stretch py-4">
            {/* Guide line */}
            <div className="w-0.5 h-full bg-white/10 relative">
              {/* Animated Progress Bar */}
              <div
                ref={progressBarRef}
                className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-cyber-cyan via-emerald-400 to-purple-400 origin-top transform scale-y-0"
              />
              {/* High-speed packet glow */}
              <div
                ref={packetRef}
                className="absolute left-1/2 -translate-x-1/2 -top-2 w-4 h-4 rounded-full bg-cyber-cyan shadow-[0_0_16px_#5f8bff] flex items-center justify-center pointer-events-none"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              </div>
            </div>
          </div>

          {/* 4 Pipeline Stages (Cards) */}
          <div className="lg:col-span-11 grid grid-cols-1 md:grid-cols-2 gap-6">
            {steps.map((step, idx) => (
              <div
                key={step.title}
                ref={(el) => (cardsRef.current[idx] = el)}
                className="cursor-target group relative p-6 rounded-2xl bg-[#0b0d10] border border-white/10 hover:border-white/25 transition-all duration-300 shadow-xl overflow-hidden flex flex-col justify-between"
                style={{
                  boxShadow: `0 0 30px -10px ${step.glowColor}`,
                }}
              >
                {/* Top subtle glow bar */}
                <div
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{ backgroundColor: step.color }}
                />

                <div>
                  {/* Badge & Latency */}
                  <div className="flex items-center justify-between mb-4">
                    <span
                      className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold tracking-wider uppercase border"
                      style={{
                        color: step.color,
                        borderColor: `${step.color}40`,
                        backgroundColor: `${step.color}15`,
                      }}
                    >
                      {step.badge}
                    </span>
                    <span className="font-mono text-xs text-slate-300 bg-white/5 px-2.5 py-1 rounded-md border border-white/10 flex items-center gap-1.5">
                      <Zap className="w-3 h-3 text-amber-400" />
                      {step.latency}
                    </span>
                  </div>

                  {/* Title & Icon */}
                  <div className="flex items-start gap-3.5 mb-2">
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                      {step.icon}
                    </div>
                    <div>
                      <h3 className="text-lg md:text-xl font-bold text-white group-hover:text-cyber-cyan transition-colors">
                        {step.title}
                      </h3>
                      <p className="text-xs text-slate-400 font-mono mt-1">
                        {step.subtitle}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Live Protocol Snippet */}
                <div className="mt-5 p-3.5 rounded-xl bg-[#050607] border border-white/5 font-mono text-[11px] text-slate-300 leading-relaxed overflow-x-auto relative">
                  <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-white/5 text-[10px] text-slate-500 uppercase">
                    <span className="flex items-center gap-1">
                      <Terminal className="w-3 h-3 text-cyber-cyan" />
                      Payload Inspector
                    </span>
                    <span className="text-emerald-400">ACTIVE</span>
                  </div>
                  <pre className="text-slate-300 whitespace-pre-wrap font-mono">
                    {step.snippet}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
