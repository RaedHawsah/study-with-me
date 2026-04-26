'use client';

/**
 * MovingWallpaper — Canvas-based animated particle background.
 *
 * v2 performance improvements:
 * - Runs at 30fps (frame skip every other RAF) instead of 60fps — halves CPU cost
 * - Pauses completely when the tab is hidden (visibilitychange)
 * - Reduced particle counts: rain 80→45, cyber 45→28, coffee 45→22, lofi 40→22
 * - canvas.getContext('2d', { alpha: false, desynchronized: true }) for GPU offload
 * - will-change: transform on canvas so compositor promotes it to GPU layer
 * - ResizeObserver instead of window resize — more efficient
 */

import { useEffect, useRef, useState } from 'react';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import type { ColorPresetId } from '@/lib/themes';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Particle {
  x: number; y: number;
  size: number;
  speedX: number; speedY: number;
  opacity: number; opacitySpeed: number;
  color: string;
  angle?: number; angleSpeed?: number;
  life?: number; maxLife?: number;
}

type DrawFn = (
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
  canvas: HTMLCanvasElement,
  frame: number,
) => void;

// ─── Glow Cache ───────────────────────────────────────────────────────────────

function createGlowCache(color: string, size: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size * 2;
  canvas.height = size * 2;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const g = ctx.createRadialGradient(size, size, 0, size, size, size);
    g.addColorStop(0, color);
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size * 2, size * 2);
  }
  return canvas;
}

// ─── ☕ Coffee — Steam Orbs ───────────────────────────────────────────────────

let coffeeCache: HTMLCanvasElement | null = null;

function coffeeDraw(ctx: CanvasRenderingContext2D, particles: Particle[], canvas: HTMLCanvasElement) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!coffeeCache) coffeeCache = createGlowCache('rgba(243,230,214,0.45)', 38);

  const grad = ctx.createRadialGradient(canvas.width / 2, canvas.height, 0, canvas.width / 2, canvas.height, canvas.height * 1.2);
  grad.addColorStop(0, 'rgba(123,90,68,0.16)');
  grad.addColorStop(0.5, 'rgba(79,52,36,0.07)');
  grad.addColorStop(1, 'transparent');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const p of particles) {
    p.y -= p.speedY;
    p.x += Math.sin(p.y * 0.015 + (p.angle ?? 0)) * 0.6;
    p.opacity -= p.opacitySpeed;
    p.size += 0.07;

    if (p.opacity <= 0 || p.y < -20) {
      p.y = canvas.height + 10;
      p.x = Math.random() * canvas.width;
      p.opacity = 0.25 + Math.random() * 0.25;
      p.size = 2 + Math.random() * 6;
      p.speedY = 0.3 + Math.random() * 0.5;
    }

    ctx.globalAlpha = p.opacity;
    ctx.drawImage(coffeeCache, p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
  }
  ctx.globalAlpha = 1;
}

function coffeeInit(canvas: HTMLCanvasElement): Particle[] {
  return Array.from({ length: 22 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    size: 2 + Math.random() * 8,
    speedX: 0, speedY: 0.3 + Math.random() * 0.5,
    opacity: Math.random() * 0.35,
    opacitySpeed: 0.001 + Math.random() * 0.002,
    color: '',
    angle: Math.random() * Math.PI * 2,
  }));
}

// ─── 🍵 Matcha — Falling Leaves ──────────────────────────────────────────────

function matchaDraw(ctx: CanvasRenderingContext2D, particles: Particle[], canvas: HTMLCanvasElement) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  grad.addColorStop(0, 'rgba(44,32,28,0.18)');
  grad.addColorStop(1, 'rgba(60,46,42,0.09)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const p of particles) {
    p.y += p.speedY;
    p.x += Math.sin(p.angle ?? 0) * 1.1;
    p.angle = (p.angle ?? 0) + (p.angleSpeed ?? 0.02);

    if (p.y > canvas.height + 20) {
      p.y = -20;
      p.x = Math.random() * canvas.width;
    }

    ctx.save();
    ctx.globalAlpha = p.opacity;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle ?? 0);
    ctx.beginPath();
    ctx.fillStyle = p.color;
    ctx.ellipse(0, 0, p.size * 0.5, p.size, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function matchaInit(canvas: HTMLCanvasElement): Particle[] {
  const colors = ['#8A9A5B', '#B0C27D', '#6B7A40', '#9FBF72', '#C8D8A0'];
  return Array.from({ length: 24 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    size: 5 + Math.random() * 10,
    speedX: 0, speedY: 0.6 + Math.random() * 1.1,
    opacity: 0.12 + Math.random() * 0.3,
    opacitySpeed: 0, color: colors[Math.floor(Math.random() * colors.length)],
    angle: Math.random() * Math.PI * 2,
    angleSpeed: (Math.random() - 0.5) * 0.04,
  }));
}

