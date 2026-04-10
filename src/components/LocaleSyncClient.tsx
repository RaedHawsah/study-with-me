'use client';

/**
 * LocaleSyncClient — tiny client component that syncs the URL locale
 * to the Zustand store so any client component can read it reactively.
 */
import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import type { Locale } from '@/i18n/config';

export function LocaleSyncClient({ locale }: { locale: Locale }) {
  const setLocale = useAppStore((s) => s.setLocale);

  useEffect(() => {
    setLocale(locale);
  }, [locale, setLocale]);

  return null;
}
