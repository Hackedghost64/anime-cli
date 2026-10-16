import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ShieldCheck, Zap, FastForward, PlayCircle, Terminal, Cpu } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

interface PipelineStep {
  stage: string;
  title: string;
  subtitle: string;
  latency: string;
  icon: React.ReactNode;
  snippet: string;
}

const steps: PipelineStep[] = [
  {
    stage: 'STAGE 01 // HANDSHAKE',
    title: 'Mobile TLS Fingerprint Spoofing',
    subtitle: 'Direct Client Impersonation (Zero Scrapers / Zero 403s)',
    latency: '3.8 ms',
    icon: <ShieldCheck className="w-5 h-5 text-[#ff640a]" />,
    snippet: `GET /api/search?query=naruto HTTP/2
Host: anilab2.amdapi.click
User-Agent: okhttp/4.12.0
os-version: 35 | app-id: com.xo.anilab
[STATUS: 200 OK] -> TLS JA3 Fingerprint Verified`
  },
  {
    stage: 'STAGE 02 // RESOLUTION',
    title: 'Kyoto 1080p HLS Derivation',
    subtitle: 'Direct Private Master Playlist HLS Handoff',
    latency: '480 ms',
    icon: <Zap className="w-5 h-5 text-[#ff640a]" />,
    snippet: `POST /api/v4/post?id=1000003686 HTTP/2
Host: app.kyotoplayer.com
Referer: https://play.app/ | X-Requested-With: PLAY
[STREAM READY] -> master.m3u8 (1080p 6000kbps 60fps)`
  },
  {
    stage: 'STAGE 03 // INTELLIGENCE',
    title: 'AniSkip Timing Alignment',
    subtitle: 'AniList GraphQL Mapping + Auto Chapter Injection',
    latency: '42 ms',
    icon: <FastForward className="w-5 h-5 text-[#ff640a]" />,
    snippet: `GET /v2/skip-times/1000003686/1?types=op&types=ed
Host: api.aniskip.com
[OP FOUND]: 01:28.400 -> 02:58.200 (Action: Auto-Skip)
[ED FOUND]: 21:40.000 -> 23:10.000 (Action: Auto-Skip)`
  },
  {
    stage: 'STAGE 04 // DISPATCH',
    title: 'Zero-Copy Player Execution',
    subtitle: 'MPV GPU Pipeline / Jetpack Compose Native View',
    latency: '< 1 ms',
    icon: <PlayCircle className="w-5 h-5 text-[#ff640a]" />,
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
      gsap.set(cardEls, { opacity: 0.2, scale: 0.96, y: 20 });
      if (cardEls[0]) {
        gsap.set(cardEls[0], { opacity: 1, scale: 1, y: 0 });
      }

      // Master ScrollTrigger timeline pinned for 2200px of scroll
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top top',
          end: '+=2000',
          pin: true,
          scrub: 0.6,
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
            opacity: 0.25,
            scale: 0.96,
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
      className="relative w-full min-h-screen bg-black border-y border-white/10 flex flex-col justify-center overflow-hidden py-20 text-white font-mono"
    >
      <div ref={pinWrapRef} className="container mx-auto px-6 max-w-6xl relative z-10">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 pb-6 border-b border-white/10 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-zinc-950 text-xs text-zinc-400 uppercase tracking-widest mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ff640a]" />
              <span>Chapter 02 // The Pipeline</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-black font-sans tracking-tight text-white">
              Live Stream Derivation.
            </h2>
            <p className="text-zinc-400 text-sm md:text-base mt-2 max-w-2xl font-light font-sans">
              Scroll to step through how a 1080p anime stream is negotiated, verified, and dispatched to your GPU in under 500ms.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono text-zinc-400">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ff640a]" />
              Zero HTML Scraping
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
              Direct Mobile HLS
            </span>
          </div>
        </div>

        {/* Pipeline Layout Grid */}
        <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Vertical Timeline Guide Track */}
          <div className="hidden lg:flex lg:col-span-1 justify-center relative self-stretch py-4">
            <div className="w-[1px] h-full bg-white/10 relative">
              <div
                ref={progressBarRef}
                className="absolute top-0 left-0 w-full h-full bg-[#ff640a] origin-top transform scale-y-0"
              />
              <div
                ref={packetRef}
                className="absolute left-1/2 -translate-x-1/2 -top-1 w-2.5 h-2.5 rounded-full bg-[#ff640a] flex items-center justify-center pointer-events-none shadow-[0_0_8px_#ff640a]"
              />
            </div>
          </div>

          {/* 4 Pipeline Stages (Cards) */}
          <div className="lg:col-span-11 grid grid-cols-1 md:grid-cols-2 gap-6">
            {steps.map((step, idx) => (
              <div
                key={step.title}
                ref={(el) => (cardsRef.current[idx] = el)}
                className="group relative p-6 rounded-2xl bg-zinc-950 border border-white/10 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  {/* Badge & Latency */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase border border-[#ff640a]/40 bg-[#ff640a]/10 text-[#ff640a]">
                      {step.stage}
                    </span>
                    <span className="font-mono text-xs text-zinc-400 bg-black px-2.5 py-1 rounded-md border border-white/10 flex items-center gap-1.5">
                      <Zap className="w-3 h-3 text-[#ff640a]" />
                      {step.latency}
                    </span>
                  </div>

                  {/* Title & Icon */}
                  <div className="flex items-start gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-black border border-white/10 shrink-0">
                      {step.icon}
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-white font-sans">
                        {step.title}
                      </h3>
                      <p className="text-xs text-zinc-500 font-mono mt-0.5">
                        {step.subtitle}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Live Protocol Snippet */}
                <div className="mt-5 p-3.5 rounded-xl bg-black border border-white/5 font-mono text-[11px] text-zinc-300 leading-relaxed overflow-x-auto">
                  <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-white/5 text-[10px] text-zinc-500 uppercase">
                    <span className="flex items-center gap-1 text-zinc-400">
                      <Terminal className="w-3 h-3 text-[#ff640a]" />
                      Payload Inspector
                    </span>
                    <span className="text-[#ff640a]">ACTIVE</span>
                  </div>
                  <pre className="text-zinc-300 whitespace-pre-wrap font-mono">
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
