import { updateSession } from '@/lib/supabase/proxy';
import { type NextRequest, NextResponse } from 'next/server';

export async function proxy(request: NextRequest) {
  // Public evaluation deployment: ONLY the clearly labeled, fully synthetic
  // demo and legal draft pages. No Supabase session or Riot APIs are invoked.
  if (process.env.FANTASYLEAGUE_DEMO_ONLY === 'true') {
    const path = request.nextUrl.pathname;
    if (path === '/demo' || path.startsWith('/legal/') || path === '/legal') {
      return NextResponse.next();
    }
    const url = request.nextUrl.clone();
    url.pathname = '/demo';
    url.search = '';
    return NextResponse.redirect(url);
  }
  return await updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
