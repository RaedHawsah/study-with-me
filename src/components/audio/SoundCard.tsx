'use client';

/**
 * SoundCard — individual sound control inside the AmbientMixer.
 *
 * Features:
 * - Glowing background when active (sound-specific colour)
 * - Animated pulse dot indicator
 * - Volume slider (always LTR for consistent UX in both locales)
 * - Accessible toggle button with aria-pressed
 */
import { useTranslation } from 'react-i18next';
import type { SoundId } from '@/store/usePreferencesStore';

// ── Metadata per sound ─────────────────────────────────────────────────────────

const SOUND_META: Record<
  SoundId,
  { emoji: string; color: string; glow: string; bg: string }
> = {
  wind:   { emoji: '🌬️', color: '#93c5fd', glow: 'rgba(147,197,253,0.35)', bg: 'rgba(147,197,253,0.08)' },
  fire:   { emoji: '🔥', color: '#fb923c', glow: 'rgba(251,146, 60,0.35)', bg: 'rgba(251,146, 60,0.08)' },
  rain:   { emoji: '🌧️', color: '#60a5fa', glow: 'rgba( 96,165,250,0.35)', bg: 'rgba( 96,165,250,0.08)' },
  coffee: { emoji: '☕', color: '#d97706', glow: 'rgba(217,119,  6,0.35)', bg: 'rgba(217,119,  6,0.08)' },
  lofi:   { emoji: '🎵', color: '#a78bfa', glow: 'rgba(167,139,250,0.35)', bg: 'rgba(167,139,250,0.08)' },
  nature: { emoji: '🌿', color: '#4ade80', glow: 'rgba( 74,222,128,0.35)', bg: 'rgba( 74,222,128,0.08)' },
};

// ── Props ──────────────────────────────────────────────────────────────────────

interface SoundCardProps {
  id: SoundId;
  isPlaying: boolean;
  volume: number;
  onToggle: () => void;
  onVolumeChange: (v: number) => void;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function SoundCard({ id, isPlaying, volume, onToggle, onVolumeChange }: SoundCardProps) {
  const { t } = useTranslation('common');
  const meta = SOUND_META[id];
  const label = t(`audio.${id}`);

  return (
    <article
      aria-label={label}
      className="
        relative flex flex-col items-center gap-3.5 p-4
        rounded-2xl border
        transition-all duration-300
      "
      style={{
        background: isPlaying ? meta.bg : 'var(--card)',
        borderColor: isPlaying ? `${meta.color}55` : 'var(--border)',
        boxShadow: isPlaying
          ? `0 0 28px ${meta.glow}, 0 4px 16px rgba(0,0,0,0.07)`
          : 'var(--shadow-xs)',
      }}
    >
      {/* Live indicator */}
      {isPlaying && (
        <span
          aria-hidden="true"
          className="absolute top-2.5 end-2.5 w-2 h-2 rounded-full animate-pulse"
          style={{ backgroundColor: meta.color }}
        />
      )}

      {/* Emoji toggle button */}
      <button
        id={`sound-toggle-${id}`}
        onClick={onToggle}
        aria-pressed={isPlaying}
        aria-label={`${isPlaying ? t('audio.stop') : t('audio.play')} ${label}`}
        className="
          flex items-center justify-center
          w-14 h-14 rounded-full text-2xl
          transition-all duration-200
          hover:scale-110 active:scale-95
          focus-visible:outline-none focus-visible:ring-2
        "
        style={{
          background: isPlaying
            ? `radial-gradient(circle, ${meta.color}25 0%, ${meta.color}10 100%)`
            : 'var(--muted)',
          boxShadow: isPlaying ? `0 0 18px ${meta.glow}` : 'none',
          opacity: isPlaying ? 1 : 0.65,
          transform: isPlaying ? 'scale(1.06)' : 'scale(1)',
        }}
      >
        {meta.emoji}
      </button>

      {/* Label */}
      <span
        className="text-xs font-semibold tracking-wide uppercase"
        style={{ color: isPlaying ? meta.color : 'var(--muted-foreground)' }}
      >
        {label}
      </span>

      {/* Volume slider — direction: ltr so it's always left=quiet, right=loud */}
      <div className="w-full px-0.5" dir="ltr">
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
          disabled={!isPlaying}
          aria-label={`${label} volume`}
          className="swm-slider w-full"
          style={{
            // Filled track via background gradient
            background: isPlaying
              ? `linear-gradient(to right, ${meta.color} ${volume * 100}%, var(--border) ${volume * 100}%)`
              : 'var(--border)',
            // Thumb colour matches sound accent
            color: meta.color,
          }}
        />
      </div>
    </article>
  );
}
