'use client';

/**
 * Client-side i18n provider.
 * Receives pre-loaded messages from the server layout and initialises
 * a per-component-tree i18next instance synchronously (no flash / Suspense).
 *
 * Usage in a Client Component:
 *   import { useTranslation } from 'react-i18next';
 *   const { t } = useTranslation('common');
 */
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { type ReactNode, useState, useEffect } from 'react';
import type { Locale } from './config';

interface I18nProviderProps {
  locale: Locale;
  /** Pre-loaded namespace messages from the server. */
  messages: Record<string, unknown>;
  children: ReactNode;
}

export function I18nProvider({ locale, messages, children }: I18nProviderProps) {
  // Initialise the instance once
  const [i18n] = useState(() => {
    const instance = i18next.createInstance();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (instance.use(initReactI18next) as any).init({
      lng: locale,
      fallbackLng: 'en',
      ns: ['common'],
      defaultNS: 'common',
      resources: { [locale]: { common: messages } },
      interpolation: { escapeValue: false },
      react: { useSuspense: false },
    });
    return instance;
  });

  // Hot-swap locale when the user switches language
  useEffect(() => {
    if (i18n.language !== locale) {
      i18n.changeLanguage(locale);
      i18n.addResourceBundle(locale, 'common', messages, true, true);
    }
  }, [i18n, locale, messages]);

  return (
    <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
  );
}
