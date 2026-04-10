/**
 * User Preferences Store — persists theme + audio volume preferences.
 * `isPlaying` is intentionally NOT persisted: on page reload the
 * AudioContext is gone, so all sounds start muted.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ColorPresetId } from '@/lib/themes';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TimerShape = 'circular' | 'minimal' | 'card';
export type BackgroundType = 'default' | 'color' | 'gradient' | 'image';
export type SoundId = 'wind' | 'fire' | 'rain' | 'coffee' | 'lofi' | 'nature';

export interface SoundState {
  isPlaying: boolean;
  volume: number; // 0 – 1
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_SOUNDS: Record<SoundId, SoundState> = {
  wind:   { isPlaying: false, volume: 0.50 },
  fire:   { isPlaying: false, volume: 0.50 },
  rain:   { isPlaying: false, volume: 0.55 },
  coffee: { isPlaying: false, volume: 0.40 },
  lofi:   { isPlaying: false, volume: 0.60 },
  nature: { isPlaying: false, volume: 0.50 },
};

// ─── Store Interface ──────────────────────────────────────────────────────────

interface PreferencesState {
  // Theme
  colorPresetId: ColorPresetId;
  timerShape: TimerShape;
  backgroundType: BackgroundType;
  backgroundValue: string;

  // Audio (isPlaying is runtime-only, volumes are persisted)
  sounds: Record<SoundId, SoundState>;

  // Actions
  setColorPreset: (id: ColorPresetId) => void;
  setTimerShape: (shape: TimerShape) => void;
  setBackground: (type: BackgroundType, value: string) => void;
  toggleSound: (id: SoundId) => void;
  setSoundVolume: (id: SoundId, volume: number) => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      colorPresetId: 'coffee',
      timerShape: 'circular',
      backgroundType: 'default',
      backgroundValue: '',
      sounds: DEFAULT_SOUNDS,

      setColorPreset: (id) => set({ colorPresetId: id }),
      setTimerShape: (shape) => set({ timerShape: shape }),
      setBackground: (type, value) => set({ backgroundType: type, backgroundValue: value }),

      toggleSound: (id) =>
        set((s) => ({
          sounds: {
            ...s.sounds,
            [id]: { ...s.sounds[id], isPlaying: !s.sounds[id].isPlaying },
          },
        })),

      setSoundVolume: (id, volume) =>
        set((s) => ({
          sounds: { ...s.sounds, [id]: { ...s.sounds[id], volume } },
        })),
    }),
    {
      name: 'swm-preferences',
      storage: createJSONStorage(() => localStorage),
      // Persist everything EXCEPT isPlaying
      partialize: (state) => ({
        colorPresetId: state.colorPresetId,
        timerShape: state.timerShape,
        backgroundType: state.backgroundType,
        backgroundValue: state.backgroundValue,
        sounds: Object.fromEntries(
          Object.entries(state.sounds).map(([id, s]) => [
            id,
            { isPlaying: false, volume: s.volume },
          ]),
        ) as Record<SoundId, SoundState>,
      }),
    },
  ),
);
