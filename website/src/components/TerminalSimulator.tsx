import React, { useState } from 'react';
import { Terminal, Play, Copy, Check, RotateCcw, Sparkles, Film, Clock, Heart } from 'lucide-react';
import { TechText } from './TechText';
import { DecryptedText } from './DecryptedText';

interface SimScenario {
  id: string;
  name: string;
  command: string;
  badge: string;
  description: string;
  output: string[];
}

const SCENARIOS: SimScenario[] = [
  {
    id: 'lite-fzf',
    name: 'anime-lite "naruto" -s',
    command: 'anime-lite "naruto" -s',
    badge: 'C99 / fzf',
    description: 'Ultra-fast fuzzy search with Japanese Subtitles',
    output: [
      '\x1b[38;2;95;139;255m[anime-lite v1.2.0]\x1b[0m Booting standalone C99 kernel in 3.8ms...',
      '\x1b[38;2;43;182;115m[OK]\x1b[0m Resolved Kyoto mobile endpoint via config.json (0.012s)',
      '\x1b[33m> Query: "naruto"\x1b[0m - 4 matching series found via fzf:',
      '  \x1b[32m1.\x1b[0m Naruto (220 Episodes) [SUB/DUB]',
      '  \x1b[32m2.\x1b[0m Naruto: Shippuuden (500 Episodes) [SUB/DUB]',
      '  \x1b[32m3.\x1b[0m Boruto: Naruto Next Generations (293 Episodes) [SUB/DUB]',
      '  \x1b[32m4.\x1b[0m The Last: Naruto the Movie (Movie) [SUB/DUB]',
      '',
      '\x1b[36mSelection:\x1b[0m Naruto: Shippuuden -> Episode 167 (Planetary Devastation)',
      '\x1b[38;2;95;139;255m[Kyoto CDN]\x1b[0m Stream resolved in 480ms: 1080p Master HLS (.m3u8)',
      '\x1b[38;2;242;91;208m[AniSkip]\x1b[0m Intro detected: 01:28 -> 02:58 [Auto-Skip MPV Lua Enabled]',
      '\x1b[32m▶ Launching MPV:\x1b[0m mpv --vo=gpu --hwdec=auto "https://kyotocdn.net/hls/master.m3u8"',
    ],
  },
  {
    id: 'roulette',
    name: 'anime-cli -B',
    command: 'anime-cli -B',
    badge: 'Roulette',
    description: '3-question mood vibe match filtered by watch history',
    output: [
      '\x1b[38;2;242;91;208m[Binge Roulette]\x1b[0m Initializing AniList GraphQL Recommendation Engine...',
      'Filter: Watch history from ~/.local/share/anime-cli/history.json excluded.',
      '',
      '\x1b[33m? Question 1/3: What vibe are you craving tonight?\x1b[0m',
      '  ○ Pure Junk Food (Isekai Power Fantasy)',
      '  ● \x1b[32mHype & Sakuga (Jaw-Dropping Fights & High Frame Rates)\x1b[0m',
      '  ○ 200 IQ Mind Games (Psychological Thriller)',
      '  ○ Cozy Rain & Coffee (Slice-of-Life / Healing)',
      '',
      '\x1b[33m? Question 2/3: Preferred pacing?\x1b[0m -> \x1b[32mBreakneck adrenaline from Ep 1\x1b[0m',
      '\x1b[33m? Question 3/3: Length?\x1b[0m -> \x1b[32mBingeable (12-24 episodes)\x1b[0m',
      '',
      '\x1b[38;2;43;182;115m🎯 MATCH FOUND:\x1b[0m \x1b[1m"CYBERPUNK: EDGERUNNERS"\x1b[0m (Score: 98.4%)',
      'Studio Trigger • 10 Episodes • 1080p Kyoto HLS Ready',
      '\x1b[36mPress [ENTER] to stream Episode 1 or [R] to re-roll...\x1b[0m',
    ],
  },
  {
    id: 'airing-radar',
    name: 'anime-cli --today',
    command: 'anime-cli --today',
    badge: 'Airing',
    description: 'Live 24-hour broadcast release countdown radar',
    output: [
      '\x1b[38;2;95;139;255m[Airing Radar]\x1b[0m Fetching real-time Tokyo broadcast schedules (AniList API)...',
      'Current Time: Thursday, Oct 16, 2026 14:15:00 UTC+05:30',
      '',
      '\x1b[32m🟢 AIRED 2h 15m ago:\x1b[0m Dandadan - Episode 3 (1080p Kyoto Available)',
      '\x1b[32m🟢 AIRED 45m ago:\x1b[0m    Re:Zero Season 3 - Episode 4 (1080p Kyoto Available)',
      '\x1b[33m🟡 AIRING IN 35m:\x1b[0m     Bleach: Thousand-Year Blood War - Ep 30',
      '\x1b[33m🟡 AIRING IN 2h 10m:\x1b[0m  Blue Lock vs. U-20 Japan - Ep 3',
      '\x1b[37m⚪ AIRING IN 7h 40m:\x1b[0m  Dragon Ball DAIMA - Episode 2',
      '',
      '\x1b[38;2;95;139;255mInteractive:\x1b[0m Select any aired show to launch 1-click 1080p streaming.',
    ],
  },
  {
    id: 'resume',
    name: 'anime-lite -c',
    command: 'anime-lite -c',
    badge: 'Instant Resume',
    description: 'Instant watch progress recovery in under 5 milliseconds',
    output: [
      '\x1b[38;2;95;139;255m[anime-lite]\x1b[0m Reading ~/.local/share/anime-cli/history.json...',
      '\x1b[32m✔ Last Watched Series:\x1b[0m Jujutsu Kaisen 2nd Season',
      '  Episode: 17 (Thunderclap, Part 2)',
      '  Timestamp: 16m 42s / 23m 50s',
      '  Audio: Japanese Subtitles (Kyoto CDN)',
      '',
      '\x1b[38;2;43;182;115m[MPV Session]\x1b[0m Restoring video cache & chapter bounds...',
      'Resumed in 482ms total elapsed time. Playback active.',
    ],
  },
];

