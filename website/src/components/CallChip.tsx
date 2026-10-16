import React, { useState, useEffect } from 'react';
import { Play, Check, RotateCw, Terminal, Copy } from 'lucide-react';

interface CallChipProps {
  command: string;
  endpoint?: string;
  durationMs?: number;
  initialStatus?: 'idle' | 'running' | 'success' | 'failed';
  className?: string;
  onRun?: () => void;
}

export const CallChip: React.FC<CallChipProps> = ({
  command,
  endpoint = 'api/v4/stream',
  durationMs = 480,
  initialStatus = 'success',
  className = '',
  onRun,
}) => {
  const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'failed'>(initialStatus);
  const [progress, setProgress] = useState(100);
  const [elapsed, setElapsed] = useState(durationMs);
  const [copied, setCopied] = useState(false);

  const executeCall = () => {
    setStatus('running');
    setProgress(0);
    setElapsed(0);
    const start = performance.now();

    const interval = window.setInterval(() => {
      const now = performance.now();
      const diff = now - start;
      const currentProgress = Math.min((diff / durationMs) * 100, 100);
      setProgress(currentProgress);
      setElapsed(Math.round(diff));

      if (diff >= durationMs) {
        clearInterval(interval);
        setStatus('success');
        setProgress(100);
        setElapsed(durationMs);
        if (onRun) onRun();
      }
    }, 20);
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div
      onClick={status === 'running' ? undefined : executeCall}
      className={`group relative overflow-hidden rounded-lg border border-slate-800 bg-[#0c1017]/90 px-3.5 py-2 text-xs font-mono transition-all duration-300 hover:border-cyber-cyan/50 hover:shadow-glow-cyan cursor-pointer select-none ${className}`}
    >
      {/* Background Progress Wash */}
      {status === 'running' && (
        <div
          className="absolute inset-0 bg-cyber-cyan/15 transition-all duration-75 pointer-events-none"
          style={{ width: `${progress}%` }}
        />
      )}

      <div className="relative flex items-center justify-between gap-3">
        {/* Left: Status Icon & Command */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-5 w-5 items-center justify-center rounded bg-slate-900 border border-slate-700/80">
            {status === 'running' && (
              <RotateCw className="h-3 w-3 text-cyber-cyan animate-spin" />
            )}
            {status === 'success' && (
              <Check className="h-3 w-3 text-cyber-green" />
            )}
            {status === 'idle' && (
              <Terminal className="h-3 w-3 text-slate-400 group-hover:text-cyber-cyan" />
            )}
            {status === 'failed' && (
              <span className="text-[10px] text-red-400 font-bold">!</span>
            )}
          </div>

          <span className="text-slate-200 font-medium group-hover:text-white">
            {command}
          </span>
        </div>

        {/* Right: Endpoint badge, latency counter & actions */}
        <div className="flex items-center gap-2">
          {endpoint && (
            <span className="hidden sm:inline-block rounded bg-slate-800/80 px-1.5 py-0.5 text-[10px] text-slate-400 border border-slate-700">
              {endpoint}
            </span>
          )}

          <span className="text-[11px] tabular-nums font-semibold text-cyber-cyan">
            {status === 'running' ? `${elapsed}ms...` : `${elapsed}ms`}
          </span>

          {/* Action buttons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleCopy}
              title="Copy Command"
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
            >
              {copied ? (
                <Check className="h-3 w-3 text-cyber-green" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                executeCall();
              }}
              title="Re-run Call"
              className="p-1 text-slate-400 hover:text-cyber-cyan rounded hover:bg-slate-800 transition-colors"
            >
              <RotateCw className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
