import { create } from 'zustand';
import { createClient } from '@/utils/supabase/client';
import type { ColorPresetId } from '@/lib/themes';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TimerShape = 'circular' | 'minimal' | 'card';
export type BackgroundType = 'default' | 'color' | 'gradient' | 'image';
export type SoundId = 'wind' | 'fire' | 'rain' | 'coffee' | 'lofi' | 'nature';

export interface SoundState {
  isPlaying: boolean;
  isLoading?: boolean;
  volume: number; // 0 – 1
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_SOUNDS: Record<string, SoundState> = {
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
  sounds: Record<string, SoundState>;
  customSoundIds: string[];
  showFloatingAudioDock: boolean;

  // Actions
  fetchPreferences: (userId?: string) => Promise<void>;
  setColorPreset: (id: ColorPresetId) => Promise<void>;
  setTimerShape: (shape: TimerShape) => Promise<void>;
  setBackground: (type: BackgroundType, value: string) => Promise<void>;
  toggleSound: (id: string) => void;
  setSoundLoading: (id: string, isLoading: boolean) => void;
  setSoundVolume: (id: string, volume: number) => Promise<void>;
  setCustomSoundIds: (ids: string[]) => void;
  setShowFloatingAudioDock: (show: boolean) => Promise<void>;
  clearStore: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const usePreferencesStore = create<PreferencesState>((set, get) => ({
  colorPresetId: 'coffee',
  timerShape: 'circular',
  backgroundType: 'default',
  backgroundValue: '',
  sounds: DEFAULT_SOUNDS,
  customSoundIds: [],
  showFloatingAudioDock: true,

  fetchPreferences: async (userId?: string) => {
    const supabase = createClient();
    let effectiveUserId = userId;

    if (!effectiveUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      effectiveUserId = user?.id;
    }

    if (!effectiveUserId) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('settings')
      .eq('id', effectiveUserId)
      .single();

    if (!error && data?.settings) {
      const s = data.settings;
      
      // Validate that the returned theme ID actually exists in our current system
      const { PRESET_ORDER } = require('@/lib/themes');
      const validThemeId = PRESET_ORDER.includes(s.theme) ? s.theme : 'coffee';

      set({
        colorPresetId: validThemeId,
        timerShape: s.timerShape || 'circular',
        backgroundType: s.backgroundType || 'default',
        backgroundValue: s.backgroundValue || '',
        showFloatingAudioDock: s.audio?.showDock ?? true,
        sounds: {
          ...get().sounds,
          ...(s.audio?.volumes || {})
        }
      });
    }
  },

  setColorPreset: async (id) => {
    set({ colorPresetId: id });
    await syncSettings(id, 'theme');
  },

  setTimerShape: async (shape) => {
    set({ timerShape: shape });
    await syncSettings(shape, 'timerShape');
  },

  setBackground: async (type, value) => {
    set({ backgroundType: type, backgroundValue: value });
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('settings').eq('id', user.id).single();
      const updated = { ...profile?.settings, backgroundType: type, backgroundValue: value };
      await supabase.from('profiles').update({ settings: updated }).eq('id', user.id);
    }
  },

  toggleSound: (id) =>
    set((s) => ({
      sounds: {
        ...s.sounds,
        [id]: s.sounds[id] 
          ? { ...s.sounds[id], isPlaying: !s.sounds[id].isPlaying }
          : { isPlaying: true, volume: 0.5 },
      },
    })),

  setSoundLoading: (id, isLoading) =>
    set((s) => ({
      sounds: {
        ...s.sounds,
        [id]: s.sounds[id]
          ? { ...s.sounds[id], isLoading }
          : { isPlaying: false, isLoading, volume: 0.5 },
      },
    })),

  setSoundVolume: async (id, volume) => {
    set((s) => ({
      sounds: { 
        ...s.sounds, 
        [id]: s.sounds[id] ? { ...s.sounds[id], volume } : { isPlaying: false, volume }
      },
    }));

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('settings').eq('id', user.id).single();
      const volumes = { ...(profile?.settings?.audio?.volumes || {}), [id]: { volume, isPlaying: false } };
      const updated = { ...profile?.settings, audio: { ...profile?.settings?.audio, volumes } };
      await supabase.from('profiles').update({ settings: updated }).eq('id', user.id);
    }
  },

  setCustomSoundIds: (ids) => set({ customSoundIds: ids }),
  
  setShowFloatingAudioDock: async (show) => {
    set({ showFloatingAudioDock: show });
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('settings').eq('id', user.id).single();
      const updated = { ...profile?.settings, audio: { ...profile?.settings?.audio, showDock: show } };
      await supabase.from('profiles').update({ settings: updated }).eq('id', user.id);
    }
  },

  clearStore: () => set({
    colorPresetId: 'coffee',
    timerShape: 'circular',
    backgroundType: 'default',
    backgroundValue: '',
    showFloatingAudioDock: true,
    sounds: DEFAULT_SOUNDS,
    customSoundIds: [],
  }),
}));

async function syncSettings(value: any, key: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('settings').eq('id', user.id).single();
    const updated = { ...profile?.settings, [key]: value };
    await supabase.from('profiles').update({ settings: updated }).eq('id', user.id);
  }
}
