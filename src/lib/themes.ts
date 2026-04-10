/**
 * Theme Definitions — Voxel Nest Palettes.
 * Pure data module — no React, no browser APIs.
 */

// ─── Voxel Nest Color Presets ────────────────────────────────────────────────

export type ColorPresetId =
  | 'coffee'
  | 'matcha'
  | 'midnight'
  | 'lofi'
  | 'cyber';

export interface ColorPreset {
  id: ColorPresetId;
  nameKey: string;
  preview: string;
  
  // ── Global Backgrounds ── //
  appBackground: string;
  cardColor: string;
  
  // ── Text Color (always light for dark backgrounds) ── //
  foreground: string;       // Primary text — must be high contrast
  mutedForeground: string;  // Secondary/muted text

  // ── Accents ── //
  primary: string;
  primaryHover: string;
  primaryForeground: string;
  
  secondary: string;
  secondaryForeground: string;
  
  accent: string;       // Used for Neon Glow
  ring: string;
  
  sidebarAccent: string;
  sidebarAccentFg: string;
}

export const COLOR_PRESETS: Record<ColorPresetId, ColorPreset> = {
  coffee: {
    id: 'coffee',
    nameKey: 'Coffee Brew',
    preview: '#7B5A44',
    appBackground: '#2F2420',
    cardColor: '#4A3424',
    foreground: '#F3E6D6',        // Soft Beige — high contrast on espresso
    mutedForeground: '#C4A882',   // Latte tone for secondary labels
    primary: '#D8BFA8',        primaryHover: '#CDB196',
    primaryForeground: '#2F2420',
    secondary: '#3B2A20',      secondaryForeground: '#D8BFA8',
    accent: '#F3E6D6',         ring: '#D8BFA8',
    sidebarAccent: '#3B2A20',  sidebarAccentFg: '#F3E6D6',
  },

  matcha: {
    id: 'matcha',
    nameKey: 'Matcha Forest',
    preview: '#8A9A5B',
    appBackground: '#2C201C', 
    cardColor: '#3C2E2A',
    foreground: '#ECF0DA',        // Soft cream-white on deep earth
    mutedForeground: '#B5C28A',   // Sage green for muted
    primary: '#8A9A5B',        primaryHover: '#798A4B',
    primaryForeground: '#1A1C16',
    secondary: '#F3E6D6',      secondaryForeground: '#2C201C',
    accent: '#B0C27D',         ring: '#8A9A5B',
    sidebarAccent: '#F3E6D6',  sidebarAccentFg: '#8A9A5B',
  },

  midnight: {
    id: 'midnight',
    nameKey: 'Midnight Rain',
    preview: '#1E293B',
    appBackground: '#0F172A',
    cardColor: '#1E293B',
    foreground: '#E2E8F0',        // Cool white — crisp on navy
    mutedForeground: '#94A3B8',   // Slate gray for muted
    primary: '#64748B',        primaryHover: '#475569',
    primaryForeground: '#F8FAFC',
    secondary: '#1E293B',      secondaryForeground: '#94A3B8',
    accent: '#C7D2FE',         ring: '#94A3B8',
    sidebarAccent: '#1E293B',  sidebarAccentFg: '#C7D2FE',
  },

  lofi: {
    id: 'lofi',
    nameKey: 'Lofi Sunset',
    preview: '#FDA4AF',
    appBackground: '#4A154B',
    cardColor: '#6B21A8',
    foreground: '#FCE7F3',        // Soft pink-white on deep plum
    mutedForeground: '#F9A8D4',   // Mauve-pink for muted
    primary: '#FBCFE8',        primaryHover: '#F9A8D4',
    primaryForeground: '#4A154B',
    secondary: '#86198F',      secondaryForeground: '#FBCFE8',
    accent: '#FDA4AF',         ring: '#FBCFE8',
    sidebarAccent: '#86198F',  sidebarAccentFg: '#FDA4AF',
  },

  cyber: {
    id: 'cyber',
    nameKey: 'Cyber Dusk',
    preview: '#FF61D2',
    appBackground: '#0D0B26',
    cardColor: '#16134D',
    foreground: '#EDE9FF',        // Soft lavender-white on deep indigo
    mutedForeground: '#C4B5FD',   // Periwinkle for muted
    primary: '#E0C8FF',        primaryHover: '#C4A1FF',
    primaryForeground: '#0D0B26',
    secondary: '#201A63',      secondaryForeground: '#E0C8FF',
    accent: '#FF61D2',         ring: '#FF61D2',
    sidebarAccent: '#201A63',  sidebarAccentFg: '#FF61D2',
  },
};

export const PRESET_ORDER: ColorPresetId[] = [
  'coffee', 'matcha', 'midnight', 'lofi', 'cyber'
];
