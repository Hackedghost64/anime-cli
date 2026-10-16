import React, { useEffect, useState, useRef } from 'react';

interface CountUpProps {
  to: number;
  from?: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  replayOnHover?: boolean;
}

export const CountUp: React.FC<CountUpProps> = ({
  to,
  from = 0,
  duration = 1.6,
  decimals = 0,
  prefix = '',
  suffix = '',
  className = '',
  replayOnHover = true,
}) => {
  const [value, setValue] = useState(from);
  const [hasTriggered, setHasTriggered] = useState(false);
  const elementRef = useRef<HTMLSpanElement>(null);
  const frameRef = useRef<number | null>(null);

  const startCounting = () => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    const startTime = performance.now();
    const durationMs = duration * 1000;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      
      // easeOutExpo
      const easedProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const currentVal = from + (to - from) * easedProgress;

      setValue(currentVal);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        setValue(to);
      }
    };

    frameRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasTriggered) {
            setHasTriggered(true);
            startCounting();
          }
        });
      },
      { threshold: 0.2 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => {
      observer.disconnect();
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [to, from, duration, hasTriggered]);

  const handleMouseEnter = () => {
    if (replayOnHover) {
      startCounting();
    }
  };

  const formatted = value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span
      ref={elementRef}
      onMouseEnter={handleMouseEnter}
      className={`font-mono tabular-nums inline-block select-none ${className}`}
    >
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
};
