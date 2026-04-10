/**
 * Global Zustand store for app-wide state.
 *
 * Persisted slices (theme) survive page reloads via localStorage.
 * Non-persisted slices (locale) are derived from the URL.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Locale } from '@/i18n/config';

// ─── Theme ────────────────────────────────────────────────────────────────────

export type Theme = 'light' | 'dark' | 'system';

interface ThemeSlice {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

// ─── Locale ───────────────────────────────────────────────────────────────────

interface LocaleSlice {
  /** Current UI locale — kept in sync with the URL segment by the layout. */
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

// ─── Combined Store ────────────────────────────────────────────────────────────

interface AppStore extends ThemeSlice, LocaleSlice {}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      // Theme slice — persisted
      theme: 'system',
      setTheme: (theme) => set({ theme }),

      // Locale slice — not persisted (derived from URL, cookie handles redirect)
      locale: 'en',
      setLocale: (locale) => set({ locale }),
    }),
    {
      name: 'swm-app-store',
      storage: createJSONStorage(() => localStorage),
      // Only persist the theme, not the locale
      partialize: (state) => ({ theme: state.theme }),
    },
  ),
);
