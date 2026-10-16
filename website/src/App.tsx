import React, { useState } from 'react';
import { BootloaderModal } from './components/BootloaderModal';
import { GlowCursor } from './components/GlowCursor';
import { TargetCursor } from './components/TargetCursor';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { StorySection } from './components/StorySection';
import { TrinitySection } from './components/TrinitySection';
import { BenchmarksSection } from './components/BenchmarksSection';
import { TerminalSimulator } from './components/TerminalSimulator';
import { DownloadsSection } from './components/DownloadsSection';
import { DocsSection } from './components/DocsSection';
import { Footer } from './components/Footer';

export const App: React.FC = () => {
  const [showBootloader, setShowBootloader] = useState(true);

  return (
    <div className="min-h-screen bg-[#08090a] text-slate-200 relative selection:bg-cyber-cyan/30 selection:text-white">
      {/* High-Tech Terminal Bootloader / BIOS Splash Screen */}
      {showBootloader && (
        <BootloaderModal onComplete={() => setShowBootloader(false)} />
      )}

      {/* Custom Coder Cyber Cursors */}
      <GlowCursor
        color="#5f8bff"
        size={24}
        trailLength={18}
        intensity={1.0}
        linger={0.92}
        clickBurst={true}
      />
      <TargetCursor
        spinDuration={8}
        color="#5f8bff"
        lockedColor="#2bb673"
      />

      {/* Cyberpunk Grid Background Overlay */}
      <div className="fixed inset-0 bg-cyber-grid pointer-events-none opacity-40 z-0" />
      <div className="fixed inset-0 bg-cyber-dots pointer-events-none opacity-20 z-0" />

      {/* Main Content Layout */}
      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar onReplayBootloader={() => setShowBootloader(true)} />
        
        <main className="flex-1">
          <Hero />
          <StorySection />
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
