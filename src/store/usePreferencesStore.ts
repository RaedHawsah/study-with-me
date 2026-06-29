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
  customSounds: string[];
  showFloatingAudioDock: boolean;
  currentLofiTrackIndex: number;

  // Global Admin Settings
  globalBackgrounds: Record<string, string>;

  // Actions
  fetchPreferences: (userId?: string) => Promise<void>;
  fetchGlobalSettings: () => Promise<void>;
  setColorPreset: (id: ColorPresetId) => Promise<void>;
  setTimerShape: (shape: TimerShape) => Promise<void>;
  setBackground: (type: BackgroundType, value: string) => Promise<void>;
  refreshBackgrounds: () => Promise<void>;
  refreshSounds: () => Promise<void>;
  uploadGlobalBackground: (themeId: string, file: File) => Promise<void>;
  deleteGlobalBackground: (themeId: string) => Promise<void>;
  toggleSound: (id: string) => void;
  setSoundLoading: (id: string, isLoading: boolean) => void;
  setSoundVolume: (id: string, volume: number) => Promise<void>;
  setCustomBackgrounds: (filenames: string[]) => void;
  setShowFloatingAudioDock: (show: boolean) => Promise<void>;
  setCurrentLofiTrackIndex: (index: number) => void;
  clearStore: () => void;
  _saveGuestPreferences: () => void;
}

const ADMIN_EMAIL = '55raed55@gmail.com';

// ─── Store ────────────────────────────────────────────────────────────────────

export const usePreferencesStore = create<PreferencesState>((set, get) => ({
  colorPresetId: 'matcha',
  timerShape: 'circular',
  backgroundType: 'default',
  backgroundValue: '',
  customBackgrounds: [],
  customSounds: [],
  userBackgroundUrl: null,
  isUploading: false,
  sounds: DEFAULT_SOUNDS,
  showFloatingAudioDock: true,
  globalBackgrounds: {},
  currentLofiTrackIndex: 0,

  _saveGuestPreferences: () => {
    try {
      const prefs = {
        theme: get().colorPresetId,
        timerShape: get().timerShape,
        backgroundType: get().backgroundType,
        backgroundValue: get().backgroundValue,
        showFloatingAudioDock: get().showFloatingAudioDock,
        sounds: get().sounds
      };
      localStorage.setItem('guest_preferences', JSON.stringify(prefs));
    } catch (e) {
      console.warn('Failed to save guest preferences:', e);
    }
  },

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
      // For Guests: load from localStorage if exists
      try {
        const local = localStorage.getItem('guest_preferences');
        const storedLofi = localStorage.getItem('swm_lofi_track_index');
        if (local) {
          const parsed = JSON.parse(local);
          set({
            colorPresetId: parsed.theme || get().colorPresetId,
            timerShape: parsed.timerShape || get().timerShape,
            backgroundType: parsed.backgroundType || get().backgroundType,
            backgroundValue: parsed.backgroundValue || get().backgroundValue,
            showFloatingAudioDock: parsed.showFloatingAudioDock ?? get().showFloatingAudioDock,
            sounds: parsed.sounds || get().sounds,
            currentLofiTrackIndex: storedLofi ? (parseInt(storedLofi, 10) || 0) : 0,
          });
          return;
        }
      } catch (e) {
        console.warn('Failed to parse local guest preferences', e);
      }

      // If no local config, fallback to global background if exists for current theme
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
      const validThemeId = PRESET_ORDER.includes(s.theme) ? s.theme : 'matcha';

      // Override logic: Global Admin Bg > User Setting > Theme Default
      const finalBg = globalBackgrounds[validThemeId] || s.backgroundValue || COLOR_PRESETS[validThemeId as ColorPresetId].defaultBackground;

      const storedLofi = localStorage.getItem('swm_lofi_track_index');
      set({
        colorPresetId: validThemeId,
        timerShape: s.timerShape || 'circular',
        backgroundType: 'custom',
        backgroundValue: finalBg,
        showFloatingAudioDock: s.audio?.showDock ?? true,
        sounds: {
          ...get().sounds,
          ...(s.audio?.volumes || {})
        },
        currentLofiTrackIndex: storedLofi ? (parseInt(storedLofi, 10) || 0) : 0,
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

  refreshSounds: async () => {
    try {
      const r = await fetch('/api/audio/list');
      if (r.ok) {
        const data = await r.json();
        if (data.files) set({ customSounds: data.files });
      }
    } catch (e) {
      console.warn('Failed to fetch sounds', e);
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
      } else {
        get()._saveGuestPreferences();
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

  deleteGlobalBackground: async (themeId: string) => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    
    if (user?.email !== ADMIN_EMAIL) {
      alert('Access Denied: Only admin can manage official backgrounds.');
      return;
    }

    try {
      const key = `bg_${themeId}`;
      const { error: dbError } = await supabase
        .from('global_settings')
        .delete()
        .eq('key', key);

      if (dbError) throw dbError;

      // Delete potential official files from storage
      await supabase.storage
        .from('backgrounds')
        .remove([`official/${themeId}.mp4`, `official/${themeId}.webm`, `official/${themeId}.gif`]);

      // Refresh store
      await get().fetchGlobalSettings();

      // If the current theme matches, reset its background to preset default
      if (get().colorPresetId === themeId) {
        const theme = COLOR_PRESETS[themeId as ColorPresetId];
        set({ backgroundType: 'custom', backgroundValue: theme.defaultBackground });
      }

      alert(`Official background for ${themeId} deleted successfully from database!`);
    } catch (error: any) {
      console.error('Delete failed:', error);
      alert(`Official delete failed: ${error.message || error}`);
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
      } else {
        get()._saveGuestPreferences();
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
      } else {
        get()._saveGuestPreferences();
      }
    } catch (e) {
      console.warn('[setSoundVolume] sync skipped:', e);
    }
  },

  setCustomBackgrounds: (filenames) => set({ customBackgrounds: filenames }),
  
  setCurrentLofiTrackIndex: (index) => {
    set({ currentLofiTrackIndex: index });
    try {
      localStorage.setItem('swm_lofi_track_index', String(index));
    } catch {}
  },

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
      } else {
        get()._saveGuestPreferences();
      }
    } catch (e) {
      console.warn('[setShowFloatingAudioDock] sync skipped:', e);
    }
  },

  clearStore: () => set({
    colorPresetId: 'matcha',
    timerShape: 'circular',
    backgroundType: 'default',
    backgroundValue: '',
    customBackgrounds: [],
    userBackgroundUrl: null,
    isUploading: false,
    showFloatingAudioDock: true,
    globalBackgrounds: {},
    sounds: DEFAULT_SOUNDS,
    customSounds: [],
  }),
}));

async function syncSettings(value: any, key: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('settings').eq('id', user.id).single();
    const updated = { ...profile?.settings, [key]: value };
    await supabase.from('profiles').update({ settings: updated }).eq('id', user.id);
  } else {
    // Note: usePreferencesStore.getState()._saveGuestPreferences() can be called from outside but it's cleaner to just call it directly in setTimerShape if we could.
    // We will just do it via getState():
    usePreferencesStore.getState()._saveGuestPreferences();
  }
}