export const TerminalSimulator: React.FC = () => {
  const [activeScenario, setActiveScenario] = useState<SimScenario>(SCENARIOS[0]);
  const [copied, setCopied] = useState(false);

  const handleCopyCommand = () => {
    navigator.clipboard.writeText(activeScenario.command);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  // Convert ANSI escape codes to colored spans
  const formatAnsi = (text: string) => {
    // Quick regex replacement for colors
    const parts = text.split(/(\x1b\[[0-9;]*m)/);
    let currentColor = 'text-slate-300';
    let isBold = false;

    return parts.map((part, index) => {
      if (part.startsWith('\x1b[')) {
        if (part === '\x1b[0m') {
          currentColor = 'text-slate-300';
          isBold = false;
        } else if (part.includes('38;2;95;139;255')) {
          currentColor = 'text-[#5f8bff]';
        } else if (part.includes('38;2;43;182;115') || part === '\x1b[32m') {
          currentColor = 'text-[#2bb673]';
        } else if (part.includes('38;2;242;91;208')) {
          currentColor = 'text-[#F25BD0]';
        } else if (part === '\x1b[33m') {
          currentColor = 'text-[#ff6b00]';
        } else if (part === '\x1b[36m') {
          currentColor = 'text-[#38bdf8]';
        } else if (part === '\x1b[1m') {
          isBold = true;
        }
        return null;
      }
      return (
        <span key={index} className={`${currentColor} ${isBold ? 'font-bold' : ''}`}>
          {part}
        </span>
      );
    });
  };

  return (
    <section id="terminal" className="py-20 border-t border-slate-800/80 bg-[#07090c] relative font-mono">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="max-w-3xl mb-10 space-y-3">
          <TechText tag="TERMINAL_SANDBOX" glowColor="cyan" className="text-2xl sm:text-4xl font-bold font-sans">
            Interactive Terminal Simulator: <br />
            <span className="text-white">Try Real CLI Commands Right in Your Browser.</span>
          </TechText>
          <p className="text-slate-400 text-sm leading-relaxed">
            Click on any command scenario below to inspect actual output logs, ANSI color highlighting, fuzzy picker simulation, and AniSkip auto-skip triggers.
          </p>
        </div>

        {/* Command Scenarios Selector Pills */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {SCENARIOS.map((scenario) => {
            const isSelected = activeScenario.id === scenario.id;
            return (
              <button
                key={scenario.id}
                type="button"
                onClick={() => setActiveScenario(scenario)}
                className={`p-3 rounded-xl border text-left transition-all cursor-target ${
                  isSelected
                    ? 'border-cyber-cyan bg-[#0e141f] shadow-glow-cyan'
                    : 'border-slate-800 bg-[#0a0d13] hover:border-slate-700 text-slate-400 hover:text-white'
                }`}
                data-target-label={scenario.id.toUpperCase()}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    isSelected ? 'bg-cyber-cyan/20 text-cyber-cyan' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {scenario.badge}
                  </span>
                  <Terminal className={`h-3.5 w-3.5 ${isSelected ? 'text-cyber-cyan' : 'text-slate-600'}`} />
                </div>
                <div className="text-xs font-semibold text-white truncate mb-1">
                  {scenario.command}
                </div>
                <div className="text-[10px] text-slate-400 line-clamp-1">
                  {scenario.description}
                </div>
              </button>
            );
          })}
        </div>

        {/* Terminal Window */}
        <div className="rounded-xl border border-slate-800 bg-[#06080b] shadow-2xl overflow-hidden">
          
          {/* Terminal Title Bar */}
          <div className="flex items-center justify-between border-b border-slate-800/80 bg-[#0c1017] px-4 py-2.5">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-red-500/80 inline-block" />
                <span className="h-3 w-3 rounded-full bg-yellow-500/80 inline-block" />
                <span className="h-3 w-3 rounded-full bg-green-500/80 inline-block" />
              </div>
              <span className="ml-2 text-xs text-slate-400 font-semibold">
                user@shinsei-box: ~
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 hidden sm:inline">
                STATUS: READY
              </span>
              <button
                type="button"
                onClick={handleCopyCommand}
                className="flex items-center gap-1 rounded bg-slate-800/80 border border-slate-700 px-2 py-1 text-[11px] text-slate-300 hover:text-white transition-colors"
              >
                {copied ? <Check className="h-3 w-3 text-cyber-green" /> : <Copy className="h-3 w-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Terminal Screen Body */}
          <div className="p-5 font-mono text-xs leading-relaxed space-y-1 overflow-x-auto min-h-[300px]">
            {/* Command Prompt Line */}
            <div className="flex items-center gap-2 text-cyber-cyan pb-2 border-b border-slate-900">
              <span className="text-cyber-green">➜</span>
              <span className="text-slate-400">~</span>
              <span className="text-white font-bold">{activeScenario.command}</span>
            </div>

            {/* Output Lines */}
            <div className="pt-2 space-y-1">
              {activeScenario.output.map((line, i) => (
                <div key={i} className="min-h-[1.2rem]">
                  {formatAnsi(line)}
                </div>
              ))}
            </div>

            {/* Blinking cursor */}
            <div className="flex items-center gap-1 pt-3 text-cyber-cyan">
              <span className="text-cyber-green">➜</span>
              <span className="text-slate-400">~</span>
              <span className="inline-block w-2 h-4 bg-cyber-cyan animate-pulse ml-1" />
            </div>
          </div>

          {/* Terminal Footer status info */}
          <div className="border-t border-slate-800/60 bg-[#090c11] px-4 py-2 flex flex-wrap items-center justify-between text-[11px] text-slate-500">
            <span>STREAM: Kyoto Player Master HLS • MPV Hardware Acceleration</span>
            <span className="text-cyber-green">API: Anilab JSON Mobile Gateway (100% Turnstile Free)</span>
          </div>

        </div>

      </div>
    </section>
  );
};