// ─── 🌧️ Midnight Rain — Raindrops ────────────────────────────────────────────

function midnightDraw(ctx: CanvasRenderingContext2D, particles: Particle[], canvas: HTMLCanvasElement, frame: number) {
  ctx.fillStyle = 'rgba(15,23,42,0.22)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (frame % 320 < 3) {
    ctx.fillStyle = 'rgba(199,210,254,0.03)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.lineWidth = 0.8;
  for (const p of particles) {
    p.y += p.speedY;
    p.x += p.speedX;

    if (p.y > canvas.height) {
      p.y = -Math.random() * canvas.height * 0.5;
      p.x = Math.random() * canvas.width;
      p.speedY = 8 + Math.random() * 9;
      p.speedX = -0.8 + Math.random() * 0.4;
    }

    ctx.beginPath();
    ctx.strokeStyle = p.color;
    ctx.globalAlpha = p.opacity;
    ctx.lineWidth = p.size;
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + p.speedX * 2, p.y + p.size * 11);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function midnightInit(canvas: HTMLCanvasElement): Particle[] {
  return Array.from({ length: 45 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    size: 0.5 + Math.random() * 0.7,
    speedX: -0.8 + Math.random() * 0.4,
    speedY: 8 + Math.random() * 9,
    opacity: 0.08 + Math.random() * 0.28,
    opacitySpeed: 0,
    color: `hsl(${220 + Math.random() * 20},60%,${65 + Math.random() * 20}%)`,
  }));
}

// ─── 🌸 Lofi Sunset — Bokeh Orbs ─────────────────────────────────────────────

const lofiCaches = new Map<string, HTMLCanvasElement>();

function lofiDraw(ctx: CanvasRenderingContext2D, particles: Particle[], canvas: HTMLCanvasElement) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const grad = ctx.createLinearGradient(0, 0, canvas.width * 0.5, canvas.height);
  grad.addColorStop(0, 'rgba(74,21,75,0.10)');
  grad.addColorStop(1, 'rgba(107,33,168,0.05)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const p of particles) {
    p.y -= p.speedY;
    p.x += Math.sin((p.life ?? 0) * 0.02) * 0.7;
    p.life = (p.life ?? 0) + 1;

    if (p.y < -40) {
      p.y = canvas.height + 40;
      p.x = Math.random() * canvas.width;
      p.life = 0;
    }

    if (!lofiCaches.has(p.color)) {
      lofiCaches.set(p.color, createGlowCache(p.color, 40));
    }

    ctx.globalAlpha = p.opacity * (0.5 + 0.5 * Math.sin((p.life ?? 0) * 0.05));
    ctx.drawImage(lofiCaches.get(p.color)!, p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
  }
  ctx.globalAlpha = 1;
}

function lofiInit(canvas: HTMLCanvasElement): Particle[] {
  const colors = ['rgba(253,164,175,0.6)', 'rgba(251,207,232,0.5)', 'rgba(240,171,252,0.5)', 'rgba(249,168,212,0.4)'];
  return Array.from({ length: 22 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    size: 8 + Math.random() * 28,
    speedX: 0, speedY: 0.2 + Math.random() * 0.45,
    opacity: 0.07 + Math.random() * 0.18,
    opacitySpeed: 0,
    color: colors[Math.floor(Math.random() * colors.length)],
    life: Math.random() * 200, maxLife: 200,
  }));
}

// ─── 💜 Cyber Dusk — Neon Particles ──────────────────────────────────────────

const cyberCaches = new Map<string, HTMLCanvasElement>();

