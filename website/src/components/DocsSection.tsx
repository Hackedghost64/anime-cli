import React, { useState } from 'react';
import { BookOpen, Keyboard, Layers, FileJson, Search, ExternalLink, Terminal, ChevronRight } from 'lucide-react';
import { TechText } from './TechText';
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
    <section id="docs" className="py-20 border-t border-slate-800/80 bg-[#090b0f] relative font-mono">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="max-w-3xl mb-12 space-y-3">
          <TechText tag="DOCUMENTATION_MATRIX" glowColor="cyan" className="text-2xl sm:text-4xl font-bold font-sans">
            Documentation & Shortcuts: <br />
            <span className="text-white">Player Controls, Configuration & System Manual.</span>
          </TechText>
          <p className="text-slate-400 text-sm leading-relaxed">
            Quick reference for keyboard shortcuts in both native MPV hardware mode and the Obsidian Web PWA player, along with the branched ecosystem navigation tree.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: BranchedMenu Tree Navigation */}
          <div className="lg:col-span-5 rounded-2xl border border-slate-800 bg-[#0c1017] p-6 shadow-cyber-card">
            <h4 className="text-xs font-bold text-cyber-cyan uppercase tracking-wider mb-4 flex items-center gap-2">
              <Layers className="h-4 w-4" />
              SYSTEM MAP & TOPIC TREE
            </h4>
            <BranchedMenu />
          </div>

          {/* Right Column: Interactive Keyboard Shortcuts Table */}
          <div id="shortcuts" className="lg:col-span-7 rounded-2xl border border-slate-800 bg-[#0c1017] p-6 shadow-cyber-card space-y-6">
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Keyboard className="h-4 w-4 text-cyber-green" />
                  PLAYER KEYBOARD SHORTCUTS
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Control MPV and Web PWA without touching a mouse</p>
              </div>

              {/* Scope filter pills */}
              <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-[#08090a] p-1 text-[11px]">
                {(['all', 'mpv', 'web'] as const).map((scope) => (
                  <button
                    key={scope}
                    type="button"
                    onClick={() => setFilterScope(scope)}
                    className={`rounded px-2.5 py-0.5 uppercase transition-all ${
                      filterScope === scope
                        ? 'bg-slate-800 text-white font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {scope === 'all' ? 'All' : scope.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Input Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter shortcuts by key or action (e.g. seek, volume, dub)..."
                className="w-full rounded-lg border border-slate-800 bg-[#07090c] pl-9 pr-4 py-2 text-xs text-white placeholder-slate-600 focus:border-cyber-cyan focus:outline-none transition-colors"
              />
            </div>

            {/* Shortcuts List */}
            <div className="max-h-[360px] overflow-y-auto space-y-1.5 pr-1">
              {filteredShortcuts.map((sc, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border border-slate-800/80 bg-[#08090a] px-3.5 py-2 text-xs hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="rounded bg-slate-800 px-2 py-0.5 text-cyber-cyan font-bold border border-slate-700/80 text-[11px]">
                      {sc.key}
                    </span>
                    <span className="text-slate-300">{sc.action}</span>
                  </div>
                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                    sc.scope === 'mpv'
                      ? 'bg-cyber-cyan/10 text-cyber-cyan border border-cyber-cyan/30'
                      : 'bg-cyber-purple/10 text-cyber-purple border border-cyber-purple/30'
                  }`}>
                    {sc.scope}
                  </span>
                </div>
              ))}
            </div>

            {/* Bottom Tip */}
            <div className="rounded-lg bg-slate-900/60 p-3 text-[11px] text-slate-400 border border-slate-800 flex items-start gap-2">
              <span className="text-cyber-cyan font-bold">PRO-TIP:</span>
              <span>
                Pressing <kbd className="text-white font-bold bg-slate-800 px-1 rounded">q</kbd> in MPV automatically commits playback timestamps to <code>~/.local/share/anime-cli/history.json</code>, allowing instant resume via <code>anime-lite -c</code>.
              </span>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
