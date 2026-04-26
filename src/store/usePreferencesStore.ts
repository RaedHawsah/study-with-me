import { create } from 'zustand';
import { createClient } from '@/utils/supabase/client';
import { COLOR_PRESETS, type ColorPresetId } from '@/lib/themes';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TimerShape = 'circular' | 'minimal' | 'card';
export type BackgroundType = 'default' | 'color' | 'gradient' | 'image' | 'custom';
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
  backgroundValue: string; // Filename or Supabase URL
  customBackgrounds: string[]; // Local /public/ backgrounds
  userBackgroundUrl: string | null; // Single user upload URL
  isUploading: boolean;

  // Audio (isPlaying is runtime-only, volumes are persisted)
  sounds: Record<string, SoundState>;
  customSoundIds: string[];
  showFloatingAudioDock: boolean;

  // Global Admin Settings
  globalBackgrounds: Record<string, string>;

  // Actions
  fetchPreferences: (userId?: string) => Promise<void>;
  fetchGlobalSettings: () => Promise<void>;
  setColorPreset: (id: ColorPresetId) => Promise<void>;
  setTimerShape: (shape: TimerShape) => Promise<void>;
  setBackground: (type: BackgroundType, value: string) => Promise<void>;
  refreshBackgrounds: () => Promise<void>;
  uploadGlobalBackground: (themeId: string, file: File) => Promise<void>;
  toggleSound: (id: string) => void;
  setSoundLoading: (id: string, isLoading: boolean) => void;
  setSoundVolume: (id: string, volume: number) => Promise<void>;
  setCustomSoundIds: (ids: string[]) => void;
  setCustomBackgrounds: (filenames: string[]) => void;
  setShowFloatingAudioDock: (show: boolean) => Promise<void>;
  clearStore: () => void;
}

const ADMIN_EMAIL = '55raed55@gmail.com';

// ─── Store ────────────────────────────────────────────────────────────────────

