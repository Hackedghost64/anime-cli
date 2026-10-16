import React, { useEffect } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { StorySection } from './components/StorySection';
import { GsapStreamPipeline } from './components/GsapStreamPipeline';
import { TrinitySection } from './components/TrinitySection';
import { BenchmarksSection } from './components/BenchmarksSection';
import { TerminalSimulator } from './components/TerminalSimulator';
import { DownloadsSection } from './components/DownloadsSection';
import { DocsSection } from './components/DocsSection';
import { Footer } from './components/Footer';

gsap.registerPlugin(ScrollTrigger);

export const App: React.FC = () => {
  // Initialize Lenis smooth momentum scrolling synchronized with GSAP Ticker
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    lenis.on('scroll', ScrollTrigger.update);

    const tickerCallback = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(tickerCallback);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tickerCallback);
      lenis.destroy();
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, []);

  return (
    <div className="min-h-screen bg-black text-zinc-100 selection:bg-[#ff640a]/30 selection:text-white antialiased">
      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar />
        
        <main className="flex-1">
          <Hero />
          <StorySection />
          <GsapStreamPipeline />
          <TrinitySection />
          <BenchmarksSection />
          <TerminalSimulator />
          <DownloadsSection />
          <DocsSection />
        </main>

        <Footer />
      </div>
    </div>
  );
};

export default App;

