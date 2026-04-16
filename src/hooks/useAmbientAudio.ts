'use client';

/**
 * useAmbientAudio — manages the AmbientSoundEngine lifecycle.
 *
 * v2 — fixes:
 *  - Visibility-change recovery: resumes AudioContext when tab regains focus.
 *  - Toggle guard: prevents double-play/stop on rapid clicks.
 *  - Engine state is source of truth via engine.isPlaying() check.
 */
import { useCallback, useEffect } from 'react';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AmbientSoundEngine } from '@/lib/audioEngine';

export function useAmbientAudio() {
  const { sounds, toggleSound, setSoundVolume, setSoundLoading } = usePreferencesStore();

  const getEngine = () => AmbientSoundEngine.getInstance();

  // ── Resume AudioContext when user returns to tab ─────────────────────────
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        getEngine().resumeContext();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Toggle ───────────────────────────────────────────────────────────────
  const handleToggle = useCallback(
    async (id: string) => {
      const engine = getEngine();
      const current = sounds[id] || { isPlaying: false, volume: 0.5 };

      if (current.isPlaying) {
        // Update Zustand immediately (so UI is snappy)
        toggleSound(id);
        // Then fade out audio
        engine.stop(id);
      } else {
        // Mark loading
        setSoundLoading(id, true);
        try {
          await engine.play(id, current.volume ?? 0.5);
          // Only mark as playing if engine confirms it worked
          if (engine.isPlaying(id)) {
            toggleSound(id);
          }
        } catch (err) {
          console.error(`[useAmbientAudio] Failed to play "${id}":`, err);
        } finally {
          setSoundLoading(id, false);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sounds, toggleSound, setSoundLoading],
  );

  // ── Volume ───────────────────────────────────────────────────────────────
  const handleVolumeChange = useCallback(
    (id: string, volume: number) => {
      setSoundVolume(id, volume);
      if (sounds[id]?.isPlaying) {
        getEngine().setVolume(id, volume);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sounds, setSoundVolume],
  );

  const isSupported =
    typeof window !== 'undefined'
      ? AmbientSoundEngine.getInstance().isSupported()
      : false;

  const anyPlaying = Object.values(sounds).some((s) => s.isPlaying);

  return { sounds, handleToggle, handleVolumeChange, isSupported, anyPlaying };
}
