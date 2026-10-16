import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, ShieldCheck, Zap, Cpu, CheckCircle2 } from 'lucide-react';
import { DecryptedText } from './DecryptedText';

interface BootloaderModalProps {
  onComplete: () => void;
}

interface BootLog {
  time: string;
  module: string;
  status: string;
  color: string;
}

const BOOT_LOGS: BootLog[] = [
  { time: '0.002s', module: 'CORE::INIT', status: 'C99 standalone kernel bootstrap initialized', color: 'text-slate-300' },
  { time: '0.018s', module: 'LIBCURL::TLS', status: 'JA3 mobile fingerprint spoofing active (okhttp/4.12.0)', color: 'text-cyber-cyan' },
  { time: '0.042s', module: 'MEM::CHECK', status: 'Allocating 4MB ultra-lean RSS ring buffer ... [OK]', color: 'text-cyber-green' },
  { time: '0.085s', module: 'CONFIG::SSOT', status: 'Single source of truth config.json (v1.2.0) verified', color: 'text-slate-300' },
  { time: '0.134s', module: 'ANTIDETECTION', status: 'Cloudflare Turnstile & Captcha bypass: 100% IMMUNE', color: 'text-cyber-green' },
  { time: '0.198s', module: 'KYOTO::STREAM', status: 'Direct mobile 1080p HLS gateway handshake ... 200 OK', color: 'text-cyber-cyan' },
  { time: '0.260s', module: 'ANISKIP::LUA', status: 'Automated opening/ending chapter detector linked', color: 'text-cyber-purple' },
  { time: '0.310s', module: 'SHINSEI::READY', status: 'All 3 tiers operational (anime-lite, anime-cli, android)', color: 'text-white' },
];

export const BootloaderModal: React.FC<BootloaderModalProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [logIndex, setLogIndex] = useState(0);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    // Fast bootloader sequence
    const duration = 2100;
    const intervalTime = 30;
    const step = 100 / (duration / intervalTime);

    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = Math.min(prev + step + (Math.random() * 2), 100);
        const currentLog = Math.floor((next / 100) * BOOT_LOGS.length);
        setLogIndex(currentLog);

        if (next >= 100) {
          clearInterval(timer);
          setTimeout(() => {
            setIsDone(true);
            setTimeout(onComplete, 400);
          }, 350);
        }
        return next;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {!isDone && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#050607] p-4 font-mono select-none"
        >
          {/* Subtle Cyber Grid & Scanline */}
          <div className="absolute inset-0 bg-cyber-grid pointer-events-none opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#5f8bff]/5 to-transparent pointer-events-none" />

          <div className="relative w-full max-w-2xl overflow-hidden rounded-xl border border-slate-800 bg-[#0c1017]/95 shadow-2xl p-6 sm:p-8 backdrop-blur-xl">
            {/* Header / BIOS Bar */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded bg-[#5f8bff]/10 border border-[#5f8bff]/30 text-cyber-cyan">
                  <Terminal className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white tracking-widest">SHINSEI_BIOS</span>
                    <span className="rounded bg-slate-800 px-1.5 py-0.2 text-[10px] text-slate-400">v1.2.0</span>
                  </div>
                  <p className="text-[11px] text-slate-400">KYOTO DUAL-PROTOCOL STREAM ENGINE</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsDone(true);
                  setTimeout(onComplete, 100);
                }}
                className="rounded border border-slate-700/60 bg-slate-800/60 px-2.5 py-1 text-[11px] text-slate-400 hover:text-white hover:border-cyber-cyan transition-colors"
              >
                SKIP [ESC]
              </button>
            </div>

            {/* Diagnostic Logs Stream */}
            <div className="h-48 overflow-y-auto space-y-1.5 mb-6 text-xs text-slate-400 border border-slate-900 rounded-lg p-3 bg-[#08090a]">
              {BOOT_LOGS.slice(0, logIndex + 1).map((log, i) => (
                <div key={i} className="flex items-start gap-2.5 leading-relaxed">
                  <span className="text-slate-600 select-none">{log.time}</span>
                  <span className="font-semibold text-slate-500">[{log.module}]</span>
                  <span className={log.color}>{log.status}</span>
                </div>
              ))}
              {logIndex < BOOT_LOGS.length && (
                <div className="flex items-center gap-2 text-cyber-cyan animate-pulse">
                  <span>&gt;</span>
                  <DecryptedText text="EXECUTING REVERSE-ENGINEERED HANDSHAKE..." speed={25} />
                </div>
              )}
            </div>

            {/* Progress Bar & Decrypted Counter */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-cyber-cyan" />
                  INITIALIZING TERMINAL STREAM ECOSYSTEM
                </span>
                <span className="font-bold text-cyber-cyan tabular-nums">
                  {Math.round(progress)}%
                </span>
              </div>

              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800/80 p-[1px]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyber-cyan via-cyber-green to-cyber-purple transition-all duration-75"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                <span>MEM: 4.1MB / 4096KB</span>
                <span>SECURITY: ZERO-CLOUDFLARE</span>
                <span>STATUS: {progress >= 100 ? 'LINKED' : 'RESOLVING'}</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
