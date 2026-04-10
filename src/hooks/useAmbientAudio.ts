'use client';

/**
 * useAmbientAudio — manages the AmbientSoundEngine lifecycle.
 *
 * Creates the engine on first mount, syncs Zustand toggles to audio playback,
 * and tears down all audio on unmount so renders stay clean.
 */
import { useCallback, useEffect, useRef } from 'react';
import { usePreferencesStore, type SoundId } from '@/store/usePreferencesStore';
import { AmbientSoundEngine } from '@/lib/audioEngine';

export function useAmbientAudio() {
  const { sounds, toggleSound, setSoundVolume } = usePreferencesStore();
  const engineRef = useRef<AmbientSoundEngine | null>(null);

  // Lazy-create engine (browser-only)
  function getEngine(): AmbientSoundEngine {
    if (!engineRef.current) {
      engineRef.current = new AmbientSoundEngine();
    }
    return engineRef.current;
  }

  // Stop all audio on unmount
  useEffect(() => {
    return () => {
      engineRef.current?.stopAll();
    };
  }, []);

  const handleToggle = useCallback(
    async (id: SoundId) => {
      const current = sounds[id];
      const engine = getEngine();
      if (current.isPlaying) {
        await engine.stop(id);
      } else {
        await engine.play(id, current.volume);
      }
      toggleSound(id);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sounds, toggleSound],
  );

  const handleVolumeChange = useCallback(
    (id: SoundId, volume: number) => {
      setSoundVolume(id, volume);
      if (sounds[id].isPlaying) {
        getEngine().setVolume(id, volume);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sounds, setSoundVolume],
  );

  const isSupported =
    typeof window !== 'undefined'
      ? (engineRef.current ?? new AmbientSoundEngine()).isSupported()
      : false;

  const anyPlaying = Object.values(sounds).some((s) => s.isPlaying);

  return { sounds, handleToggle, handleVolumeChange, isSupported, anyPlaying };
}
