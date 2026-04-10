/**
 * i18n configuration — single source of truth for supported locales.
 * Add new locales here and they'll be picked up by middleware + layouts.
 */

export const locales = ['en', 'ar'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

/** Returns true when a locale uses right-to-left text direction. */
export function isRtl(locale: Locale): boolean {
  return locale === 'ar';
}

/** Returns the HTML dir attribute value for a locale. */
export function getDir(locale: Locale): 'ltr' | 'rtl' {
  return isRtl(locale) ? 'rtl' : 'ltr';
}

/** Returns the locale from a URL pathname, or null if not found. */
export function getLocaleFromPathname(pathname: string): Locale | null {
  for (const locale of locales) {
    if (pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`) {
      return locale;
    }
  }
  return null;
}
