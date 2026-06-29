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
  defaultBackground: string; // Filename in public/backgrounds/
  
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
    defaultBackground: 'coffee.mp4',
    appBackground: '#231815',
    cardColor: '#332520',
    foreground: '#F3E6D6',
    mutedForeground: '#C4A882',
    primary: '#D8C3A5',        primaryHover: '#C4AE90',
    primaryForeground: '#231815',
    secondary: '#332520',      secondaryForeground: '#D8C3A5',
    accent: '#F3E6D6',         ring: '#D8C3A5',
    sidebarAccent: '#332520',  sidebarAccentFg: '#F3E6D6',
  },

  matcha: {
    id: 'matcha',
    nameKey: 'Matcha Forest',
    preview: '#8A9A5B',
    defaultBackground: 'matcha.mp4',
    appBackground: '#161F18',
    cardColor: '#202C23',
    foreground: '#ECF0DA',
    mutedForeground: '#9EAC8D',
    primary: '#8A9A5B',        primaryHover: '#76854E',
    primaryForeground: '#161F18',
    secondary: '#202C23',      secondaryForeground: '#8A9A5B',
    accent: '#B0C27D',         ring: '#8A9A5B',
    sidebarAccent: '#202C23',  sidebarAccentFg: '#ECF0DA',
  },

  midnight: {
    id: 'midnight',
    nameKey: 'Midnight Rain',
    preview: '#1E293B',
    defaultBackground: 'midnight.mp4',
    appBackground: '#090D1A',
    cardColor: '#12192E',
    foreground: '#E2E8F0',
    mutedForeground: '#7687A1',
    primary: '#3B82F6',        primaryHover: '#2563EB',
    primaryForeground: '#FFFFFF',
    secondary: '#12192E',      secondaryForeground: '#7687A1',
    accent: '#93C5FD',         ring: '#3B82F6',
    sidebarAccent: '#12192E',  sidebarAccentFg: '#93C5FD',
  },

  lofi: {
    id: 'lofi',
    nameKey: 'Lofi Sunset',
    preview: '#FDA4AF',
    defaultBackground: 'lofi.mp4',
    appBackground: '#1D0E2B',
    cardColor: '#2D193D',
    foreground: '#FCE7F3',
    mutedForeground: '#D998C1',
    primary: '#FF8EAD',        primaryHover: '#E77896',
    primaryForeground: '#1D0E2B',
    secondary: '#2D193D',      secondaryForeground: '#FF8EAD',
    accent: '#FDA4AF',         ring: '#FF8EAD',
    sidebarAccent: '#2D193D',  sidebarAccentFg: '#FDA4AF',
  },

  cyber: {
    id: 'cyber',
    nameKey: 'Cyber Dusk',
    preview: '#FF61D2',
    defaultBackground: 'cyber.mp4',
    appBackground: '#060514',
    cardColor: '#0E0D26',
    foreground: '#EDE9FF',
    mutedForeground: '#9E8BF2',
    primary: '#B57BFF',        primaryHover: '#995BFA',
    primaryForeground: '#060514',
    secondary: '#0E0D26',      secondaryForeground: '#B57BFF',
    accent: '#FF61D2',         ring: '#FF61D2',
    sidebarAccent: '#0E0D26',  sidebarAccentFg: '#FF61D2',
  },
};

export const PRESET_ORDER: ColorPresetId[] = [
  'coffee', 'matcha', 'midnight', 'lofi', 'cyber'
];
