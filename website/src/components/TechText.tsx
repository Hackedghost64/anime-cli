import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface TechTextProps {
  children: React.ReactNode;
  tag?: string;
  className?: string;
  glowColor?: 'cyan' | 'green' | 'purple' | 'orange';
  showSpecks?: boolean;
  clickKick?: boolean;
}

export const TechText: React.FC<TechTextProps> = ({
  children,
  tag = 'SYS.01',
  className = '',
  glowColor = 'cyan',
  showSpecks = true,
  clickKick = true,
}) => {
  const [kick, setKick] = useState(0);

  const colorStyles = {
    cyan: {
      text: 'text-white',
      border: 'border-cyber-cyan/30',
      badge: 'bg-cyber-cyan/10 text-cyber-cyan border-cyber-cyan/40',
      glow: 'hover:text-glow-cyan',
      speck: 'bg-cyber-cyan',
    },
    green: {
      text: 'text-white',
      border: 'border-cyber-green/30',
      badge: 'bg-cyber-green/10 text-cyber-green border-cyber-green/40',
      glow: 'hover:text-glow-green',
      speck: 'bg-cyber-green',
    },
    purple: {
      text: 'text-white',
      border: 'border-cyber-purple/30',
      badge: 'bg-cyber-purple/10 text-cyber-purple border-cyber-purple/40',
      glow: 'hover:text-glow-purple',
      speck: 'bg-cyber-purple',
    },
    orange: {
      text: 'text-white',
      border: 'border-cyber-orange/30',
      badge: 'bg-cyber-orange/10 text-cyber-orange border-cyber-orange/40',
      glow: 'hover:text-glow-orange',
      speck: 'bg-cyber-orange',
    },
  }[glowColor];

  const handleClick = () => {
    if (clickKick) {
      setKick((k) => k + 1);
    }
  };

  return (
    <motion.div
      key={kick}
      onClick={handleClick}
      animate={kick ? { x: [0, -3, 3, -1, 1, 0], scale: [1, 0.98, 1.02, 1] } : {}}
      transition={{ duration: 0.25 }}
      className={`relative inline-block select-none group cursor-pointer ${className}`}
    >
      {/* Top Tag & Dashes */}
      {tag && (
        <div className="flex items-center gap-2 mb-1.5 opacity-80">
          <span className={`text-[10px] font-mono tracking-widest px-1.5 py-0.5 rounded border ${colorStyles.badge}`}>
            {tag}
          </span>
          <div className="h-[1px] flex-1 border-t border-dashed border-white/20" />
          <span className="text-[9px] font-mono text-slate-500 tracking-wider">HEX://FE04</span>
        </div>
      )}

      {/* Main Content with corner brackets */}
      <div className="relative">
        <span className={`transition-all duration-300 ${colorStyles.text} ${colorStyles.glow}`}>
          {children}
        </span>

        {/* Decorative corner dashes */}
        <span className="absolute -top-1 -left-2 w-1.5 h-1.5 border-t border-l border-white/40" />
        <span className="absolute -bottom-1 -right-2 w-1.5 h-1.5 border-b border-r border-white/40" />
      </div>

      {/* Floating specks */}
      {showSpecks && (
        <div className="pointer-events-none absolute inset-0 overflow-visible">
          <span
            className={`absolute -top-1 right-1/4 w-1 h-1 rounded-full ${colorStyles.speck} opacity-60 animate-ping`}
            style={{ animationDuration: '3s' }}
          />
          <span
            className={`absolute -bottom-1 left-1/3 w-0.5 h-0.5 rounded-full ${colorStyles.speck} opacity-80`}
          />
          <span
            className={`absolute top-1/2 -right-3 w-1 h-1 rounded-full ${colorStyles.speck} opacity-40`}
          />
        </div>
      )}
    </motion.div>
  );
};
