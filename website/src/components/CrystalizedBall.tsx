import React, { useEffect, useRef, useState } from 'react';

export type CrystalPreset = 'kyoto' | 'matrix' | 'plasma' | 'fire';

interface CrystalizedBallProps {
  size?: number;
  preset?: CrystalPreset;
  interactive?: boolean;
  className?: string;
  intensity?: number;
}

interface Tendril {
  angle: number;
  branches: { x: number; y: number }[];
  life: number;
  maxLife: number;
  intensity: number;
}

const PRESET_CONFIGS = {
  kyoto: {
    coreColor: '#5f8bff',
    glowColor: 'rgba(95, 139, 255, 0.45)',
    arcColor: '#80c3ff',
    sparkColor: '#ffffff',
    innerRamp: ['rgba(95, 139, 255, 0.25)', 'rgba(20, 35, 70, 0.7)', 'rgba(8, 9, 10, 0.95)'],
  },
  matrix: {
    coreColor: '#2bb673',
    glowColor: 'rgba(43, 182, 115, 0.45)',
    arcColor: '#5cffaa',
    sparkColor: '#ffffff',
    innerRamp: ['rgba(43, 182, 115, 0.25)', 'rgba(15, 45, 25, 0.7)', 'rgba(8, 9, 10, 0.95)'],
  },
  plasma: {
    coreColor: '#F25BD0',
    glowColor: 'rgba(242, 91, 208, 0.45)',
    arcColor: '#ff8cf7',
    sparkColor: '#ffffff',
    innerRamp: ['rgba(242, 91, 208, 0.25)', 'rgba(50, 15, 45, 0.7)', 'rgba(8, 9, 10, 0.95)'],
  },
  fire: {
    coreColor: '#ff6b00',
    glowColor: 'rgba(255, 107, 0, 0.45)',
    arcColor: '#ffab66',
    sparkColor: '#ffffff',
    innerRamp: ['rgba(255, 107, 0, 0.25)', 'rgba(55, 25, 10, 0.7)', 'rgba(8, 9, 10, 0.95)'],
  },
};

