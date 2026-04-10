'use client';

/**
 * AmbientMixer — an interactive 2×3 grid of SoundCards.
 * Shows an animated equalizer in the header when any sound is active.
 */
import { useTranslation } from 'react-i18next';
import { Volume2, VolumeX } from 'lucide-react';
import { useAmbientAudio } from '@/hooks/useAmbientAudio';
import { SoundCard } from './SoundCard';
import type { SoundId } from '@/store/usePreferencesStore';

const SOUND_IDS: SoundId[] = ['wind', 'fire', 'rain', 'coffee', 'lofi', 'nature'];

// ── Equalizer bars (decorative) ────────────────────────────────────────────────
function EqBars() {
  return (
    <span className="flex items-end gap-0.5 h-4" aria-hidden="true">
      {[3, 5, 4, 6, 3].map((h, i) => (
        <span
          key={i}
          className="w-0.5 rounded-full bg-primary"
          style={{
            height: `${h * 2}px`,
            animation: `soundWave 0.7s ${i * 0.12}s ease-in-out infinite alternate`,
          }}
        />
      ))}
    </span>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────
export function AmbientMixer() {
  const { t } = useTranslation('common');
  const { sounds, handleToggle, handleVolumeChange, isSupported, anyPlaying } =
    useAmbientAudio();

  if (!isSupported) {
    return (
      <p className="text-sm text-muted-foreground px-1" role="status">
        {t('audio.notSupported')}
      </p>
    );
  }

  return (
    <section aria-labelledby="mixer-heading">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <h2
            id="mixer-heading"
            className="text-base font-semibold text-foreground"
          >
            {t('settings.ambientSounds')}
          </h2>
          {anyPlaying && <EqBars />}
        </div>
        {anyPlaying ? (
          <Volume2 size={18} className="text-primary shrink-0" aria-hidden="true" />
        ) : (
          <VolumeX size={18} className="text-muted-foreground shrink-0" aria-hidden="true" />
        )}
      </div>

      {/* Sound grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {SOUND_IDS.map((id) => (
          <SoundCard
            key={id}
            id={id}
            isPlaying={sounds[id].isPlaying}
            volume={sounds[id].volume}
            onToggle={() => handleToggle(id)}
            onVolumeChange={(v) => handleVolumeChange(id, v)}
          />
        ))}
      </div>

      {/* Helper text */}
      {!anyPlaying && (
        <p className="text-xs text-muted-foreground mt-4 text-center">
          {t('audio.tapToPlay')}
        </p>
      )}
    </section>
  );
}
