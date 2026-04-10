'use client';

/**
 * LocaleSwitcher — toggles between supported locales.
 *
 * On switch:
 *  1. Writes `NEXT_LOCALE` cookie so middleware remembers the preference.
 *  2. Navigates to the current page translated to the new locale.
 */
import { usePathname, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import { locales, type Locale } from '@/i18n/config';

interface LocaleSwitcherProps {
  locale: Locale;
  collapsed?: boolean;
}

function setLocaleCookie(locale: Locale) {
  // Max-age = 1 year
  document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000; SameSite=Lax`;
}

export function LocaleSwitcher({ locale, collapsed = false }: LocaleSwitcherProps) {
  const { t } = useTranslation('common');
  const pathname = usePathname();
  const router = useRouter();

  function switchLocale(next: Locale) {
    if (next === locale) return;

    setLocaleCookie(next);

    // Replace the locale segment in the current pathname
    // e.g. /en/timer → /ar/timer
    const segments = pathname.split('/');
    segments[1] = next; // index 0 is '', index 1 is the locale
    router.push(segments.join('/'));
  }

  const nextLocale = locales.find((l) => l !== locale) ?? locales[0];
  const label = t(`locale.${nextLocale}`);

  return (
    <button
      id="locale-switcher"
      onClick={() => switchLocale(nextLocale)}
      aria-label={`${t('locale.switchTo')}: ${label}`}
      title={collapsed ? label : undefined}
      className="
        flex items-center gap-3 w-full px-3 py-2.5
        rounded-md text-sm font-medium
        text-sidebar-foreground
        hover:bg-sidebar-accent hover:text-sidebar-accent-fg
        transition-theme
      "
    >
      <Languages size={18} strokeWidth={2} className="shrink-0" aria-hidden="true" />
      {!collapsed && (
        <span className="truncate">{label}</span>
      )}
    </button>
  );
}