export const usePreferencesStore = create<PreferencesState>((set, get) => ({
  colorPresetId: 'coffee',
  timerShape: 'circular',
  backgroundType: 'default',
  backgroundValue: '',
  customBackgrounds: [],
  userBackgroundUrl: null,
  isUploading: false,
  sounds: DEFAULT_SOUNDS,
  customSoundIds: [],
  showFloatingAudioDock: true,
  globalBackgrounds: {},

  fetchPreferences: async (userId?: string) => {
    // Always fetch local backgrounds (for fallback/system)
    get().refreshBackgrounds();
    // Always fetch global defaults first
    await get().fetchGlobalSettings();

    const supabase = createClient();
    let effectiveUserId = userId;
    if (!effectiveUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      effectiveUserId = user?.id;
    }

    const { globalBackgrounds } = get();

    if (!effectiveUserId) {
      // For Guests: If a global background exists for the current/default theme, apply it
      const currentTheme = get().colorPresetId;
      if (globalBackgrounds[currentTheme]) {
        set({ backgroundType: 'custom', backgroundValue: globalBackgrounds[currentTheme] });
      }
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('settings')
      .eq('id', effectiveUserId)
      .single();

    if (!error && data?.settings) {
      const s = data.settings;
      const { PRESET_ORDER } = require('@/lib/themes');
      const validThemeId = PRESET_ORDER.includes(s.theme) ? s.theme : 'coffee';

      // Override logic: Global Admin Bg > User Setting > Theme Default
      const finalBg = globalBackgrounds[validThemeId] || s.backgroundValue || COLOR_PRESETS[validThemeId as ColorPresetId].defaultBackground;

      set({
        colorPresetId: validThemeId,
        timerShape: s.timerShape || 'circular',
        backgroundType: 'custom',
        backgroundValue: finalBg,
        showFloatingAudioDock: s.audio?.showDock ?? true,
        sounds: {
          ...get().sounds,
          ...(s.audio?.volumes || {})
        }
      });
    }
  },

  fetchGlobalSettings: async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from('global_settings').select('*');
      if (!error && data) {
        const mapping: Record<string, string> = {};
        data.forEach((item: { key: string; value: string }) => {
          if (item.key.startsWith('bg_')) {
            mapping[item.key.replace('bg_', '')] = item.value;
          }
        });
        set({ globalBackgrounds: mapping });
      }
    } catch (e) {
      console.warn('Failed to fetch global settings', e);
    }
  },

  refreshBackgrounds: async () => {
    try {
      const r = await fetch('/api/backgrounds/list');
      if (r.ok) {
        const data = await r.json();
        if (data.files) set({ customBackgrounds: data.files });
      }
    } catch (e) {
      console.warn('Failed to fetch backgrounds', e);
    }
  },

  setColorPreset: async (id) => {
    const theme = COLOR_PRESETS[id];
    const { globalBackgrounds } = get();
    const newValue = globalBackgrounds[id] || theme.defaultBackground;
    
    set({ 
      colorPresetId: id, 
      backgroundType: 'custom', 
      backgroundValue: newValue 
    });

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('settings').eq('id', user.id).single();
        const updated = { 
          ...profile?.settings, 
          theme: id, 
          backgroundType: 'custom', 
          backgroundValue: newValue 
        };
        await supabase.from('profiles').update({ settings: updated }).eq('id', user.id);
      }
    } catch (e) {
      console.warn('[setColorPreset] sync skipped:', e);
    }
  },

  uploadGlobalBackground: async (themeId: string, file: File) => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    
    if (user?.email !== ADMIN_EMAIL) {
      alert('Access Denied: Only admin can manage official backgrounds.');
      return;
    }

    set({ isUploading: true });

    try {
      const ext = file.name.split('.').pop();
      const fileName = `official/${themeId}.${ext}`;
      
      // Upload to 'backgrounds' bucket in 'official' folder
      const { error: uploadError } = await supabase.storage
        .from('backgrounds')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl: rawPublicUrl } } = supabase.storage
        .from('backgrounds')
        .getPublicUrl(fileName);
      
      const publicUrl = `${rawPublicUrl}?t=${Date.now()}`;

      // Update global_settings table
      const key = `bg_${themeId}`;
      await supabase.from('global_settings').upsert({ key, value: publicUrl });

      // Refresh store
      await get().fetchGlobalSettings();
      
      // If the current theme matches, apply it immediately
      if (get().colorPresetId === themeId) {
        set({ backgroundType: 'custom', backgroundValue: publicUrl });
      }

      set({ isUploading: false });
      alert(`Official background for ${themeId} updated successfully!`);
    } catch (error: any) {
      console.error('Upload failed:', error);
      set({ isUploading: false });
      const msg = error.message || 'Unknown error';
      alert(`Official upload failed: ${msg}`);
    }
  },

  setTimerShape: async (shape) => {
    set({ timerShape: shape });
    await syncSettings(shape, 'timerShape');
  },

  setBackground: async (type, value) => {
    set({ backgroundType: type, backgroundValue: value });
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('settings').eq('id', user.id).single();
        const updated = { ...profile?.settings, backgroundType: type, backgroundValue: value };
        await supabase.from('profiles').update({ settings: updated }).eq('id', user.id);
      }
    } catch (e) {
      console.warn('[setBackground] sync skipped:', e);
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

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('settings').eq('id', user.id).single();
        const volumes = { ...(profile?.settings?.audio?.volumes || {}), [id]: { volume, isPlaying: false } };
        const updated = { ...profile?.settings, audio: { ...profile?.settings?.audio, volumes } };
        await supabase.from('profiles').update({ settings: updated }).eq('id', user.id);
      }
    } catch (e) {
      console.warn('[setSoundVolume] sync skipped:', e);
    }
  },

  setCustomSoundIds: (ids) => set({ customSoundIds: ids }),
  setCustomBackgrounds: (filenames) => set({ customBackgrounds: filenames }),
  
  setShowFloatingAudioDock: async (show) => {
    set({ showFloatingAudioDock: show });
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('settings').eq('id', user.id).single();
        const updated = { ...profile?.settings, audio: { ...profile?.settings?.audio, showDock: show } };
        await supabase.from('profiles').update({ settings: updated }).eq('id', user.id);
      }
    } catch (e) {
      console.warn('[setShowFloatingAudioDock] sync skipped:', e);
    }
  },

  clearStore: () => set({
    colorPresetId: 'coffee',
    timerShape: 'circular',
    backgroundType: 'default',
    backgroundValue: '',
    customBackgrounds: [],
    userBackgroundUrl: null,
    isUploading: false,
    showFloatingAudioDock: true,
    globalBackgrounds: {},
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
