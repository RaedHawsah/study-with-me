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
import { type ReactNode, useRef } from 'react';
import type { Locale } from './config';

interface I18nProviderProps {
  locale: Locale;
  /** Pre-loaded namespace messages from the server. */
  messages: Record<string, unknown>;
  children: ReactNode;
}

export function I18nProvider({ locale, messages, children }: I18nProviderProps) {
  // Create the instance once per component mount (useRef = stable across re-renders)
  const i18nRef = useRef<typeof i18next | null>(null);

  if (!i18nRef.current) {
    const instance = i18next.createInstance();

    // `initImmediate` was removed in i18next v26; synchronous init is now
    // the default when no async backend is used.
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

    i18nRef.current = instance;
  } else if (i18nRef.current.language !== locale) {
    // Hot-swap locale when the user switches language without unmounting
    i18nRef.current.changeLanguage(locale);
    // Merge new messages in case they differ
    i18nRef.current.addResourceBundle(locale, 'common', messages, true, true);
  }

  return (
    <I18nextProvider i18n={i18nRef.current}>{children}</I18nextProvider>
  );
}
