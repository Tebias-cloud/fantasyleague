import { updateSession } from '@/lib/supabase/proxy';
import { type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run on all paths except Next.js internals and static files.
     * See: https://nextjs.org/docs/app/api-reference/file-conventions/proxy
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