export const CrystalizedBall: React.FC<CrystalizedBallProps> = ({
  size = 280,
  preset = 'kyoto',
  interactive = true,
  className = '',
  intensity = 1.0,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activePreset, setActivePreset] = useState<CrystalPreset>(preset);
  const mouseRef = useRef<{ x: number; y: number; isInside: boolean }>({
    x: size / 2,
    y: size / 2,
    isInside: false,
  });

  useEffect(() => {
    setActivePreset(preset);
  }, [preset]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const radius = size * 0.42;
    const centerX = size / 2;
    const centerY = size / 2;

    const tendrils: Tendril[] = [];
    const maxTendrils = 9;

    const createTendril = (targetAngle?: number, targetX?: number, targetY?: number): Tendril => {
      const angle = targetAngle ?? Math.random() * Math.PI * 2;
      const branches: { x: number; y: number }[] = [];
      const segments = 12;
      
      let currX = centerX;
      let currY = centerY;
      branches.push({ x: currX, y: currY });

      const destX = targetX ?? centerX + Math.cos(angle) * (radius * (0.85 + Math.random() * 0.15));
      const destY = targetY ?? centerY + Math.sin(angle) * (radius * (0.85 + Math.random() * 0.15));

      for (let s = 1; s <= segments; s++) {
        const factor = s / segments;
        const idealX = centerX + (destX - centerX) * factor;
        const idealY = centerY + (destY - centerY) * factor;
        const jitter = (1 - factor) * 14 + 4;

        currX = idealX + (Math.random() - 0.5) * jitter;
        currY = idealY + (Math.random() - 0.5) * jitter;
        branches.push({ x: currX, y: currY });
      }

      return {
        angle,
        branches,
        life: 0,
        maxLife: Math.floor(Math.random() * 12 + 6),
        intensity: Math.random() * 0.6 + 0.4,
      };
    };

    let tick = 0;

    const render = () => {
      tick++;
      ctx.clearRect(0, 0, size, size);

      const config = PRESET_CONFIGS[activePreset];

      // 1. Outer ambient glow ring
      const ambientGlow = ctx.createRadialGradient(centerX, centerY, radius * 0.6, centerX, centerY, radius * 1.25);
      ambientGlow.addColorStop(0, config.glowColor);
      ambientGlow.addColorStop(1, 'rgba(8, 9, 10, 0)');
      ctx.fillStyle = ambientGlow;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 1.25, 0, Math.PI * 2);
      ctx.fill();

      // 2. Crystal Sphere Body / Glass base
      const bodyGrad = ctx.createRadialGradient(
        centerX - radius * 0.3,
        centerY - radius * 0.3,
        radius * 0.1,
        centerX,
        centerY,
        radius
      );
      bodyGrad.addColorStop(0, config.innerRamp[0]);
      bodyGrad.addColorStop(0.6, config.innerRamp[1]);
      bodyGrad.addColorStop(1, config.innerRamp[2]);

      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fillStyle = bodyGrad;
      ctx.fill();
      ctx.clip();

      // 3. Central Core Plasma Bulb
      const coreGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius * 0.3);
      coreGrad.addColorStop(0, '#ffffff');
      coreGrad.addColorStop(0.4, config.coreColor);
      coreGrad.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 0.3, 0, Math.PI * 2);
      ctx.fill();

      // 4. Update and generate crackling lightning tendrils
      if (tendrils.length < maxTendrils && Math.random() < 0.65) {
        if (mouseRef.current.isInside) {
          tendrils.push(createTendril(undefined, mouseRef.current.x, mouseRef.current.y));
        } else {
          tendrils.push(createTendril());
        }
      }

      // Draw tendrils
      for (let i = tendrils.length - 1; i >= 0; i--) {
        const t = tendrils[i];
        t.life++;

        const alpha = (1 - t.life / t.maxLife) * t.intensity * intensity;
        if (alpha <= 0) {
          tendrils.splice(i, 1);
          continue;
        }

        // Draw lightning line
        ctx.strokeStyle = config.arcColor;
        ctx.lineWidth = 1.8;
        ctx.globalAlpha = alpha;
        ctx.shadowColor = config.coreColor;
        ctx.shadowBlur = 10;

        ctx.beginPath();
        for (let b = 0; b < t.branches.length; b++) {
          const pt = t.branches[b];
          if (b === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();

        // White hot center line
        ctx.strokeStyle = config.sparkColor;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        for (let b = 0; b < t.branches.length; b++) {
          const pt = t.branches[b];
          if (b === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();

        // End spark on rim
        const endPt = t.branches[t.branches.length - 1];
        ctx.fillStyle = config.sparkColor;
        ctx.beginPath();
        ctx.arc(endPt.x, endPt.y, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1.0;
      }

      ctx.restore();

      // 5. Glass rim highlights and reflections
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Top-left curved specular reflection highlight
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(
        centerX - radius * 0.35,
        centerY - radius * 0.38,
        radius * 0.45,
        radius * 0.22,
        -Math.PI / 4,
        0,
        Math.PI * 2
      );
      const specGrad = ctx.createLinearGradient(
        centerX - radius * 0.6,
        centerY - radius * 0.6,
        centerX,
        centerY
      );
      specGrad.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
      specGrad.addColorStop(0.7, 'rgba(255, 255, 255, 0.05)');
      specGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = specGrad;
      ctx.fill();
      ctx.restore();

      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [size, activePreset, intensity]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!interactive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const radius = size * 0.42;
    const dist = Math.hypot(x - size / 2, y - size / 2);

    mouseRef.current = {
      x,
      y,
      isInside: dist <= radius,
    };
  };

  const handleMouseLeave = () => {
    mouseRef.current.isInside = false;
  };

  return (
    <div className={`relative inline-flex flex-col items-center ${className}`}>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="cursor-crosshair drop-shadow-[0_0_35px_rgba(95,139,255,0.3)] transition-transform duration-500 hover:scale-105"
        />

        {/* Orbiting tech rings */}
        <div
          className="pointer-events-none absolute inset-0 rounded-full border border-dashed border-cyber-cyan/20 animate-spin-slow"
          style={{ width: size, height: size }}
        />
      </div>

      {/* Preset Switcher Pills */}
      <div className="mt-3 flex items-center gap-1.5 rounded-full border border-slate-800 bg-[#0c1017]/90 p-1 text-[11px] font-mono shadow-lg backdrop-blur-md">
        {(['kyoto', 'matrix', 'plasma', 'fire'] as CrystalPreset[]).map((p) => {
          const isActive = activePreset === p;
          return (
            <button
              key={p}
              type="button"
              onClick={() => setActivePreset(p)}
              className={`rounded-full px-2.5 py-0.5 capitalize transition-all ${
                isActive
                  ? 'bg-slate-800 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {p}
            </button>
          );
        })}
      </div>
    </div>
  );
};
