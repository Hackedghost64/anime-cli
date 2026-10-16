import React, { useEffect, useState, useRef } from 'react';

interface GlowCursorProps {
  color?: string;
  size?: number;
  trailLength?: number;
  intensity?: number;
  linger?: number;
  clickBurst?: boolean;
}

interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
  radius: number;
}

interface BurstParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  color: string;
}

export const GlowCursor: React.FC<GlowCursorProps> = ({
  color = '#5f8bff',
  size = 24,
  trailLength = 16,
  intensity = 1.0,
  linger = 0.92,
  clickBurst = true,
}) => {
  const [enabled, setEnabled] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -100, y: -100, active: false });
  const trailRef = useRef<TrailPoint[]>([]);
  const burstsRef = useRef<BurstParticle[]>([]);

  useEffect(() => {
    // Check if touch device
    if (window.matchMedia('(pointer: coarse)').matches) {
      setEnabled(false);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY, active: true };
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    const handleClick = (e: MouseEvent) => {
      if (!clickBurst) return;
      const burstColors = ['#5f8bff', '#2bb673', '#F25BD0', '#ff6b00', '#ffffff'];
      for (let i = 0; i < 18; i++) {
        const angle = (Math.PI * 2 * i) / 18 + (Math.random() - 0.5);
        const speed = Math.random() * 4 + 2;
        burstsRef.current.push({
          x: e.clientX,
          y: e.clientY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          alpha: 1.0,
          color: burstColors[Math.floor(Math.random() * burstColors.length)],
        });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('click', handleClick);

    let animationId: number;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Add current mouse to trail if active
      if (mouseRef.current.active) {
        trailRef.current.unshift({
          x: mouseRef.current.x,
          y: mouseRef.current.y,
          alpha: 1.0 * intensity,
          radius: size / 2,
        });
        if (trailRef.current.length > trailLength) {
          trailRef.current.pop();
        }
      }

      // Draw and decay trail
      for (let i = trailRef.current.length - 1; i >= 0; i--) {
        const pt = trailRef.current[i];
        pt.alpha *= linger;
        pt.radius *= 0.96;

        if (pt.alpha < 0.01) {
          trailRef.current.splice(i, 1);
          continue;
        }

        const gradient = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, pt.radius * 2);
        gradient.addColorStop(0, `rgba(95, 139, 255, ${pt.alpha * 0.4})`);
        gradient.addColorStop(0.5, `rgba(95, 139, 255, ${pt.alpha * 0.15})`);
        gradient.addColorStop(1, 'rgba(95, 139, 255, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.radius * 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw click burst particles
      for (let i = burstsRef.current.length - 1; i >= 0; i--) {
        const p = burstsRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.92;
        p.vy *= 0.92;
        p.alpha *= 0.91;

        if (p.alpha < 0.02) {
          burstsRef.current.splice(i, 1);
          continue;
        }

        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }

      // Draw main point
      if (mouseRef.current.active) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(mouseRef.current.x, mouseRef.current.y, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('click', handleClick);
    };
  }, [color, size, trailLength, intensity, linger, clickBurst]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-50 mix-blend-screen"
    />
  );
};
