/**
 * Locale layout — wraps all pages under /[locale]/*.
 *
 * Responsibilities:
 *  1. Load translation messages for the active locale (server-side)
 *  2. Inject them into the client-side I18nProvider
 *  3. Render the NavShell around all page content
 *  4. Sync locale to Zustand store via LocaleSyncClient
 *
 * NOTE: params is async in Next.js 15+ / Next.js 16.
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { locales, type Locale } from '@/i18n/config';
import { I18nProvider } from '@/i18n/I18nProvider';
import { ThemeProvider } from '@/components/ThemeProvider';
import { ThemeEngine } from '@/components/theme/ThemeEngine';
import { MovingWallpaper } from '@/components/theme/MovingWallpaper';
import { NavShell } from '@/components/shell/NavShell';
import { LocaleSyncClient } from '@/components/LocaleSyncClient';

// Pre-load all translation files so they're bundled correctly
import enMessages from '../../../public/locales/en/common.json';
import arMessages from '../../../public/locales/ar/common.json';

const messageMap: Record<Locale, Record<string, unknown>> = {
  en: enMessages,
  ar: arMessages,
};

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'ar' ? 'ادرس معي' : 'Study With Me',
    description:
      locale === 'ar'
        ? 'رفيقك في الدراسة والتركيز. تتبّع جلساتك، سجّل ملاحظاتك، وابنِ سلسلة إنجازاتك.'
        : 'Your focused study companion. Track sessions, take notes, and build study streaks.',
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;

  // Validate locale — show 404 for unknown segments
  if (!(locales as readonly string[]).includes(locale)) {
    notFound();
  }

  const validLocale = locale as Locale;
  const messages = messageMap[validLocale];

  return (
    <I18nProvider locale={validLocale} messages={messages}>
      <ThemeProvider>
        {/* Apply color preset + background CSS variables */}
        <ThemeEngine />
        {/* Render Moving Wallpaper directly underneath NavShell */}
        <MovingWallpaper />
        {/* Sync the URL locale to Zustand store on the client */}
        <LocaleSyncClient locale={validLocale} />
        <NavShell locale={validLocale}>{children}</NavShell>
      </ThemeProvider>
    </I18nProvider>
  );
}
