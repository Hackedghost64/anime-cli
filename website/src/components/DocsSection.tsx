import React, { useState } from 'react';
import { Keyboard, Layers, Search } from 'lucide-react';
import { BranchedMenu } from './BranchedMenu';

interface Shortcut {
  key: string;
  action: string;
  scope: 'mpv' | 'web';
}

const SHORTCUTS: Shortcut[] = [
  { key: 'Space / p', action: 'Play / Pause playback', scope: 'mpv' },
  { key: '→ / ←', action: 'Seek forward / backward 5 seconds', scope: 'mpv' },
  { key: 'Shift+→ / Shift+←', action: 'Seek forward / backward 60 seconds', scope: 'mpv' },
  { key: '9 / 0', action: 'Volume down / Volume up', scope: 'mpv' },
  { key: 'm', action: 'Toggle audio mute', scope: 'mpv' },
  { key: 'f', action: 'Toggle fullscreen mode', scope: 'mpv' },
  { key: 'j', action: 'Cycle audio tracks (Japanese Sub / English Dub)', scope: 'mpv' },
  { key: 'v', action: 'Toggle subtitle visibility', scope: 'mpv' },
  { key: 'q', action: 'Quit and save resume position to history.json', scope: 'mpv' },
  { key: '> / <', action: 'Jump to Next / Previous episode', scope: 'mpv' },
  { key: 'Space / K', action: 'Play / Pause playback', scope: 'web' },
  { key: '→ / L', action: 'Seek forward 10 seconds', scope: 'web' },
  { key: '← / J', action: 'Seek backward 10 seconds', scope: 'web' },
  { key: '↑ / ↓', action: 'Volume adjustment ±10%', scope: 'web' },
  { key: 'F', action: 'Toggle Fullscreen', scope: 'web' },
  { key: 'T', action: 'Toggle Theater Mode', scope: 'web' },
  { key: 'P', action: 'Picture-in-Picture (PiP)', scope: 'web' },
  { key: 'Double-Tap (Mobile)', action: 'Seek ±10s with animated gesture ripple', scope: 'web' },
];

export const DocsSection: React.FC = () => {
  const [filterScope, setFilterScope] = useState<'all' | 'mpv' | 'web'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredShortcuts = SHORTCUTS.filter((s) => {
    const matchesScope = filterScope === 'all' || s.scope === filterScope;
    const matchesSearch = s.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.action.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesScope && matchesSearch;
  });

  return (
    <section id="docs" className="py-24 border-t border-white/10 bg-black text-white font-mono">
      <div className="mx-auto max-w-6xl px-6">
        
        {/* Header */}
        <div className="max-w-3xl mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-zinc-950 text-xs text-zinc-400 uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff640a]" />
            <span>Chapter 07 // System Reference & Shortcuts</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black font-sans tracking-tight text-white leading-tight">
            Controls & System Manual.
          </h2>

          <p className="text-zinc-400 text-sm sm:text-base font-light font-sans leading-relaxed">
            Quick reference for keyboard shortcuts in both native MPV hardware mode and the Obsidian Web player, along with the branched ecosystem navigation tree.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: BranchedMenu Tree Navigation */}
          <div className="lg:col-span-5 rounded-2xl border border-white/10 bg-zinc-950 p-6">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Layers className="h-4 w-4 text-[#ff640a]" />
              System Map & Topic Tree
            </h4>
            <BranchedMenu />
          </div>

          {/* Right Column: Interactive Keyboard Shortcuts Table */}
          <div id="shortcuts" className="lg:col-span-7 rounded-2xl border border-white/10 bg-zinc-950 p-6 space-y-6">
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2 font-sans">
                  <Keyboard className="h-4 w-4 text-[#ff640a]" />
                  Player Keyboard Shortcuts
                </h4>
                <p className="text-[11px] text-zinc-500 font-sans mt-0.5">Control MPV and Web PWA without touching a mouse</p>
              </div>

              {/* Scope filter pills */}
              <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-black p-1 text-[11px]">
                {(['all', 'mpv', 'web'] as const).map((scope) => (
                  <button
                    key={scope}
                    type="button"
                    onClick={() => setFilterScope(scope)}
                    className={`rounded px-2.5 py-0.5 uppercase transition-all ${
                      filterScope === scope
                        ? 'bg-[#ff640a] text-black font-bold'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {scope === 'all' ? 'All' : scope.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Input Bar */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter shortcuts by key or action (e.g. seek, volume, dub)..."
                className="w-full rounded-xl border border-white/10 bg-black pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-600 focus:border-[#ff640a] focus:outline-none transition-colors"
              />
            </div>

            {/* Shortcuts List */}
            <div className="max-h-[360px] overflow-y-auto space-y-1.5 pr-1">
              {filteredShortcuts.map((sc, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-black px-4 py-2.5 text-xs hover:border-white/15 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="rounded-lg bg-zinc-900 px-2 py-0.5 text-white font-bold border border-white/10 text-[11px]">
                      {sc.key}
                    </span>
                    <span className="text-zinc-300 font-sans text-xs">{sc.action}</span>
                  </div>
                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase border ${
                    sc.scope === 'mpv'
                      ? 'border-[#ff640a]/30 bg-[#ff640a]/10 text-[#ff640a]'
                      : 'border-white/10 bg-zinc-900 text-zinc-400'
                  }`}>
                    {sc.scope}
                  </span>
                </div>
              ))}
            </div>

            {/* Bottom Tip */}
            <div className="rounded-xl bg-black p-3.5 text-[11px] text-zinc-400 border border-white/5 flex items-start gap-2.5">
              <span className="text-[#ff640a] font-bold">NOTE:</span>
              <span className="font-sans leading-relaxed">
                Pressing <kbd className="text-white font-bold font-mono bg-zinc-800 px-1 rounded">q</kbd> in MPV automatically saves playback timestamps to <code>~/.local/share/anime-cli/history.json</code>, enabling instant resume via <code>anime-lite -c</code>.
              </span>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
