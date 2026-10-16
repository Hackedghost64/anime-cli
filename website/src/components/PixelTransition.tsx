import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface PixelTransitionProps {
  firstContent: React.ReactNode;
  secondContent: React.ReactNode;
  gridSize?: number;
  className?: string;
  trigger?: 'hover' | 'click';
}

export const PixelTransition: React.FC<PixelTransitionProps> = ({
  firstContent,
  secondContent,
  gridSize = 8,
  className = '',
  trigger = 'hover',
}) => {
  const [isRevealed, setIsRevealed] = useState(false);
  const totalPixels = gridSize * gridSize;

  const handleMouseEnter = () => {
    if (trigger === 'hover') setIsRevealed(true);
  };

  const handleMouseLeave = () => {
    if (trigger === 'hover') setIsRevealed(false);
  };

  const handleClick = () => {
    if (trigger === 'click') setIsRevealed(!isRevealed);
  };

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      className={`relative overflow-hidden rounded-xl border border-slate-800 bg-[#0b0e14] cursor-pointer select-none ${className}`}
    >
      {/* Background/Second Content (Revealed on active) */}
      <div className="absolute inset-0 z-0 flex items-center justify-center p-4">
        {secondContent}
      </div>

      {/* Front/First Content */}
      <motion.div
        animate={{ opacity: isRevealed ? 0 : 1 }}
        transition={{ duration: 0.35 }}
        className="relative z-10 p-4 w-full h-full"
      >
        {firstContent}
      </motion.div>

      {/* Pixel Dissolve Matrix Grid Overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-20 grid"
        style={{
          gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${gridSize}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: totalPixels }).map((_, i) => {
          // Staggered pseudo-random delay based on coordinate distance or index hash
          const col = i % gridSize;
          const row = Math.floor(i / gridSize);
          const delay = ((col + row) / (gridSize * 2)) * 0.25 + (Math.sin(i) * 0.05 + 0.05);

          return (
            <motion.div
              key={i}
              initial={false}
              animate={{
                opacity: isRevealed ? [0, 0.9, 0] : 0,
                scale: isRevealed ? [1, 1.1, 0.8] : 1,
              }}
              transition={{
                duration: 0.35,
                delay: isRevealed ? delay : 0,
              }}
              className="bg-[#5f8bff]/20 border-[0.5px] border-[#5f8bff]/30 backdrop-blur-sm"
            />
          );
        })}
      </div>

      {/* Interactive Trigger Pill Indicator */}
      <div className="absolute bottom-2.5 right-2.5 z-30 flex items-center gap-1.5 rounded-full bg-[#08090a]/90 px-2 py-0.5 border border-slate-700/80 text-[10px] font-mono text-slate-400 backdrop-blur-md">
        <span className="w-1.5 h-1.5 rounded-full bg-cyber-cyan animate-pulse" />
        <span>{isRevealed ? 'VIEW: LIVE_STREAM' : 'HOVER: DISSOLVE'}</span>
      </div>
    </div>
  );
};
