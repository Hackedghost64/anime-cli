import React, { useState } from 'react';
import { Terminal, Copy, Check } from 'lucide-react';

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
      '\x1b[38;2;255;100;10m[anime-lite v1.2.0]\x1b[0m Booting standalone C99 kernel in 3.8ms...',
      '\x1b[37m[OK]\x1b[0m Resolved Kyoto mobile endpoint via config.json (0.012s)',
      '\x1b[38;2;255;100;10m> Query: "naruto"\x1b[0m - 4 matching series found via fzf:',
      '  1. Naruto (220 Episodes) [SUB/DUB]',
      '  2. Naruto: Shippuuden (500 Episodes) [SUB/DUB]',
      '  3. Boruto: Naruto Next Generations (293 Episodes) [SUB/DUB]',
      '  4. The Last: Naruto the Movie (Movie) [SUB/DUB]',
      '',
      '\x1b[38;2;255;100;10mSelection:\x1b[0m Naruto: Shippuuden -> Episode 167 (Planetary Devastation)',
      '\x1b[37m[Kyoto CDN]\x1b[0m Stream resolved in 480ms: 1080p Master HLS (.m3u8)',
      '\x1b[38;2;255;100;10m[AniSkip]\x1b[0m Intro detected: 01:28 -> 02:58 [Auto-Skip MPV Lua Enabled]',
      '\x1b[37m▶ Launching MPV:\x1b[0m mpv --vo=gpu --hwdec=auto "https://kyotocdn.net/hls/master.m3u8"',
    ],
  },
  {
    id: 'roulette',
    name: 'anime-cli -B',
    command: 'anime-cli -B',
    badge: 'Roulette',
    description: '3-question mood vibe match filtered by watch history',
    output: [
      '\x1b[38;2;255;100;10m[Binge Roulette]\x1b[0m Initializing AniList GraphQL Recommendation Engine...',
      'Filter: Watch history from ~/.local/share/anime-cli/history.json excluded.',
      '',
      '\x1b[38;2;255;100;10m? Question 1/3: What vibe are you craving tonight?\x1b[0m',
      '  ○ Pure Junk Food (Isekai Power Fantasy)',
      '  ● \x1b[37mHype & Sakuga (Jaw-Dropping Fights & High Frame Rates)\x1b[0m',
      '  ○ 200 IQ Mind Games (Psychological Thriller)',
      '  ○ Cozy Rain & Coffee (Slice-of-Life / Healing)',
      '',
      '\x1b[38;2;255;100;10m? Question 2/3: Preferred pacing?\x1b[0m -> Breakneck adrenaline from Ep 1',
      '\x1b[38;2;255;100;10m? Question 3/3: Length?\x1b[0m -> Bingeable (12-24 episodes)',
      '',
      '\x1b[38;2;255;100;10m🎯 MATCH FOUND:\x1b[0m \x1b[1m"CYBERPUNK: EDGERUNNERS"\x1b[0m (Score: 98.4%)',
      'Studio Trigger • 10 Episodes • 1080p Kyoto HLS Ready',
      'Press [ENTER] to stream Episode 1 or [R] to re-roll...',
    ],
  },
  {
    id: 'airing-radar',
    name: 'anime-cli --today',
    command: 'anime-cli --today',
    badge: 'Airing',
    description: 'Live 24-hour broadcast release countdown radar',
    output: [
      '\x1b[38;2;255;100;10m[Airing Radar]\x1b[0m Fetching real-time Tokyo broadcast schedules (AniList API)...',
      'Current Time: Thursday, Oct 16, 2026 14:15:00 UTC+05:30',
      '',
      '\x1b[37m● AIRED 2h 15m ago:\x1b[0m Dandadan - Episode 3 (1080p Kyoto Available)',
      '\x1b[37m● AIRED 45m ago:\x1b[0m    Re:Zero Season 3 - Episode 4 (1080p Kyoto Available)',
      '\x1b[38;2;255;100;10m○ AIRING IN 35m:\x1b[0m     Bleach: Thousand-Year Blood War - Ep 30',
      '\x1b[38;2;255;100;10m○ AIRING IN 2h 10m:\x1b[0m  Blue Lock vs. U-20 Japan - Ep 3',
      '○ AIRING IN 7h 40m:  Dragon Ball DAIMA - Episode 2',
      '',
      'Interactive: Select any aired show to launch 1-click 1080p streaming.',
    ],
  },
  {
    id: 'resume',
    name: 'anime-lite -c',
    command: 'anime-lite -c',
    badge: 'Instant Resume',
    description: 'Instant watch progress recovery in under 5 milliseconds',
    output: [
      '\x1b[38;2;255;100;10m[anime-lite]\x1b[0m Reading ~/.local/share/anime-cli/history.json...',
      '\x1b[37m✔ Last Watched Series:\x1b[0m Jujutsu Kaisen 2nd Season',
      '  Episode: 17 (Thunderclap, Part 2)',
      '  Timestamp: 16m 42s / 23m 50s',
      '  Audio: Japanese Subtitles (Kyoto CDN)',
      '',
      '\x1b[38;2;255;100;10m[MPV Session]\x1b[0m Restoring video cache & chapter bounds...',
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

  const formatAnsi = (text: string) => {
    const parts = text.split(/(\x1b\[[0-9;]*m)/);
    let currentColor = 'text-zinc-300';
    let isBold = false;

    return parts.map((part, index) => {
      if (part.startsWith('\x1b[')) {
        if (part === '\x1b[0m') {
          currentColor = 'text-zinc-300';
          isBold = false;
        } else if (part.includes('38;2;255;100;10') || part === '\x1b[33m') {
          currentColor = 'text-[#ff640a]';
        } else if (part === '\x1b[37m' || part === '\x1b[32m') {
          currentColor = 'text-white font-semibold';
        } else if (part === '\x1b[1m') {
          isBold = true;
        }
        return null;
      }
      return (
        <span key={index} className={`${currentColor} ${isBold ? 'font-bold text-white' : ''}`}>
          {part}
        </span>
      );
    });
  };

  return (
    <section id="terminal" className="py-24 border-t border-white/10 bg-black text-white font-mono">
      <div className="mx-auto max-w-6xl px-6">
        
        {/* Header */}
        <div className="max-w-3xl mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-zinc-950 text-xs text-zinc-400 uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff640a]" />
            <span>Chapter 05 // Live Command Simulation</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black font-sans tracking-tight text-white leading-tight">
            Try Real Commands in <br />
            <span className="text-[#ff640a]">Your Browser.</span>
          </h2>

          <p className="text-zinc-400 text-sm sm:text-base font-light font-sans leading-relaxed">
            Click on any scenario below to inspect actual output logs, ANSI color highlighting, fuzzy picker simulation, and AniSkip auto-skip triggers.
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
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'border-[#ff640a] bg-zinc-950'
                    : 'border-white/10 bg-black text-zinc-400 hover:border-white/20 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                    isSelected ? 'border-[#ff640a]/40 bg-[#ff640a]/10 text-[#ff640a]' : 'border-white/5 bg-zinc-900 text-zinc-400'
                  }`}>
                    {scenario.badge}
                  </span>
                  <Terminal className={`h-3.5 w-3.5 ${isSelected ? 'text-[#ff640a]' : 'text-zinc-600'}`} />
                </div>
                <div className="text-xs font-semibold text-white truncate mb-1">
                  {scenario.command}
                </div>
                <div className="text-[10px] text-zinc-500 font-sans line-clamp-1">
                  {scenario.description}
                </div>
              </button>
            );
          })}
        </div>

        {/* Terminal Window */}
        <div className="rounded-2xl border border-white/10 bg-zinc-950 overflow-hidden shadow-2xl">
          
          {/* Terminal Title Bar */}
          <div className="flex items-center justify-between border-b border-white/10 bg-black px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-zinc-700 inline-block" />
                <span className="h-2.5 w-2.5 rounded-full bg-zinc-700 inline-block" />
                <span className="h-2.5 w-2.5 rounded-full bg-zinc-700 inline-block" />
              </div>
              <span className="ml-3 text-xs text-zinc-400 font-mono">
                user@shinsei-box: ~
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleCopyCommand}
                className="flex items-center gap-1.5 rounded-lg bg-zinc-900 border border-white/10 px-2.5 py-1 text-[11px] text-zinc-300 hover:text-white hover:border-[#ff640a] transition-all"
              >
                {copied ? <Check className="h-3 w-3 text-[#ff640a]" /> : <Copy className="h-3 w-3" />}
                <span>{copied ? 'Copied' : 'Copy Command'}</span>
              </button>
            </div>
          </div>

          {/* Terminal Screen Body */}
          <div className="p-6 font-mono text-xs leading-relaxed space-y-1 overflow-x-auto min-h-[300px] bg-black">
            {/* Command Prompt Line */}
            <div className="flex items-center gap-2 text-white pb-3 border-b border-white/5">
              <span className="text-[#ff640a]">➜</span>
              <span className="text-zinc-500">~</span>
              <span className="text-white font-bold">{activeScenario.command}</span>
            </div>

            {/* Output Lines */}
            <div className="pt-3 space-y-1.5">
              {activeScenario.output.map((line, i) => (
                <div key={i} className="min-h-[1.2rem]">
                  {formatAnsi(line)}
                </div>
              ))}
            </div>

            {/* Blinking prompt */}
            <div className="flex items-center gap-1 pt-4 text-white">
              <span className="text-[#ff640a]">➜</span>
              <span className="text-zinc-500">~</span>
              <span className="inline-block w-2 h-4 bg-[#ff640a] animate-pulse ml-1" />
            </div>
          </div>

          {/* Terminal Footer status info */}
          <div className="border-t border-white/10 bg-zinc-950 px-5 py-2.5 flex flex-wrap items-center justify-between text-[11px] text-zinc-500">
            <span>STREAM: Kyoto Player Master HLS • MPV Hardware Pipeline</span>
            <span className="text-zinc-400">GATEWAY: Anilab Mobile JSON (Cloudflare Immune)</span>
          </div>

        </div>

      </div>
    </section>
  );
};
