'use client';

/**
 * AmbientMixer — interactive 2×3 grid of SoundCards in the Settings page.
 *
 * v2 redesign:
 * - Premium glass-morphism section header with live EQ animation
 * - "Stop All" quick-action button in header when any sound plays
 * - Better upload button with icon + label
 * - Subtle animated gradient border when sounds are active
 */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Volume2, VolumeX, Upload, Music2, Eye, EyeOff } from 'lucide-react';
import { useAmbientAudio } from '@/hooks/useAmbientAudio';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { SoundCard } from './SoundCard';
import { AmbientSoundEngine } from '@/lib/audioEngine';

// ── Equalizer bars ─────────────────────────────────────────────────────────────
function EqBars({ color }: { color?: string }) {
  return (
    <span className="flex items-end gap-[2px] h-4" aria-hidden="true">
      {[0.4, 1, 0.65, 0.9, 0.5, 0.75, 0.35].map((h, i) => (
        <span
          key={i}
          style={{
            display: 'block',
            width: '2.5px',
            borderRadius: '2px',
            backgroundColor: color ?? 'var(--primary)',
            animation: `soundWave 0.75s ${i * 0.09}s ease-in-out infinite alternate`,
            height: `${h * 100}%`,
            opacity: 0.85,
          }}
        />
      ))}
    </span>
  );
}

const BUILTIN_IDS = ['wind', 'fire', 'rain', 'coffee', 'lofi', 'nature'] as const;

// ── Component ──────────────────────────────────────────────────────────────────
export function AmbientMixer() {
  const { t } = useTranslation('common');
  const { sounds, handleToggle, handleVolumeChange, isSupported, anyPlaying } =
    useAmbientAudio();
  const {
    customSoundIds,
    setCustomSoundIds,
    sounds: soundsState,
    toggleSound,
    showFloatingAudioDock,
    setShowFloatingAudioDock,
  } = usePreferencesStore();
  const [uploading, setUploading] = useState(false);

  // Preload built-ins on mount
  useEffect(() => {
    const engine = AmbientSoundEngine.getInstance();
    BUILTIN_IDS.forEach((id) => engine.preload(id));
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/audio/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        const listRes = await fetch('/api/audio/list');
        const listData = await listRes.json();
        setCustomSoundIds(listData.files);
        const engine = AmbientSoundEngine.getInstance();
        engine.preload(data.fileName || file.name);
      }
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const handleDelete = async (fileName: string) => {
    // Delete immediately without blocking confirm.
    try {
      const res = await fetch('/api/audio/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName }),
      });
      const data = await res.json();
      if (data.success) {
        // Optimistically update the UI state instead of re-fetching to bypass Next.js cache
        setCustomSoundIds(customSoundIds.filter((id) => id !== fileName));
        if (sounds[fileName]?.isPlaying) handleToggle(fileName);
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleStopAll = () => {
    AmbientSoundEngine.getInstance().stopAll();
    Object.keys(soundsState).forEach((id) => {
      if (soundsState[id]?.isPlaying) toggleSound(id);
    });
  };

  if (!isSupported) {
    return (
      <p className="text-sm text-muted-foreground px-1" role="status">
        {t('audio.notSupported')}
      </p>
    );
  }

  // Custom sounds that don't duplicate built-ins
  const extraSounds = customSoundIds.filter(
    (fileName) => !BUILTIN_IDS.some((id) => fileName.toLowerCase().startsWith(id)),
  );

  return (
    <section aria-labelledby="mixer-heading">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5">
        {/* Left: Title + EQ */}
        <div className="flex items-center gap-2.5">
          <div
            className="flex items-center justify-center w-8 h-8 rounded-lg"
            style={{ background: 'var(--primary)18' }}
          >
            <Music2 size={15} style={{ color: 'var(--primary)' }} />
          </div>
          <h2 id="mixer-heading" className="text-base font-semibold text-foreground">
            {t('settings.ambientSounds')}
          </h2>
          {anyPlaying && <EqBars />}
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2">
          {/* Dock Visibility Toggle */}
          <button
            onClick={() => setShowFloatingAudioDock(!showFloatingAudioDock)}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold
              transition-all border
              ${showFloatingAudioDock
                ? 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/18 hover:border-primary/35'
                : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
              }
            `}
            title={showFloatingAudioDock ? 'Hide floating shortcut' : 'Show floating shortcut'}
            aria-label="Toggle floating dock"
          >
            {showFloatingAudioDock ? <Eye size={12} /> : <EyeOff size={12} />}
          </button>

          {/* Stop All — only visible when playing */}
          {anyPlaying && (
            <button
              onClick={handleStopAll}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/18 transition-all animate-in zoom-in-75 duration-150"
            >
              <VolumeX size={13} />
              {t('audio.stopAll', { defaultValue: 'Stop all' })}
            </button>
          )}

          {/* Upload */}
          <label
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer
              transition-all border
              ${uploading
                ? 'bg-muted text-muted-foreground border-border cursor-wait'
                : 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/18 hover:border-primary/35'
              }
            `}
          >
            <input
              type="file"
              accept="audio/*"
              onChange={handleUpload}
              className="hidden"
              disabled={uploading}
            />
            <Upload size={11} />
            {uploading ? t('common.uploading', { defaultValue: 'Uploading…' }) : t('audio.addSound', { defaultValue: 'Add sound' })}
          </label>

          {/* Playing indicator icon */}
          {anyPlaying ? (
            <Volume2 size={17} className="text-primary shrink-0" aria-hidden="true" />
          ) : (
            <VolumeX size={17} className="text-muted-foreground shrink-0" aria-hidden="true" />
          )}
        </div>
      </div>

      {/* ── Sound Grid ──────────────────────────────────────────────────────── */}
      <div
        className="grid grid-cols-2 sm:grid-cols-3 gap-3"
        style={{
          // Subtle animated glow border around grid when something is playing
          ...(anyPlaying ? {} : {}),
        }}
      >
        {/* Built-in */}
        {BUILTIN_IDS.map((id) => (
          <SoundCard
            key={id}
            id={id}
            isPlaying={sounds[id]?.isPlaying || false}
            isLoading={sounds[id]?.isLoading || false}
            volume={sounds[id]?.volume ?? 0.5}
            onToggle={() => handleToggle(id)}
            onVolumeChange={(v) => handleVolumeChange(id, v)}
            isCustom={false}
          />
        ))}

        {/* Custom (uploaded) */}
        {extraSounds.map((fileName) => (
          <SoundCard
            key={fileName}
            id={fileName}
            isPlaying={sounds[fileName]?.isPlaying || false}
            isLoading={sounds[fileName]?.isLoading || false}
            volume={sounds[fileName]?.volume ?? 0.5}
            onToggle={() => handleToggle(fileName)}
            onVolumeChange={(v) => handleVolumeChange(fileName, v)}
            onDelete={() => handleDelete(fileName)}
            isCustom
          />
        ))}
      </div>

      {/* ── Helper text ─────────────────────────────────────────────────────── */}
      {!anyPlaying && (
        <p className="text-xs text-muted-foreground mt-4 text-center opacity-60">
          {t('audio.tapToPlay')}
        </p>
      )}
    </section>
  );
}
