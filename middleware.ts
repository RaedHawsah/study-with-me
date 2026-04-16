import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Standard locales
const locales = ['en', 'ar'];
const defaultLocale = 'en';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Skip if it's an asset, api, or internal _next path
  if (
    pathname.includes('.') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api')
  ) {
    return NextResponse.next();
  }

  // 2. Check if the pathname already has a valid locale
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) {
    const locale = locales.find(l => pathname.startsWith(`/${l}/`) || pathname === `/${l}`);
    const response = NextResponse.next();
    // Inject the current locale into headers for RootLayout
    if (locale) response.headers.set('x-locale', locale);
    return response;
  }

  // 3. Redirect to the default locale if no locale is present
  request.nextUrl.pathname = `/${defaultLocale}${pathname}`;
  const response = NextResponse.redirect(request.nextUrl);
  // Also inject header into the redirect response
  response.headers.set('x-locale', defaultLocale);
  return response;
}

export const config = {
  matcher: [
    // Optimized matcher for Next.js i18n
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