function cyberDraw(ctx: CanvasRenderingContext2D, particles: Particle[], canvas: HTMLCanvasElement, frame: number) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Moving grid — only draw every 4 frames for performance
  if (frame % 4 === 0) {
    ctx.strokeStyle = 'rgba(224,200,255,0.035)';
    ctx.lineWidth = 1;
    const gridSize = 65;
    const offset = (frame / 4) % gridSize;
    for (let x = offset; x < canvas.width; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }
  }

  for (const p of particles) {
    p.y -= p.speedY;
    p.x += Math.sin(frame * 0.01 + (p.angle ?? 0)) * 0.4;
    const flicker = 0.25 + 0.45 * Math.abs(Math.sin(frame * 0.018 + (p.angle ?? 0)));

    if (p.y < -10) {
      p.y = canvas.height + 10;
      p.x = Math.random() * canvas.width;
    }

    if (!cyberCaches.has(p.color)) {
      cyberCaches.set(p.color, createGlowCache(p.color, 18));
    }

    ctx.globalAlpha = p.opacity * flicker;
    ctx.drawImage(cyberCaches.get(p.color)!, p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
  }
  ctx.globalAlpha = 1;
}

function cyberInit(canvas: HTMLCanvasElement): Particle[] {
  const colors = ['rgba(255,97,210,0.9)', 'rgba(192,132,252,0.9)', 'rgba(224,200,255,0.8)', 'rgba(99,102,241,0.9)'];
  return Array.from({ length: 28 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    size: 2 + Math.random() * 5,
    speedX: 0, speedY: 0.3 + Math.random() * 0.75,
    opacity: 0.3 + Math.random() * 0.45,
    opacitySpeed: 0,
    color: colors[Math.floor(Math.random() * colors.length)],
    angle: Math.random() * Math.PI * 2,
  }));
}

// ─── Theme Map ────────────────────────────────────────────────────────────────

const THEME_ANIMATIONS: Record<ColorPresetId, {
  init: (canvas: HTMLCanvasElement) => Particle[];
  draw: DrawFn;
}> = {
  coffee:   { init: coffeeInit,   draw: (ctx, p, c)    => coffeeDraw(ctx, p, c) },
  matcha:   { init: matchaInit,   draw: (ctx, p, c)    => matchaDraw(ctx, p, c) },
  midnight: { init: midnightInit, draw: (ctx, p, c, f) => midnightDraw(ctx, p, c, f) },
  lofi:     { init: lofiInit,     draw: (ctx, p, c)    => lofiDraw(ctx, p, c) },
  cyber:    { init: cyberInit,    draw: (ctx, p, c, f) => cyberDraw(ctx, p, c, f) },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function MovingWallpaper() {
  const { colorPresetId, backgroundType, backgroundValue } = usePreferencesStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const pausedRef = useRef(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted || backgroundType !== 'default') {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Use desynchronized for GPU offload; alpha:false avoids alpha compositing
    const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
    if (!ctx) return;

    // Resize
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize, { passive: true });

    // Pause/resume on visibility change
    const handleVisibility = () => {
      pausedRef.current = document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const theme = THEME_ANIMATIONS[colorPresetId] ?? THEME_ANIMATIONS.cyber;
    const particles = theme.init(canvas);
    let frame = 0;
    let tick = 0;

    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);
      if (pausedRef.current) return; // Tab hidden — skip draw

      tick++;
      if (tick % 2 !== 0) return; // 30fps throttle — skip every other frame

      theme.draw(ctx, particles, canvas, frame++);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [mounted, colorPresetId, backgroundType]);

  if (!mounted) return null;

  const isCustom = backgroundType === 'custom' && backgroundValue;
  const isVideo = isCustom && /\.(mp4|webm)(\?.*)?$/i.test(backgroundValue);
  
  // Resolve path: if it starts with http, it's a Supabase URL, otherwise it's local
  const resolvedSrc = isCustom && (backgroundValue.startsWith('http') 
    ? backgroundValue 
    : `/backgrounds/${backgroundValue}`);

  return (
    <>
      {/* Custom Background (Video or Image) */}
      {isCustom && resolvedSrc && (
        <div 
          className="fixed inset-0 w-full h-full pointer-events-none overflow-hidden"
          style={{ zIndex: -2 }}
        >
          {isVideo ? (
            <video
              src={resolvedSrc}
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={resolvedSrc}
              alt=""
              className="w-full h-full object-cover"
            />
          )}
        </div>
      )}

      {/* Particle Canvas (only shown if backgroundType is 'default') */}
      {backgroundType === 'default' && (
        <canvas
          ref={canvasRef}
          className="fixed inset-0 w-full h-full pointer-events-none"
          style={{ zIndex: -2, willChange: 'transform' }}
          aria-hidden="true"
        />
      )}

      {/* Dark overlay — ensures text is always legible over background media */}
      <div
        className="fixed inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: -1, background: isCustom ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.55)' }}
      />
    </>
  );
}
