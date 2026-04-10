'use client';

/**
 * ThemeToggle — cycles through light → dark → system themes.
 * Persisted in Zustand (saved to localStorage automatically).
 */
import { Sun, Moon, Monitor, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppStore, type Theme } from '@/store/useAppStore';

const CYCLE: Theme[] = ['light', 'dark', 'system'];

const ICONS: Record<Theme, LucideIcon> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

interface ThemeToggleProps {
  collapsed?: boolean;
}

export function ThemeToggle({ collapsed = false }: ThemeToggleProps) {
  const { t } = useTranslation('common');
  const { theme, setTheme } = useAppStore();

  function cycleTheme() {
    const current = CYCLE.indexOf(theme);
    const next = CYCLE[(current + 1) % CYCLE.length];
    setTheme(next);
  }

  const Icon = ICONS[theme];
  const label = t(`theme.${theme}`);

  return (
    <button
      id="theme-toggle"
      onClick={cycleTheme}
      aria-label={`${t('theme.toggle')}: ${label}`}
      title={collapsed ? label : undefined}
      className="
        flex items-center gap-3 w-full px-3 py-2.5
        rounded-md text-sm font-medium
        text-sidebar-foreground
        hover:bg-sidebar-accent hover:text-sidebar-accent-fg
        transition-theme
      "
    >
      <Icon size={18} strokeWidth={2} className="shrink-0" aria-hidden="true" />
      {!collapsed && (
        <span className="truncate">{label}</span>
      )}
    </button>
  );
}
