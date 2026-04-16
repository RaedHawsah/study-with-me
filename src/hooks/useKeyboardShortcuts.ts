'use client';

import { useEffect } from 'react';
import { usePomodoro } from '@/hooks/usePomodoro';
import { useAmbientAudio } from '@/hooks/useAmbientAudio';
import { AmbientSoundEngine } from '@/lib/audioEngine';
import { usePreferencesStore } from '@/store/usePreferencesStore';

/**
 * useKeyboardShortcuts — Global shortcut handler for the app.
 * Alt + M : Mute (Stop) all sounds
 * Alt + T : Start / Pause Timer
 * Alt + S : Toggle Ambient Sound Bar
 */
export function useKeyboardShortcuts(onToggleAmbience: () => void) {
  const { start, pause, status } = usePomodoro();
  const { toggleSound, sounds: soundsState } = usePreferencesStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.altKey) {
        switch (e.key.toLowerCase()) {
          case 'm':
            e.preventDefault();
            const engine = AmbientSoundEngine.getInstance();
            engine.stopAll();
            // Update Zustand state
            Object.keys(soundsState).forEach(id => {
              if (soundsState[id].isPlaying) toggleSound(id);
            });
            break;
            
          case 't':
            e.preventDefault();
            if (status === 'running') pause();
            else start();
            break;

          case 's':
            e.preventDefault();
            onToggleAmbience();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [start, pause, status, soundsState, toggleSound, onToggleAmbience]);
}
