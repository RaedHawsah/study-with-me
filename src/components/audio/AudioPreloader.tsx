'use client';

/**
 * AudioPreloader — silently prefetches all audio files in the background
 * as soon as the locale layout mounts (before the user opens the mixer).
 *
 * - Fetches custom sounds list from the API
 * - Calls engine.preload() for all built-ins + custom files
 * - engine.preload() only fetches raw bytes, no AudioContext → safe before user gesture
 */
import { useEffect } from 'react';
import { AmbientSoundEngine } from '@/lib/audioEngine';
import { usePreferencesStore } from '@/store/usePreferencesStore';

export function AudioPreloader() {
  const { customSounds, refreshSounds } = usePreferencesStore();

  useEffect(() => {
    refreshSounds();
  }, [refreshSounds]);

  useEffect(() => {
    const engine = AmbientSoundEngine.getInstance();

    // 2. Preload custom sounds
    if (customSounds && customSounds.length > 0) {
      customSounds.forEach((id: string) => engine.preload(id));
    }
  }, [customSounds]);

  // Renders nothing
  return null;
}
