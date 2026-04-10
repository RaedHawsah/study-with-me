'use client';

/**
 * ThemeEngine — applies color preset + background CSS overrides to :root.
 *
 * Runs client-side only (renders null). Uses a MutationObserver to re-apply
 * when the data-theme attribute toggles between light and dark, so the preset
 * stays correct regardless of which mode is active.
 */
import { useEffect } from 'react';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { COLOR_PRESETS } from '@/lib/themes';

function isDarkMode(): boolean {
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr === 'dark') return true;
  if (attr === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyColorPreset(presetId: string) {
  const preset = COLOR_PRESETS[presetId as keyof typeof COLOR_PRESETS];
  if (!preset) return;

  const root = document.documentElement;

  root.style.setProperty('--primary',                preset.primary);
  root.style.setProperty('--primary-hover',          preset.primaryHover);
  root.style.setProperty('--primary-foreground',     preset.primaryForeground);
  root.style.setProperty('--secondary',              preset.secondary);
  root.style.setProperty('--secondary-foreground',   preset.secondaryForeground);
  root.style.setProperty('--accent',                 preset.accent);
  root.style.setProperty('--ring',                   preset.ring);
  root.style.setProperty('--sidebar-accent',         preset.sidebarAccent);
  root.style.setProperty('--sidebar-accent-fg',      preset.sidebarAccentFg);
  
  // Voxel Nest specific structures
  root.style.setProperty('--background',             preset.appBackground);
  root.style.setProperty('--card',                   preset.cardColor);
  
  // Connect Sidebar and Modals to Voxel Nest aesthetics
  root.style.setProperty('--sidebar',                preset.appBackground);
  root.style.setProperty('--sidebar-border',         preset.cardColor);
  root.style.setProperty('--popover',                preset.cardColor);
  root.style.setProperty('--border',                 preset.cardColor);

  // Apply bright theme-specific foreground text — all UI text stays readable
  root.style.setProperty('--foreground',             preset.foreground);
  root.style.setProperty('--card-foreground',        preset.foreground);
  root.style.setProperty('--popover-foreground',     preset.foreground);
  root.style.setProperty('--sidebar-foreground',     preset.foreground);
  root.style.setProperty('--muted-foreground',       preset.mutedForeground);
}

export function ThemeEngine() {
  const { colorPresetId, backgroundType, backgroundValue } = usePreferencesStore();

  // ── Color preset ────────────────────────────────────────────────────────────
  useEffect(() => {
    applyColorPreset(colorPresetId);

    // Re-apply when light/dark mode changes
    const observer = new MutationObserver(() => applyColorPreset(colorPresetId));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onMqChange = () => applyColorPreset(colorPresetId);
    mq.addEventListener('change', onMqChange);

    return () => {
      observer.disconnect();
      mq.removeEventListener('change', onMqChange);
    };
  }, [colorPresetId]);

  // ── Background ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const root = document.documentElement;
    if (backgroundType === 'default' || !backgroundValue) {
      root.style.removeProperty('--app-background');
    } else {
      root.style.setProperty('--app-background', backgroundValue);
    }
  }, [backgroundType, backgroundValue]);

  return null;
}
