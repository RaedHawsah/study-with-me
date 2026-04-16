'use client';

/**
 * SoundCard — individual sound control inside the AmbientMixer.
 *
 * v2 — redesign:
 * - Animated waveform bars (3-bar CSS animation) when active
 * - Always-visible volume slider on active cards
 * - Glow ring around emoji button
 * - Cleaner typography and layout
 */
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';

// ─── Emoji / Style helpers ─────────────────────────────────────────────────────

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

function getStylesFromName(name: string) {
  const n = name.toLowerCase();
  if (n.includes('rain'))   return { color: '#60a5fa', glow: 'rgba(96,165,250,0.4)',  bg: 'rgba(96,165,250,0.07)'  };
  if (n.includes('fire'))   return { color: '#fb923c', glow: 'rgba(251,146,60,0.4)',  bg: 'rgba(251,146,60,0.07)'  };
  if (n.includes('wind'))   return { color: '#93c5fd', glow: 'rgba(147,197,253,0.4)', bg: 'rgba(147,197,253,0.07)' };
  if (n.includes('coffee')) return { color: '#f59e0b', glow: 'rgba(245,158,11,0.4)',  bg: 'rgba(245,158,11,0.07)'  };
  if (n.includes('lofi'))   return { color: '#c084fc', glow: 'rgba(192,132,252,0.4)', bg: 'rgba(192,132,252,0.07)' };
  if (n.includes('nature')) return { color: '#4ade80', glow: 'rgba(74,222,128,0.4)',  bg: 'rgba(74,222,128,0.07)'  };
  return { color: '#34d399', glow: 'rgba(52,211,153,0.4)', bg: 'rgba(52,211,153,0.05)' };
}

// ─── Animated Waveform Bars ────────────────────────────────────────────────────

function WaveformBars({ color }: { color: string }) {
  return (
    <span className="flex items-end gap-[2px] h-3" aria-hidden="true">
      {[0.4, 1, 0.6, 0.9, 0.5].map((h, i) => (
        <span
          key={i}
          style={{
            display: 'block',
            width: '2px',
            borderRadius: '2px',
            backgroundColor: color,
            animation: `soundWave 0.8s ${i * 0.12}s ease-in-out infinite alternate`,
            height: `${h * 100}%`,
          }}
        />
      ))}
    </span>
  );
}

// ─── Props ─────────────────────────────────────────────────────────────────────

interface SoundCardProps {
  id: string;
  isPlaying: boolean;
  isLoading?: boolean;
  volume: number;
  onToggle: () => void;
  onVolumeChange: (v: number) => void;
  onDelete?: () => void;
  isCustom?: boolean;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function SoundCard({
  id,
  isPlaying,
  isLoading,
  volume,
  onToggle,
  onVolumeChange,
  onDelete,
  isCustom,
}: SoundCardProps) {
  const { t } = useTranslation('common');
  const styles = getStylesFromName(id);
  const emoji = getEmojiFromName(id);
  const label = isCustom ? id.replace(/\.[^.]+$/, '') : t(`audio.${id}`);

  return (
    <article
      aria-label={label}
      style={{
        background: isPlaying
          ? `linear-gradient(145deg, ${styles.bg}, rgba(255,255,255,0.02))`
          : 'var(--card)',
        borderColor: isPlaying ? `${styles.color}50` : 'var(--border)',
        boxShadow: isPlaying
          ? `0 0 24px ${styles.glow}, 0 4px 16px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.08)`
          : 'var(--shadow-xs)',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      className="relative flex flex-col items-center gap-3 p-4 rounded-2xl border group"
    >
      {/* Delete button — always visible for custom sounds */}
      {isCustom && onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="absolute top-2 start-2 p-1 rounded-full bg-red-500/15 text-red-400 hover:bg-red-500/30 hover:text-red-300 transition-all hover:scale-110 active:scale-90 border border-red-500/25"
          title={t('common.delete', { defaultValue: 'Delete' })}
        >
          <Trash2 size={11} />
        </button>
      )}

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/30 backdrop-blur-[2px] rounded-2xl">
          <div
            className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: `${styles.color}40`, borderTopColor: styles.color }}
          />
        </div>
      )}

      {/* Emoji toggle button with glow ring */}
      <div className="relative">
        {/* Outer glow ring — only when playing */}
        {isPlaying && (
          <div
            className="absolute inset-0 rounded-full animate-ping"
            style={{
              backgroundColor: styles.color,
              opacity: 0.15,
              animationDuration: '2s',
            }}
          />
        )}
        <button
          id={`sound-toggle-${id}`}
          onClick={onToggle}
          disabled={isLoading}
          aria-pressed={isPlaying}
          aria-label={`${isPlaying ? t('audio.stop') : t('audio.play')} ${label}`}
          className="relative flex items-center justify-center w-14 h-14 rounded-full text-2xl transition-all duration-200 hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 disabled:cursor-wait"
          style={{
            background: isPlaying
              ? `radial-gradient(circle at 40% 35%, ${styles.color}30 0%, ${styles.color}10 100%)`
              : 'var(--muted)',
            boxShadow: isPlaying
              ? `0 0 20px ${styles.glow}, 0 0 0 2px ${styles.color}35`
              : 'none',
            opacity: isLoading ? 0.6 : 1,
          }}
        >
          {emoji}
        </button>
      </div>

      {/* Label + waveform indicator */}
      <div className="flex items-center gap-1.5">
        <span
          className="text-[11px] font-bold tracking-widest uppercase truncate max-w-[70px]"
          style={{ color: isPlaying ? styles.color : 'var(--muted-foreground)' }}
        >
          {label}
        </span>
        {isPlaying && <WaveformBars color={styles.color} />}
      </div>

      {/* Volume slider — always visible when playing */}
      <div
        className="w-full px-0.5 transition-all duration-300"
        style={{
          opacity: isPlaying ? 1 : 0,
          maxHeight: isPlaying ? '28px' : '0px',
          overflow: 'hidden',
        }}
        dir="ltr"
      >
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
          disabled={!isPlaying || isLoading}
          aria-label={`${label} volume`}
          className="swm-slider w-full cursor-pointer"
          style={{
            background: isPlaying
              ? `linear-gradient(to right, ${styles.color} ${volume * 100}%, rgba(255,255,255,0.1) ${volume * 100}%)`
              : 'rgba(255,255,255,0.1)',
            color: styles.color,
          }}
        />
      </div>
    </article>
  );
}
