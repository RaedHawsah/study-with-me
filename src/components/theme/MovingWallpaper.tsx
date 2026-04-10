'use client';

import { useEffect, useRef, useState } from 'react';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import type { ColorPresetId } from '@/lib/themes';

// ─── Animation Configs per Theme ──────────────────────────────────────────────

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  opacitySpeed: number;
  color: string;
  angle?: number;
  angleSpeed?: number;
  life?: number;
  maxLife?: number;
}

type AnimateFn = (
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
  canvas: HTMLCanvasElement,
  frame: number
) => void;

// ─── ☕ Coffee Brew — Steam & Warm Orbs ───────────────────────────────────────
function coffeeDraw(ctx: CanvasRenderingContext2D, particles: Particle[], canvas: HTMLCanvasElement) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Warm radial background glow
  const grad = ctx.createRadialGradient(canvas.width / 2, canvas.height, 0, canvas.width / 2, canvas.height, canvas.height * 1.2);
  grad.addColorStop(0,   'rgba(123, 90, 68, 0.18)');
  grad.addColorStop(0.5, 'rgba(79, 52, 36, 0.08)');
  grad.addColorStop(1,    'transparent');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  particles.forEach((p) => {
    p.y -= p.speedY;
    p.x += Math.sin(p.y * 0.015 + (p.angle ?? 0)) * 0.6;
    p.opacity -= p.opacitySpeed;
    p.size  += 0.08;

    if (p.opacity <= 0 || p.y < -20) {
      p.y = canvas.height + 10;
      p.x = Math.random() * canvas.width;
      p.opacity = 0.3 + Math.random() * 0.3;
      p.size = 2 + Math.random() * 6;
      p.speedY = 0.3 + Math.random() * 0.5;
    }

    ctx.beginPath();
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
    g.addColorStop(0, `rgba(243, 230, 214, ${p.opacity})`);
    g.addColorStop(1, `rgba(216, 191, 168, 0)`);
    ctx.fillStyle = g;
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  });
}

function coffeeInit(canvas: HTMLCanvasElement): Particle[] {
  return Array.from({ length: 60 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    size: 2 + Math.random() * 8,
    speedX: 0,
    speedY: 0.3 + Math.random() * 0.5,
    opacity: Math.random() * 0.4,
    opacitySpeed: 0.001 + Math.random() * 0.002,
    color: '',
    angle: Math.random() * Math.PI * 2,
  }));
}

// ─── 🍵 Matcha Forest — Falling Leaves ───────────────────────────────────────
function matchaDraw(ctx: CanvasRenderingContext2D, particles: Particle[], canvas: HTMLCanvasElement) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  grad.addColorStop(0, 'rgba(44, 32, 28, 0.2)');
  grad.addColorStop(1, 'rgba(60, 46, 42, 0.1)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  particles.forEach((p) => {
    p.y += p.speedY;
    p.x += Math.sin(p.angle ?? 0) * 1.2;
    p.angle = (p.angle ?? 0) + (p.angleSpeed ?? 0.02);

    if (p.y > canvas.height + 20) {
      p.y = -20;
      p.x = Math.random() * canvas.width;
    }

    ctx.save();
    ctx.globalAlpha = p.opacity;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle ?? 0);

    // Draw a leaf shape
    ctx.beginPath();
    ctx.fillStyle = p.color;
    ctx.ellipse(0, 0, p.size * 0.5, p.size, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  });
}

function matchaInit(canvas: HTMLCanvasElement): Particle[] {
  const colors = ['#8A9A5B', '#B0C27D', '#6B7A40', '#9FBF72', '#C8D8A0'];
  return Array.from({ length: 40 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    size: 5 + Math.random() * 10,
    speedX: 0,
    speedY: 0.6 + Math.random() * 1.2,
    opacity: 0.15 + Math.random() * 0.35,
    opacitySpeed: 0,
    color: colors[Math.floor(Math.random() * colors.length)],
    angle: Math.random() * Math.PI * 2,
    angleSpeed: (Math.random() - 0.5) * 0.04,
  }));
}

// ─── 🌧️ Midnight Rain — Raindrops ────────────────────────────────────────────
function midnightDraw(ctx: CanvasRenderingContext2D, particles: Particle[], canvas: HTMLCanvasElement, frame: number) {
  // Gentle fade trail
  ctx.fillStyle = 'rgba(15, 23, 42, 0.25)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle horizontal lightning flash every ~300 frames
  if (frame % 320 < 3) {
    ctx.fillStyle = 'rgba(199, 210, 254, 0.04)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  particles.forEach((p) => {
    p.y += p.speedY;
    p.x += p.speedX;

    if (p.y > canvas.height) {
      p.y = -Math.random() * canvas.height;
      p.x = Math.random() * canvas.width;
      p.speedY = 8 + Math.random() * 10;
      p.speedX = -1 + Math.random() * 0.5;
    }

    ctx.beginPath();
    ctx.strokeStyle = p.color;
    ctx.globalAlpha = p.opacity;
    ctx.lineWidth = p.size;
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + p.speedX * 2, p.y + p.size * 12);
    ctx.stroke();
    ctx.globalAlpha = 1;
  });
}

function midnightInit(canvas: HTMLCanvasElement): Particle[] {
  return Array.from({ length: 120 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    size: 0.5 + Math.random() * 0.8,
    speedX: -1 + Math.random() * 0.5,
    speedY: 8 + Math.random() * 10,
    opacity: 0.1 + Math.random() * 0.35,
    opacitySpeed: 0,
    color: `hsl(${220 + Math.random() * 20}, 60%, ${65 + Math.random() * 20}%)`,
  }));
}

