import React, { useEffect, useState, useRef } from 'react';
import { motion, useSpring, useMotionValue } from 'framer-motion';

interface TargetCursorProps {
  spinDuration?: number;
  color?: string;
  lockedColor?: string;
}

export const TargetCursor: React.FC<TargetCursorProps> = ({
  spinDuration = 8,
  color = '#5f8bff',
  lockedColor = '#2bb673',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [targetLabel, setTargetLabel] = useState<string | null>(null);

  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);

  const springConfig = { damping: 28, stiffness: 350, mass: 0.5 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) {
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      setIsVisible(true);
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);

      const targetEl = (e.target as HTMLElement)?.closest('.cursor-target, button, a');
      if (targetEl) {
        setIsLocked(true);
        const label = targetEl.getAttribute('data-target-label') || 'TARGET_ACQUIRED';
        setTargetLabel(label);
      } else {
        setIsLocked(false);
        setTargetLabel(null);
      }
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [mouseX, mouseY]);

  if (!isVisible) return null;

  return (
    <motion.div
      style={{
        x: smoothX,
        y: smoothY,
        translateX: '-50%',
        translateY: '-50%',
      }}
      className="pointer-events-none fixed top-0 left-0 z-40"
    >
      {/* Outer Rotating Crosshair Ring */}
      <motion.div
        animate={{
          rotate: 360,
          scale: isLocked ? 1.25 : 1,
        }}
        transition={{
          rotate: { repeat: Infinity, duration: spinDuration, ease: 'linear' },
          scale: { type: 'spring', damping: 20, stiffness: 300 },
        }}
        className="relative flex items-center justify-center"
        style={{ width: isLocked ? 44 : 32, height: isLocked ? 44 : 32 }}
      >
        {/* Reticle tick marks */}
        <div
          className="absolute inset-0 rounded-full border border-dashed transition-colors duration-200"
          style={{ borderColor: isLocked ? lockedColor : color, opacity: 0.45 }}
        />
        {/* 4 corner bracket points */}
        <span
          className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 transition-colors duration-200"
          style={{ borderColor: isLocked ? lockedColor : color }}
        />
        <span
          className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 transition-colors duration-200"
          style={{ borderColor: isLocked ? lockedColor : color }}
        />
        <span
          className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 transition-colors duration-200"
          style={{ borderColor: isLocked ? lockedColor : color }}
        />
        <span
          className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 transition-colors duration-200"
          style={{ borderColor: isLocked ? lockedColor : color }}
        />
      </motion.div>

      {/* Target status tag badge */}
      {isLocked && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute left-7 -top-2 flex items-center gap-1.5 whitespace-nowrap rounded bg-[#08090a]/90 px-1.5 py-0.5 border border-[#2bb673]/60 text-[9px] font-mono font-bold tracking-wider text-[#2bb673] shadow-glow-green"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#2bb673] animate-ping" />
          <span>{targetLabel}</span>
        </motion.div>
      )}
    </motion.div>
  );
};
