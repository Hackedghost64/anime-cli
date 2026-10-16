import React, { useState, useEffect, useRef } from 'react';

interface DecryptedTextProps {
  text: string;
  speed?: number;
  maxIterations?: number;
  characters?: string;
  className?: string;
  encryptedClassName?: string;
  parentClassName?: string;
  animateOn?: 'view' | 'hover' | 'both' | 'mount';
  revealDirection?: 'start' | 'end' | 'center';
  sequential?: boolean;
}

export const DecryptedText: React.FC<DecryptedTextProps> = ({
  text,
  speed = 40,
  maxIterations = 15,
  characters = '01ABCDEF#$@%*&~¥§ΔλΩЖ░▒▓',
  className = '',
  encryptedClassName = 'text-cyber-green/70',
  parentClassName = '',
  animateOn = 'both',
  revealDirection = 'start',
  sequential = true,
}) => {
  const [displayText, setDisplayText] = useState(text);
  const [isHovered, setIsHovered] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);
  const intervalRef = useRef<number | null>(null);

  const startAnimation = () => {
    let iteration = 0;
    const len = text.length;
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = window.setInterval(() => {
      setDisplayText(() => {
        return text
          .split('')
          .map((char, index) => {
            if (char === ' ') return ' ';

            let isResolved = false;
            if (sequential) {
              if (revealDirection === 'start') {
                isResolved = index < (iteration / maxIterations) * len;
              } else if (revealDirection === 'end') {
                isResolved = index >= len - (iteration / maxIterations) * len;
              } else {
                const mid = len / 2;
                const distFromMid = Math.abs(index - mid);
                isResolved = distFromMid < (iteration / maxIterations) * mid;
              }
            } else {
              isResolved = iteration >= maxIterations;
            }

            if (isResolved) {
              return text[index];
            }

            const randIndex = Math.floor(Math.random() * characters.length);
            return characters[randIndex];
          })
          .join('');
      });

      iteration += 1;
      if (iteration > maxIterations) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setDisplayText(text);
      }
    }, speed);
  };

  useEffect(() => {
    if (animateOn === 'mount') {
      startAnimation();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated) {
            setHasAnimated(true);
            startAnimation();
          }
        });
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [text, hasAnimated, animateOn]);

  const handleMouseEnter = () => {
    if (animateOn === 'hover' || animateOn === 'both') {
      setIsHovered(true);
      startAnimation();
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <span
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`inline-block font-mono cursor-default ${parentClassName}`}
    >
      <span className={displayText === text ? className : encryptedClassName}>
        {displayText}
      </span>
    </span>
  );
};