// ─── 🌸 Lofi Sunset — Floating Petals & Bokeh ────────────────────────────────
function lofiDraw(ctx: CanvasRenderingContext2D, particles: Particle[], canvas: HTMLCanvasElement) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Dreamy gradient
  const grad = ctx.createLinearGradient(0, 0, canvas.width * 0.5, canvas.height);
  grad.addColorStop(0, 'rgba(74, 21, 75, 0.12)');
  grad.addColorStop(1, 'rgba(107, 33, 168, 0.06)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  particles.forEach((p) => {
    p.y -= p.speedY;
    p.x += Math.sin((p.life ?? 0) * 0.02) * 0.8;
    p.life = (p.life ?? 0) + 1;

    if (p.y < -20) {
      p.y = canvas.height + 20;
      p.x = Math.random() * canvas.width;
      p.life = 0;
    }

    // Bokeh circle
    ctx.save();
    ctx.globalAlpha = p.opacity * (0.5 + 0.5 * Math.sin((p.life ?? 0) * 0.05));
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
    g.addColorStop(0, p.color);
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

function lofiInit(canvas: HTMLCanvasElement): Particle[] {
  const colors = ['rgba(253, 164, 175, 0.8)', 'rgba(251, 207, 232, 0.7)', 'rgba(240, 171, 252, 0.7)', 'rgba(249, 168, 212, 0.6)'];
  return Array.from({ length: 50 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    size: 8 + Math.random() * 30,
    speedX: 0,
    speedY: 0.2 + Math.random() * 0.5,
    opacity: 0.08 + Math.random() * 0.2,
    opacitySpeed: 0,
    color: colors[Math.floor(Math.random() * colors.length)],
    life: Math.random() * 200,
    maxLife: 200,
  }));
}

// ─── 💜 Cyber Dusk — Neon Grid & Particles ────────────────────────────────────
function cyberDraw(ctx: CanvasRenderingContext2D, particles: Particle[], canvas: HTMLCanvasElement, frame: number) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Grid lines
  ctx.strokeStyle = 'rgba(224, 200, 255, 0.04)';
  ctx.lineWidth = 1;
  const gridSize = 60;
  for (let x = 0; x < canvas.width; x += gridSize) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += gridSize) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
  }

  // Neon particles
  particles.forEach((p) => {
    p.y -= p.speedY;
    p.x += Math.sin(frame * 0.01 + (p.angle ?? 0)) * 0.5;
    p.opacity = 0.2 + 0.5 * Math.abs(Math.sin(frame * 0.02 + (p.angle ?? 0)));

    if (p.y < -10) {
      p.y = canvas.height + 10;
      p.x = Math.random() * canvas.width;
    }

    ctx.save();
    ctx.globalAlpha = p.opacity;
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
    g.addColorStop(0, p.color);
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();

    // Glow trail
    ctx.globalAlpha = p.opacity * 0.3;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y + p.size, p.size * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

function cyberInit(canvas: HTMLCanvasElement): Particle[] {
  const colors = ['rgba(255, 97, 210, 0.9)', 'rgba(192, 132, 252, 0.9)', 'rgba(224, 200, 255, 0.8)', 'rgba(99, 102, 241, 0.9)'];
  return Array.from({ length: 55 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    size: 2 + Math.random() * 6,
    speedX: 0,
    speedY: 0.3 + Math.random() * 0.8,
    opacity: 0.3 + Math.random() * 0.5,
    opacitySpeed: 0,
    color: colors[Math.floor(Math.random() * colors.length)],
    angle: Math.random() * Math.PI * 2,
  }));
}

// ─── Theme Map ─────────────────────────────────────────────────────────────────

const THEME_ANIMATIONS: Record<ColorPresetId, {
  init: (canvas: HTMLCanvasElement) => Particle[];
  draw: AnimateFn;
}> = {
  coffee:   { init: coffeeInit,   draw: (ctx, p, c) => coffeeDraw(ctx, p, c) },
  matcha:   { init: matchaInit,   draw: (ctx, p, c) => matchaDraw(ctx, p, c) },
  midnight: { init: midnightInit, draw: (ctx, p, c, f) => midnightDraw(ctx, p, c, f) },
  lofi:     { init: lofiInit,     draw: (ctx, p, c) => lofiDraw(ctx, p, c) },
  cyber:    { init: cyberInit,    draw: (ctx, p, c, f) => cyberDraw(ctx, p, c, f) },
};

// ─── Main Component ────────────────────────────────────────────────────────────

export function MovingWallpaper() {
  const { colorPresetId } = usePreferencesStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize canvas to fill screen
    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const theme = THEME_ANIMATIONS[colorPresetId] ?? THEME_ANIMATIONS.cyber;
    const particles = theme.init(canvas);
    let frame = 0;

    const loop = () => {
      theme.draw(ctx, particles, canvas, frame++);
      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [mounted, colorPresetId]);

  if (!mounted) return null;

  return (
    <>
      {/* Animated Canvas Background */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full h-full pointer-events-none z-[-2]"
        aria-hidden="true"
      />

      {/* Pure black dimming overlay for text readability */}
      <div className="fixed inset-0 w-full h-full pointer-events-none bg-black/55 z-[-1]" />
    </>
  );
}
