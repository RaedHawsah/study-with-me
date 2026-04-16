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

const BUILTIN_IDS = ['wind', 'fire', 'rain', 'coffee', 'lofi', 'nature'];

export function AudioPreloader() {
  const { setCustomSoundIds } = usePreferencesStore();

  useEffect(() => {
    const engine = AmbientSoundEngine.getInstance();

    // 1. Preload all built-in sounds immediately
    BUILTIN_IDS.forEach((id) => engine.preload(id));

    // 2. Fetch custom sounds list and preload them too
    fetch('/api/audio/list')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.files)) {
          setCustomSoundIds(data.files);
          data.files.forEach((id: string) => engine.preload(id));
        }
      })
      .catch(() => {/* silent — fallback gracefully */});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Renders nothing
  return null;
}
