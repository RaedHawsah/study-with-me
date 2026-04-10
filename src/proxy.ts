import { NextRequest, NextResponse } from 'next/server';
import { locales, defaultLocale, getLocaleFromPathname, type Locale } from '@/i18n/config';

/**
 * Determine the best locale for an incoming request.
 * Priority: cookie → Accept-Language header → default.
 */
function detectLocale(request: NextRequest): Locale {
  // 1. Check NEXT_LOCALE cookie (set by LocaleSwitcher)
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
  if (cookieLocale && (locales as readonly string[]).includes(cookieLocale)) {
    return cookieLocale as Locale;
  }

  // 2. Parse Accept-Language header
  const acceptLanguage = request.headers.get('Accept-Language');
  if (acceptLanguage) {
    const tokens = acceptLanguage
      .split(',')
      .map((segment) => segment.split(';')[0].trim().split('-')[0]);
    const matched = tokens.find((lang) =>
      (locales as readonly string[]).includes(lang),
    );
    if (matched) return matched as Locale;
  }

  // 3. Fall back to default
  return defaultLocale;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip Next.js internals, static files, and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    /\.(.+)$/.test(pathname) // any file extension
  ) {
    return NextResponse.next();
  }

  // If the path already has a valid locale prefix, pass through
  const existingLocale = getLocaleFromPathname(pathname);
  if (existingLocale) {
    // Forward the detected locale as a request header so that
    // the root layout can read it without re-parsing the URL.
    const response = NextResponse.next();
    response.headers.set('x-locale', existingLocale);
    return response;
  }

  // Redirect bare paths to the locale-prefixed equivalent
  const locale = detectLocale(request);
  const redirectUrl = new URL(`/${locale}${pathname}`, request.url);
  redirectUrl.search = request.nextUrl.search;

  return NextResponse.redirect(redirectUrl);
}

export const config = {
  // Run on every path except Next.js static chunks and image optimiser
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
