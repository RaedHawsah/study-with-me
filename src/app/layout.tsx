/**
 * Root layout — outermost HTML shell.
 *
 * Reads the active locale from the `x-locale` request header set by
 * middleware so we can apply lang + dir to <html> on the server, avoiding
 * any client-side flash of wrong direction.
 *
 * The inline <script> prevents FOUC for the dark/light/system theme by
 * applying data-theme before React hydrates.
 */
import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import { getDir, type Locale } from '@/i18n/config';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Study With Me',
    template: '%s · Study With Me',
  },
  description:
    'A focused productivity companion for students. Track sessions, take notes, and build study streaks.',
  keywords: ['study', 'productivity', 'pomodoro', 'focus', 'notes'],
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
  },
  openGraph: {
    type: 'website',
    siteName: 'Study With Me',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8f8fc' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a12' },
  ],
};

// Anti-FOUC theme script — runs synchronously before first paint.
// Must be a string literal (no template literals with backtick) for
// browsers that don't support certain ES features in inline scripts.
const themeScript = `
(function(){
  try {
    var stored = localStorage.getItem('swm-app-store');
    var theme = stored ? JSON.parse(stored).state?.theme : null;
    if (!theme || theme === 'system') {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  } catch(e) {}
})();
`;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Read locale forwarded by middleware via a custom header
  const headersList = await headers();
  const locale = (headersList.get('x-locale') ?? 'en') as Locale;
  const dir = getDir(locale);

  return (
    <html
      lang={locale}
      dir={dir}
      // suppressHydrationWarning because data-theme is set by the inline script
      // before React hydration, so the server and client values may differ.
      suppressHydrationWarning
    >
      <head>
        {/* Anti-FOUC: set theme before paint */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen bg-background text-foreground transition-theme">
        {children}
      </body>
    </html>
  );
}
