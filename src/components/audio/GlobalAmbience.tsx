'use client';

/**
 * GlobalAmbience — floating ambient audio dock.
 *
 * v3 UI fixes:
 * - Volume bar visible directly under every active button (no more right-click only)
 * - Loading spinner on dock buttons while sound loads
 * - Volume popup on right-click kept for precise control
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Music, X, VolumeX, Loader2 } from 'lucide-react';
import { useAmbientAudio } from '@/hooks/useAmbientAudio';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AmbientSoundEngine } from '@/lib/audioEngine';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getEmojiFromName(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('rain')) return '🌧️';
  if (n.includes('fire') || n.includes('burn')) return '🔥';
  if (n.includes('wind') || n.includes('breeze')) return '🌬️';
  if (n.includes('coffee') || n.includes('cafe')) return '☕';
  if (n.includes('lofi') || n.includes('music')) return '🎵';
  if (n.includes('nature') || n.includes('forest')) return '🌿';
  if (n.includes('bird')) return '🐦';
  if (n.includes('wave') || n.includes('sea') || n.includes('ocean')) return '🌊';
  if (n.includes('storm') || n.includes('thunder')) return '⚡';
  if (n.includes('piano')) return '🎹';
  if (n.includes('guitar')) return '🎸';
  if (n.includes('jazz')) return '🎷';
  if (n.includes('night') || n.includes('moon')) return '🌙';
  if (n.includes('train')) return '🚂';
  if (n.includes('clock') || n.includes('tick')) return '⏰';
  if (n.includes('library') || n.includes('book')) return '📚';
  return '🎵';
}

function getAccent(name: string) {
  const n = name.toLowerCase();
  if (n.includes('rain')) return { color: '#60a5fa', glow: 'rgba(96,165,250,0.55)' };
  if (n.includes('fire')) return { color: '#fb923c', glow: 'rgba(251,146,60,0.55)' };
  if (n.includes('wind')) return { color: '#93c5fd', glow: 'rgba(147,197,253,0.55)' };
  if (n.includes('coffee')) return { color: '#f59e0b', glow: 'rgba(245,158,11,0.55)' };
  if (n.includes('lofi')) return { color: '#c084fc', glow: 'rgba(192,132,252,0.55)' };
  if (n.includes('nature')) return { color: '#4ade80', glow: 'rgba(74,222,128,0.55)' };
  return { color: '#34d399', glow: 'rgba(52,211,153,0.55)' };
}

// Mini animated waveform for the toggle button
function DockWaveform() {
  return (
    <span className="flex items-end gap-[2px] h-4" aria-hidden="true">
      {[0.5, 1, 0.7, 0.9, 0.4].map((h, i) => (
        <span
          key={i}
          style={{
            display: 'block', width: '3px', borderRadius: '2px',
            backgroundColor: 'currentColor',
            animation: `soundWave 0.7s ${i * 0.1}s ease-in-out infinite alternate`,
            height: `${h * 100}%`,
          }}
        />
      ))}
    </span>
  );
}

const BUILTIN_IDS = ['wind', 'fire', 'rain', 'coffee', 'lofi', 'nature'] as const;

// ─── Main Component ────────────────────────────────────────────────────────────

export function GlobalAmbience() {
  const { t } = useTranslation('common');
  const [expanded, setExpanded] = useState(false);
  const { sounds, handleToggle, handleVolumeChange, anyPlaying } = useAmbientAudio();
  const { customSoundIds, setCustomSoundIds, sounds: soundsState, toggleSound, showFloatingAudioDock } = usePreferencesStore();
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Drag Logic (Direct DOM manipulation for 60fps smoothness) ──
  const dockRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({
    startX: 0, startY: 0,
    currX: 0, currY: 0,
    isDragging: false,
    draggedDistance: 0,
  });

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return; // Only left click
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      ...dragRef.current,
      startX: e.clientX,
      startY: e.clientY,
      isDragging: true,
      draggedDistance: 0,
    };
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current.isDragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    dragRef.current.draggedDistance = Math.sqrt(dx * dx + dy * dy);
    
    if (dockRef.current) {
      dockRef.current.style.transform = `translate(${dragRef.current.currX + dx}px, ${dragRef.current.currY + dy}px)`;
    }
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current.isDragging) return;
    dragRef.current.isDragging = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
    
    dragRef.current.currX += e.clientX - dragRef.current.startX;
    dragRef.current.currY += e.clientY - dragRef.current.startY;
  }, []);

  const handleToggleClick = useCallback((e: React.MouseEvent) => {
    if (dragRef.current.draggedDistance >= 5) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    setExpanded((p) => !p);
  }, []);

  useKeyboardShortcuts(() => setExpanded((p) => !p));

  useEffect(() => () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current); }, []);

  // Stop All
  const handleStopAll = useCallback(() => {
    AmbientSoundEngine.getInstance().stopAll();
    Object.keys(soundsState).forEach((id) => {
      if (soundsState[id]?.isPlaying) toggleSound(id);
    });
  }, [soundsState, toggleSound]);

  // Sync custom sounds on mount — preloading happens in AudioPreloader
  useEffect(() => {
    fetch('/api/audio/list')
      .then((r) => r.json())
      .then((data) => { if (data.files) setCustomSoundIds(data.files); })
      .catch(() => {/* silent */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!showFloatingAudioDock) return null;

  const allSoundIds = [
    ...BUILTIN_IDS,
    ...customSoundIds.filter(
      (f) => !BUILTIN_IDS.some((id) => f.toLowerCase().startsWith(id)),
    ),
  ];

  return (
    <div
      ref={dockRef}
      className="fixed bottom-[112px] sm:bottom-8 end-4 sm:end-8 z-[var(--z-sidebar)] pointer-events-none flex justify-end"
      style={{ willChange: 'transform' }}
    >
      <div
        className={`
          flex items-center pointer-events-auto
          border border-white/10 shadow-2xl
          transition-all duration-300 ease-out
          ${expanded ? 'rounded-3xl gap-3 px-5 py-4 scale-100' : 'rounded-full gap-0 p-[10px] sm:p-2 scale-95 opacity-90'}
        `}
        style={{
          background: 'rgba(8,8,18,0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >

        {/* ── Stop All ──────────────────────────────────────────────────────── */}
        {expanded && anyPlaying && (
          <button
            onClick={handleStopAll}
            title="Stop all sounds"
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-red-500/12 text-red-400 hover:bg-red-500/22 transition-all border border-red-500/20 shrink-0 self-center animate-in zoom-in-75 duration-150 ms-2"
          >
            <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        )}

        {/* ── Sound Buttons Row ─────────────────────────────────────────────── */}
        <div
          className={`
            flex items-center gap-4 sm:gap-5 overflow-x-auto overflow-y-hidden no-scrollbar
            transition-all duration-300 ease-out
            ${expanded ? 'max-w-[70vw] sm:max-w-[85vw] opacity-100 px-3 pt-3 pb-1' : 'max-w-0 opacity-0 pointer-events-none'}
          `}
        >
          {allSoundIds.map((id) => {
            const isPlaying = sounds[id]?.isPlaying ?? false;
            const isLoading = sounds[id]?.isLoading ?? false;
            const volume = sounds[id]?.volume ?? 0.5;
            const { color, glow } = getAccent(id);
            const label = id.replace(/\.[^.]+$/, '').toUpperCase().slice(0, 6);

            return (
              <div key={id} className="flex flex-col items-center gap-2 shrink-0 pb-1" style={{ minWidth: '64px' }}>
                {/* Sound button — Circular and elegant */}
                <button
                  onClick={() => { if (!isLoading) handleToggle(id); }}
                  title={id}
                  className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-3xl transition-all duration-200 hover:scale-110 active:scale-95 border"
                  style={{
                    background: isPlaying
                      ? `radial-gradient(circle at 40% 35%, ${color}20 0%, ${color}05 100%)`
                      : 'transparent',
                    borderColor: isPlaying ? `${color}50` : 'transparent',
                    boxShadow: isPlaying ? `0 0 12px ${glow}, 0 0 0 1px ${color}30, inset 0 1px 0 rgba(255,255,255,0.08)` : 'none',
                    filter: isLoading ? 'none' : isPlaying ? 'none' : 'grayscale(0.6) opacity(0.55)',
                    cursor: isLoading ? 'wait' : 'pointer',
                  }}
                >
                  {/* Loading spinner overlay */}
                  {isLoading && (
                    <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
                      <Loader2
                        size={26}
                        className="animate-spin"
                        style={{ color }}
                      />
                    </span>
                  )}
                  <span style={{ opacity: isLoading ? 0.2 : 1 }}>
                    {getEmojiFromName(id)}
                  </span>
                </button>

                {/* Sound label */}
                <span
                  className="text-[9px] sm:text-[10px] font-bold tracking-widest leading-none mt-1"
                  style={{ color: isPlaying ? color : 'rgba(255,255,255,0.4)' }}
                >
                  {label}
                </span>

                {/* ── Inline Volume Slider (visible when playing) ─────────── */}
                {isPlaying && !isLoading && (
                  <div
                    className="flex flex-col items-center gap-1 animate-in fade-in slide-in-from-top-1 duration-200 mt-1"
                    dir="ltr"
                    style={{ width: '68px' }}
                  >
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.02}
                      value={volume}
                      onChange={(e) => handleVolumeChange(id, parseFloat(e.target.value))}
                      aria-label={`${id} volume`}
                      className="swm-slider cursor-pointer"
                      style={{
                        width: '68px',
                        background: `linear-gradient(to right, ${color} ${volume * 100}%, rgba(255,255,255,0.12) ${volume * 100}%)`,
                        color,
                        height: '5px',
                        accentColor: color,
                      }}
                    />
                    <span
                      className="text-[10px] font-bold tabular-nums leading-none"
                      style={{ color, opacity: 0.8 }}
                    >
                      {Math.round(volume * 100)}%
                    </span>
                  </div>
                )}

                {/* Loading label */}
                {isLoading && (
                  <span
                    className="text-[9px] sm:text-[10px] font-semibold animate-pulse mt-1"
                    style={{ color, opacity: 0.9 }}
                  >
                    {t('audio.loading', { defaultValue: '…' })}
                  </span>
                )}
              </div>
            );
          })}
          {/* Padding inside scroll view */}
          <div className="w-1 shrink-0" />
        </div>

        {/* ── Stop All ──────────────────────────────────────────────────────── */}
        {expanded && anyPlaying && (
          <button
            onClick={handleStopAll}
            title="Stop all sounds"
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-red-500/12 text-red-400 hover:bg-red-500/22 transition-all border border-red-500/20 shrink-0 self-center animate-in zoom-in-75 duration-150 me-2"
          >
            <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        )}

        {/* ── Toggle Button (Anchor on the end edge - DRAGGABLE) ───────────────── */}
        <button
          onClick={handleToggleClick}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={`
            relative w-12 h-12 sm:w-14 sm:h-14 rounded-full flex flex-col items-center justify-center gap-0.5
            transition-colors duration-200 shrink-0 self-center touch-none cursor-move
            ${anyPlaying
              ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
              : 'bg-white/10 text-white/70 hover:bg-white/15 hover:text-white'
            }
          `}
          title={expanded ? 'Close ambient sounds' : 'Drag to move, click to toggle'}
        >
          {expanded ? <X className="w-5 h-5 sm:w-6 sm:h-6" /> : anyPlaying ? <DockWaveform /> : <Music className="w-5 h-5 sm:w-6 sm:h-6" />}
        </button>
      </div>
    </div>
  );
}
