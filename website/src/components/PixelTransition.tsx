import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface PixelTransitionProps {
  firstContent: React.ReactNode;
  secondContent: React.ReactNode;
  gridSize?: number;
  pixelColor?: string;
  className?: string;
  trigger?: 'hover' | 'click';
}

export const PixelTransition: React.FC<PixelTransitionProps> = ({
  firstContent,
  secondContent,
  gridSize = 8,
  pixelColor = '#ff640a',
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
      className={`relative overflow-hidden rounded-2xl border border-white/10 bg-black cursor-pointer select-none ${className}`}
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
              style={{
                backgroundColor: `${pixelColor}30`,
                borderColor: `${pixelColor}50`,
              }}
              className="border-[0.5px] backdrop-blur-sm"
            />
          );
        })}
      </div>

      {/* Interactive Trigger Pill Indicator */}
      <div className="absolute bottom-3 right-3 z-30 flex items-center gap-1.5 rounded-full bg-black/90 px-2.5 py-1 border border-white/10 text-[10px] font-mono text-zinc-400 backdrop-blur-md">
        <span className="w-1.5 h-1.5 rounded-full bg-[#ff640a] animate-pulse" />
        <span>{isRevealed ? 'DISPATCH: MPV_ACTIVE' : 'HOVER: REVEAL_PLAYBACK'}</span>
      </div>
    </div>
  );
};
