/**
 * Server-side translation helper for React Server Components.
 * Creates an isolated i18next instance per request — safe for concurrent renders.
 */
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next/initReactI18next';
import type { Locale } from './config';

type Messages = Record<string, unknown>;

async function loadMessages(locale: Locale, ns: string): Promise<Messages> {
  // Dynamic import keeps translation files out of the main bundle
  const mod = await import(`../../public/locales/${locale}/${ns}.json`);
  return mod.default as Messages;
}

/**
 * Returns a typed `t()` function for server-side rendering.
 *
 * @example
 * const { t } = await getTranslations(locale);
 * return <h1>{t('app.name')}</h1>
 */
export async function getTranslations(locale: Locale, ns = 'common') {
  const messages = await loadMessages(locale, ns);

  const instance = createInstance();
  await instance.use(initReactI18next).init({
    lng: locale,
    fallbackLng: 'en',
    ns: [ns],
    defaultNS: ns,
    resources: { [locale]: { [ns]: messages } },
    interpolation: { escapeValue: false },
  });

  return {
    /** Typed translation function bound to the current locale and namespace. */
    t: instance.t.bind(instance),
    i18n: instance,
  };
}
