import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Check if NEXT_LOCALE cookie is present
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;

  if (!cookieLocale) {
    // Detect from Accept-Language header
    const acceptLanguage = request.headers.get('accept-language') || '';
    const preferredLocale = acceptLanguage.toLowerCase().includes('en') ? 'en' : 'ro';

    const response = NextResponse.next();
    // Set the cookie on the response so future requests use it
    response.cookies.set('NEXT_LOCALE', preferredLocale, {
      path: '/',
      maxAge: 31536000, // 1 year
      sameSite: 'lax',
    });
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all page routes except static assets, internal paths, API routes, sw, etc.
    '/((?!api|_next/static|_next/image|favicon.ico|favicon.svg|apple-touch-icon.png|sw.js|workbox-|manifest.json|.*\\..*).*)',
  ],
};
